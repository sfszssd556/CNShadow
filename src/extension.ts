import * as vscode from 'vscode';
import { loadBuiltinMap, loadEngine } from './engineLoader';
import { MapStore } from './mapStore';
import {
    CN_SCHEME,
    ShadowFileSystemProvider,
    isShadowUri,
    realUriOf,
    shadowUriOf,
} from './shadowFs';
import { ChineseDiagnostics } from './diagnostics';
import { registerCompletion } from './completion';
import { ViewStatusBar } from './statusBar';
import { MapPanel } from './mapPanel';
import { runCurrentFile } from './runner';
import { Logger } from './logger';
import type { EngineModule, LangId } from './types';

/** workspaceState 键：记忆每个真实文件上次的视图 */
const VIEW_STATE_PREFIX = 'cnshadow.viewState.';

/** 业务语言 -> 中文视图语言 id（独立语言 id 可让内置语言服务完全不介入） */
const CN_LANG_BY_LANG: Record<string, string> = {
    typescript: 'cnshadow-typescript',
    javascript: 'cnshadow-javascript',
    python: 'cnshadow-python',
};

let logger: Logger;
let engine: EngineModule;
let store: MapStore;
let provider: ShadowFileSystemProvider;
let statusBar: ViewStatusBar;
let diagnostics: ChineseDiagnostics;

/** 正在切换视图的文档，防止自动恢复逻辑递归 */
const switching = new Set<string>();

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    logger = new Logger();
    const cfg = () => vscode.workspace.getConfiguration('cnshadow');
    const maxLines = (): number => cfg().get<number>('maxFullParseLines', 10000);

    try {
        engine = await loadEngine(context.extensionUri);
        const builtin = await loadBuiltinMap(context.extensionUri);
        logger.info(`转换引擎就绪，内置别名 ${builtin.builtinTotal()} 条`);
        store = new MapStore(logger);
        store.setBuiltin(builtin);
        await store.init(context);
        await store.load();
    } catch (e) {
        logger.error(String((e as Error)?.message || e));
        vscode.window.showErrorMessage('CNShadow：初始化失败，详见输出面板');
        return;
    }

    provider = new ShadowFileSystemProvider(
        engine,
        logger,
        maxLines,
        () => cfg().get<boolean>('blockOnUnmappedAlias', true),
        (lang: LangId) => store.maps(lang)
    );
    statusBar = new ViewStatusBar(engine, maxLines);
    diagnostics = new ChineseDiagnostics(
        engine,
        logger,
        maxLines,
        (lang: LangId) => store.maps(lang),
        () => cfg().get<boolean>('diagnostics.enabled', true)
    );

    context.subscriptions.push(
        logger,
        statusBar,
        diagnostics.register(),
        vscode.workspace.registerFileSystemProvider(CN_SCHEME, provider, { isCaseSensitive: true }),
        registerCompletion(engine, store, logger, () => cfg().get<boolean>('completion.enabled', true)),

        vscode.commands.registerCommand('cnshadow.toggle', () => toggleView(context)),
        vscode.commands.registerCommand('cnshadow.run', () => runCurrentFile(engine, logger)),
        vscode.commands.registerCommand('cnshadow.annotateAlias', () => annotateAlias()),
        vscode.commands.registerCommand('cnshadow.removeAlias', () => removeAlias()),
        vscode.commands.registerCommand('cnshadow.reloadMap', async () => {
            await store.load();
            provider.refreshAllOpen();
            vscode.window.showInformationMessage(
                `映射表已重载：自定义 ${store.size()} 条，内置 ${store.builtinTotal()} 条`
            );
        }),
        vscode.commands.registerCommand('cnshadow.openMap', () => {
            MapPanel.show(context.extensionUri, store, logger, () => provider.refreshAllOpen());
        }),

        vscode.window.onDidChangeActiveTextEditor((ed) => statusBar.update(ed)),
        vscode.workspace.onDidOpenTextDocument((doc) => { void onDocumentOpened(context, doc); }),
        vscode.workspace.onDidCloseTextDocument((doc) => {
            // 关闭中文视图不改变记住的视图状态，下次打开仍是中文
            statusBar.update(vscode.window.activeTextEditor);
        }),
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('cnshadow')) {
                for (const doc of vscode.workspace.textDocuments) {
                    if (isShadowUri(doc.uri)) { diagnostics.refresh(doc); }
                }
            }
        })
    );

    // .cnmap 被外部修改时自动重载并刷新所有中文视图
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (folder) {
        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(folder, '.cnmap')
        );
        const reload = async (): Promise<void> => {
            await store.load();
            provider.refreshAllOpen();
        };
        context.subscriptions.push(
            watcher,
            watcher.onDidChange(() => { void reload(); }),
            watcher.onDidCreate(() => { void reload(); })
        );
    }

    // 已打开的中文视图：统一语言 id 并补跑诊断
    for (const doc of vscode.workspace.textDocuments) {
        if (isShadowUri(doc.uri)) { void normalizeShadowLanguage(doc); }
    }

    // 映射表常驻入口（状态栏，随时可点）
    const mapEntry = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    mapEntry.text = '$(list-tree) 中文映射表';
    mapEntry.tooltip = '打开 CNShadow 中文映射表（Ctrl+Alt+M）';
    mapEntry.command = 'cnshadow.openMap';
    mapEntry.show();
    context.subscriptions.push(mapEntry);

    statusBar.update(vscode.window.activeTextEditor);
    logger.info('CNShadow 已激活');
}

