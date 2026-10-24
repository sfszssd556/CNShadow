import * as vscode from 'vscode';
import type { EngineModule } from './types';
import { isShadowUri, realUriOf } from './shadowFs';

/** 状态栏「CN / EN」指示器，点击切换视图 */
export class ViewStatusBar implements vscode.Disposable {
    private readonly item: vscode.StatusBarItem;

    constructor(
        private readonly engine: EngineModule,
        private readonly getMaxLines: () => number
    ) {
        this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
        this.item.command = 'cnshadow.toggle';
        this.item.tooltip = '中/英文视图切换（Ctrl+Alt+L）';
        this.item.show();
    }

    update(editor: vscode.TextEditor | undefined): void {
        if (!editor) {
            this.item.text = 'EN';
            return;
        }
        const doc = editor.document;
        const cn = isShadowUri(doc.uri);
        if (!cn) {
            this.item.text = 'EN';
            return;
        }
        const lang = this.engine.langOfPath(realUriOf(doc.uri).fsPath);
        const degraded = lang === 'other' || this.engine.countLines(doc.getText()) > this.getMaxLines();
        this.item.text = degraded ? 'CN(降级)' : 'CN';
    }

    dispose(): void {
        this.item.dispose();
    }
}
