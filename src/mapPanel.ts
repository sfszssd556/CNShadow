import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { MapStore } from './mapStore';
import { Logger } from './logger';

interface MapMessage {
    type: string;
    en?: string;
    cn?: string;
}

/**
 * 映射表设置页面（Webview）：
 * 搜索 / 自定义与内置视图切换 / 新增 / 行内编辑 / 删除 / 用自定义覆盖内置。
 */
export class MapPanel {
    private static current: MapPanel | null = null;

    private readonly panel: vscode.WebviewPanel;
    private readonly disposables: vscode.Disposable[] = [];

    private constructor(
        panel: vscode.WebviewPanel,
        html: string,
        private readonly store: MapStore,
        private readonly log: Logger,
        private readonly onChanged: () => void
    ) {
        this.panel = panel;
        this.panel.webview.html = html;
        this.panel.webview.onDidReceiveMessage(
            (msg: MapMessage) => { void this.onMessage(msg); },
            null,
            this.disposables
        );
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    static show(
        extensionUri: vscode.Uri,
        store: MapStore,
        log: Logger,
        onChanged: () => void
    ): void {
        if (MapPanel.current) {
            MapPanel.current.panel.reveal(vscode.ViewColumn.Active);
            MapPanel.current.render();
            return;
        }
        let html: string;
        try {
            html = MapPanel.loadHtml(extensionUri);
        } catch (e) {
            const msg = '映射表页面加载失败：' + String((e as Error)?.message || e);
            log.error(msg);
            vscode.window.showErrorMessage(msg);
            return;
        }
        const panel = vscode.window.createWebviewPanel(
            'cnshadow.map',
            'CNShadow 映射表',
            vscode.ViewColumn.Active,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
            }
        );
        MapPanel.current = new MapPanel(panel, html, store, log, onChanged);
        // 立即推一次数据；页面脚本就绪后还会再请求一次，双保险
        MapPanel.current.render();
    }

    private static loadHtml(extensionUri: vscode.Uri): string {
        const file = path.join(extensionUri.fsPath, 'media', 'map.html');
        let html = fs.readFileSync(file, 'utf8');
        const nonce = Array.from({ length: 24 }, () =>
            'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
        html = html.split('{{nonce}}').join(nonce);
        return html;
    }

    private async onMessage(msg: MapMessage): Promise<void> {
        switch (msg.type) {
            case 'ready':
                this.render();
                return;
            case 'reload':
                await this.store.load();
                this.afterChange('映射表已重载');
                return;
            case 'openMapFile': {
                const uri = this.store.uri;
                if (uri) {
                    const doc = await vscode.workspace.openTextDocument(uri);
                    await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
                }
                return;
            }
            case 'add':
            case 'set': {
                const en = String(msg.en || '').trim();
                const cn = String(msg.cn || '').trim();
                const err = await this.store.setAlias(en, cn);
                if (err) {
                    this.toast('error', err);
                    return;
                }
                this.afterChange(`已保存 ${en} → ${cn}`);
                return;
            }
            case 'delete': {
                const en = String(msg.en || '');
                const ok = await this.store.removeAlias(en);
                if (!ok) {
                    this.toast('error', '删除失败或别名不存在');
                    return;
                }
                this.afterChange('已删除 ' + en);
                return;
            }
            default:
                this.log.warn('映射表页面收到未知消息：' + msg.type);
        }
    }

    private afterChange(message: string): void {
        this.render();
        this.toast('info', message);
        this.onChanged();
    }

    private toast(level: 'info' | 'error', message: string): void {
        void this.panel.webview.postMessage({ type: 'toast', level, message });
    }

    private render(): void {
        void this.panel.webview.postMessage({
            type: 'render',
            payload: {
                mapPath: this.store.uri ? this.store.uri.fsPath : '(未定位到 .cnmap)',
                user: this.store.userEntries(),
                builtin: this.store.builtinGroups().map((g) => ({
                    label: g.label,
                    short: g.short,
                    items: g.items,
                })),
                builtinTotal: this.store.builtinTotal(),
            },
        });
    }

    private dispose(): void {
        MapPanel.current = null;
        for (const d of this.disposables) { d.dispose(); }
        this.disposables.length = 0;
    }
}