export function deactivate(): void {
    // subscriptions 由 VS Code 统一释放
}

// ---------------------------------------------------------------- 打开与语言 id

async function onDocumentOpened(context: vscode.ExtensionContext, doc: vscode.TextDocument): Promise<void> {
    if (isShadowUri(doc.uri)) {
        await normalizeShadowLanguage(doc);
        return;
    }
    if (doc.uri.scheme !== 'file') { return; }
    if (!vscode.workspace.getConfiguration('cnshadow').get<boolean>('enabled', true)) { return; }

    const key = doc.uri.toString();
    if (switching.has(key)) { return; }
    if (engine.langOfPath(doc.uri.fsPath) === 'other') { return; }
    const remembered = context.workspaceState.get<string>(VIEW_STATE_PREFIX + key);
    if (remembered !== 'cn') { return; }

    // 上次是中文视图：直接打开对应中文文档
    switching.add(key);
    try {
        const shadow = await vscode.workspace.openTextDocument(shadowUriOf(doc.uri));
        await normalizeShadowLanguage(shadow);
        await vscode.window.showTextDocument(shadow, { preview: false });
    } catch (e) {
        logger.warn('自动恢复中文视图失败：' + String((e as Error)?.message || e));
    } finally {
        switching.delete(key);
    }
}

/** 把中文视图文档的语言 id 切到 cnshadow-*，避免内置 TS/Python 语言服务误报 */
async function normalizeShadowLanguage(doc: vscode.TextDocument): Promise<void> {
    if (!isShadowUri(doc.uri)) { return; }
    if (switching.has(doc.uri.toString())) { return; }
    const lang = engine.langOfPath(realUriOf(doc.uri).fsPath);
    const target = CN_LANG_BY_LANG[lang];
    switching.add(doc.uri.toString());
    try {
        if (target && doc.languageId !== target) {
            await vscode.languages.setTextDocumentLanguage(doc, target);
        }
    } catch (e) {
        logger.warn('设置中文视图语言失败：' + String((e as Error)?.message || e));
    } finally {
        switching.delete(doc.uri.toString());
        diagnostics.refresh(doc);
    }
}

// ---------------------------------------------------------------- 视图切换

async function toggleView(context: vscode.ExtensionContext): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('请先打开一个代码文件');
        return;
    }
    const uri = editor.document.uri;

    if (isShadowUri(uri)) {
        // 中文 -> 英文：先把中文改动反向还原并写入真实文件
        if (editor.document.isDirty) {
            const saved = await editor.document.save();
            if (!saved) {
                vscode.window.showErrorMessage(
                    '切回英文已取消：存在未映射的中文标识符或写入失败，请先补全别名或修复问题。'
                );
                return;
            }
        }
        const real = realUriOf(uri);
        await context.workspaceState.update(VIEW_STATE_PREFIX + real.toString(), 'en');
        const doc = await vscode.workspace.openTextDocument(real);
        await vscode.window.showTextDocument(doc, {
            viewColumn: editor.viewColumn,
            preview: false,
        });
        return;
    }

    if (uri.scheme !== 'file') {
        vscode.window.showWarningMessage('仅支持本地文件的中英视图切换');
        return;
    }
    const lang = engine.langOfPath(uri.fsPath);
    if (lang === 'other') {
        vscode.window.showWarningMessage('当前文件类型不支持中英双语映射（支持 .ts/.js/.py）');
        return;
    }

    await context.workspaceState.update(VIEW_STATE_PREFIX + uri.toString(), 'cn');
    switching.add(uri.toString());
    try {
        const shadow = await vscode.workspace.openTextDocument(shadowUriOf(uri));
        switching.delete(uri.toString());
        await normalizeShadowLanguage(shadow);
        await vscode.window.showTextDocument(shadow, {
            viewColumn: editor.viewColumn,
            preview: false,
        });
    } catch (e) {
        switching.delete(uri.toString());
        vscode.window.showErrorMessage('切换到中文视图失败：' + String((e as Error)?.message || e));
    }
}

