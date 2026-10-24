import * as vscode from 'vscode';
import type { EngineModule, LangId, MergedMaps } from './types';
import { isShadowUri, realUriOf } from './shadowFs';
import { checkPythonSyntax } from './python';
import { Logger } from './logger';

/**
 * 中文模式问题检测器。
 *
 * 中文文档里的「函数 / 如果 / 常量 / 真」等关键字不是合法 TS/JS/Python 语法，
 * 若直接交给语言服务会得到大量假阳性。这里的做法是：
 *   1. 反向还原为英文（未映射的中文标识符按字符等长替换为 ASCII，避免再引入错误）；
 *   2. JS/TS：用 TypeScript 编译器 API 只做语法解析（createSourceFile.parseDiagnostics）；
 *      Python：调用解释器 ast.parse（不执行代码）；
 *   3. 把结果行列夹紧后写成诊断，来源标记为 cnshadow。
 *
 * 中文视图使用独立语言 id（cnshadow-typescript 等），因此内置语言服务不会介入，
 * 从根上避免「切到中文就满屏报错」。
 */
export class ChineseDiagnostics implements vscode.Disposable {
    private readonly collection = vscode.languages.createDiagnosticCollection('cnshadow');
    private readonly timers = new Map<string, NodeJS.Timeout>();
    private readonly seq = new Map<string, number>();
    private readonly subs: vscode.Disposable[] = [];
    private tsModule: typeof import('typescript') | null | undefined;

    constructor(
        private readonly engine: EngineModule,
        private readonly log: Logger,
        private readonly getMaxLines: () => number,
        private readonly getMaps: (lang: LangId) => MergedMaps,
        private readonly isEnabled: () => boolean
    ) {}

    register(): vscode.Disposable {
        this.subs.push(
            vscode.workspace.onDidOpenTextDocument((doc) => this.schedule(doc, 0)),
            vscode.workspace.onDidChangeTextDocument((e) => this.schedule(e.document, 400)),
            vscode.workspace.onDidCloseTextDocument((doc) => {
                this.cancel(doc.uri);
                this.collection.delete(doc.uri);
            })
        );
        // 已打开的文档补跑一次
        for (const doc of vscode.workspace.textDocuments) { this.schedule(doc, 0); }
        return this;
    }

    dispose(): void {
        for (const t of this.timers.values()) { clearTimeout(t); }
        this.timers.clear();
        this.collection.dispose();
        for (const s of this.subs) { s.dispose(); }
        this.subs.length = 0;
    }

    /** 立即重算某文档（切换语言 id 后调用） */
    refresh(doc: vscode.TextDocument): void {
        this.schedule(doc, 0);
    }

    private cancel(uri: vscode.Uri): void {
        const key = uri.toString();
        const t = this.timers.get(key);
        if (t) { clearTimeout(t); this.timers.delete(key); }
        this.seq.set(key, (this.seq.get(key) || 0) + 1);
    }

    private schedule(doc: vscode.TextDocument, delay: number): void {
        if (!isShadowUri(doc.uri) || !this.isEnabled()) { return; }
        const key = doc.uri.toString();
        const old = this.timers.get(key);
        if (old) { clearTimeout(old); }
        const timer = setTimeout(() => {
            this.timers.delete(key);
            void this.run(doc, key);
        }, delay);
        this.timers.set(key, timer);
    }

    private async run(doc: vscode.TextDocument, key: string): Promise<void> {
        const mySeq = (this.seq.get(key) || 0) + 1;
        this.seq.set(key, mySeq);

        const lang = this.engine.langOfPath(realUriOf(doc.uri).fsPath);
        if (lang !== 'typescript' && lang !== 'javascript' && lang !== 'python') {
            this.collection.delete(doc.uri);
            return;
        }

        const cnText = doc.getText();
        const tables = this.engine.buildTables(lang, 'toEnglish', ...this.maps(lang));
        const en = this.engine.convertSource(
            cnText, lang, 'toEnglish', tables, this.getMaxLines()
        ).text;
        // 剩余中文 = 未映射标识符；按字符等长替换为 ASCII，既不会新增解析错误也保持列号
        const masked = en.replace(/[\u4e00-\u9fff]/g, 'a');

        const cnLines = cnText.split('\n');
        const clampLine = (n: number): number => Math.max(1, Math.min(cnLines.length || 1, n || 1));
        const clampCol = (line: number, col: number): number =>
            Math.max(1, Math.min((cnLines[line - 1] || '').length + 1, col || 1));

        let diags: vscode.Diagnostic[] = [];
        if (lang === 'python') {
            const r = await checkPythonSyntax(masked);
            if (mySeq !== this.seq.get(key) || doc.isClosed) { return; }
            if (!r.ok) {
                this.log.warn('Python 语法检查不可用：' + (r.error || '未知原因'));
                this.collection.set(doc.uri, []);
                return;
            }
            diags = r.errors.map((e) => {
                const line = clampLine(e.line);
                const col = clampCol(line, e.column);
                const endCol = clampCol(line, col + 1);
                return new vscode.Diagnostic(
                    new vscode.Range(line - 1, col - 1, line - 1, endCol - 1),
                    e.message,
                    vscode.DiagnosticSeverity.Error
                );
            });
        } else {
            const ts = this.loadTs();
            if (!ts) {
                this.collection.set(doc.uri, []);
                return;
            }
            const kind = lang === 'typescript' ? ts.ScriptKind.TS : ts.ScriptKind.JS;
            const sf = ts.createSourceFile('check.' + (lang === 'typescript' ? 'ts' : 'js'), masked, ts.ScriptTarget.ES2020, true, kind);
            const raw = (sf as unknown as { parseDiagnostics?: import('typescript').Diagnostic[] }).parseDiagnostics || [];
            diags = raw.map((d) => {
                const start = d.start ?? 0;
                const p = sf.getLineAndCharacterOfPosition(start);
                const line = clampLine(p.line + 1);
                const col = clampCol(line, p.character + 1);
                const endCol = clampCol(line, col + 1);
                const msg = ts.flattenDiagnosticMessageText(d.messageText, ' ');
                const sev = d.category === ts.DiagnosticCategory.Error
                    ? vscode.DiagnosticSeverity.Error
                    : vscode.DiagnosticSeverity.Warning;
                return new vscode.Diagnostic(
                    new vscode.Range(line - 1, col - 1, line - 1, endCol - 1),
                    msg,
                    sev
                );
            });
        }

        if (mySeq !== this.seq.get(key) || isClosed(doc)) { return; }
        for (const d of diags) {
            d.source = '中英双语';
            d.code = 'syntax';
        }
        this.collection.set(doc.uri, diags);
    }

    private maps(lang: LangId): [Map<string, string>, Map<string, string>] {
        const m = this.getMaps(lang);
        return [m.fwd, m.rev];
    }

    private loadTs(): typeof import('typescript') | null {
        if (this.tsModule !== undefined) { return this.tsModule; }
        try {
            // 运行时依赖，随插件一起安装
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            this.tsModule = require('typescript') as typeof import('typescript');
        } catch (e) {
            this.tsModule = null;
            this.log.warn('未能加载 TypeScript（语法检查降级）：' + String((e as Error)?.message || e));
        }
        return this.tsModule;
    }
}

/** 兼容旧版 VS Code（TextDocument.isClosed 是新 API） */
function isClosed(doc: vscode.TextDocument): boolean {
    return (doc as unknown as { isClosed?: boolean }).isClosed === true;
}