// ---------------------------------------------------------------- 别名标注

function langOfDoc(doc: vscode.TextDocument): LangId {
    const path = isShadowUri(doc.uri) ? realUriOf(doc.uri).fsPath : doc.uri.fsPath;
    return engine.langOfMonaco(doc.languageId, path);
}

function qualifiedKeyAt(editor: vscode.TextEditor): { key: string; range: vscode.Range } | null {
    const doc = editor.document;
    const offset = doc.offsetAt(editor.selection.active);
    const found = engine.qualifiedKeyAtOffset(doc.getText(), offset, langOfDoc(doc));
    if (!found) { return null; }
    return {
        key: found.key,
        range: new vscode.Range(doc.positionAt(found.start), doc.positionAt(found.end)),
    };
}

/** 中文视图下把中文别名反查为英文限定路径（用户别名优先，其次内置） */
function resolveToEnglish(key: string, lang: LangId): string | undefined {
    const maps = store.maps(lang);
    return maps.rev.get(key) || (maps.fwd.has(key) ? key : undefined);
}

async function annotateAlias(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }
    const found = qualifiedKeyAt(editor);
    if (!found) {
        vscode.window.showWarningMessage('请把光标放在一个标识符上');
        return;
    }
    const lang = langOfDoc(editor.document);
    if (lang === 'other') {
        vscode.window.showWarningMessage('当前语言不支持别名映射');
        return;
    }

    let enKey = found.key;
    if (isShadowUri(editor.document.uri)) {
        const resolved = resolveToEnglish(found.key, lang);
        if (!resolved) {
            vscode.window.showWarningMessage(`"${found.key}" 不在映射表中，请切换到英文视图后再标注`);
            return;
        }
        enKey = resolved;
    }

    const input = await vscode.window.showInputBox({
        prompt: `为 "${enKey}" 输入中文别名（仅中文、下划线、数字、点号）`,
        placeHolder: '例如：用户服务.校验',
        value: store.hasUserAlias(enKey) ? store.maps(lang).fwd.get(enKey) : '',
        validateInput: (v) => {
            const t = v.trim();
            if (!t) { return '别名不能为空'; }
            if (/[A-Za-z]/.test(t)) { return '别名不允许包含英文字母'; }
            if (!/^[\u4e00-\u9fff_][\u4e00-\u9fff0-9_]*(\.[\u4e00-\u9fff_][\u4e00-\u9fff0-9_]*)*$/.test(t)) {
                return '只允许中文、数字、下划线，可用点号分隔';
            }
            return null;
        },
    });
    if (input === undefined) { return; }

    const err = await store.setAlias(enKey, input.trim());
    if (err) {
        vscode.window.showErrorMessage(err);
        return;
    }
    provider.refreshAllOpen();
    vscode.window.showInformationMessage(`已标注 ${enKey} → ${input.trim()}`);
}

async function removeAlias(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }
    const found = qualifiedKeyAt(editor);
    if (!found) {
        vscode.window.showWarningMessage('请把光标放在一个标识符上');
        return;
    }
    const lang = langOfDoc(editor.document);
    const key = resolveToEnglish(found.key, lang) || found.key;

    if (!store.hasUserAlias(key)) {
        const builtinAlias = store.maps(lang).fwd.get(key);
        vscode.window.showWarningMessage(
            builtinAlias
                ? `"${key}" 是内置库映射（${builtinAlias}），可在映射表页用「自定义」覆盖`
                : `"${key}" 没有自定义别名`
        );
        return;
    }
    if (await store.removeAlias(key)) {
        provider.refreshAllOpen();
        vscode.window.showInformationMessage(`已移除 ${key} 的别名`);
    } else {
        vscode.window.showErrorMessage('移除失败，请查看输出面板');
    }
}
