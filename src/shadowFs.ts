import * as vscode from 'vscode';
import type { EngineModule, LangId } from './types';
import { Logger } from './logger';

export const CN_SCHEME = 'cnshadow';

/** 中文视图后缀 -> 让 VS Code 在打开瞬间就识别为 cnshadow-* 语言，避免先被内置语言服务检查 */
const SUFFIX_BY_LANG: Record<string, string> = {
    typescript: '.cnts',
    javascript: '.cnjs',
    python: '.cnpy',
};
const LANGS_BY_SUFFIX: Record<string, LangId> = {
    '.cnts': 'typescript',
    '.cnjs': 'javascript',
    '.cnpy': 'python',
};

function suffixOf(real: vscode.Uri): string | null {
    const p = real.path.toLowerCase();
    if (/\.(ts|tsx|mts|cts)$/.test(p)) { return SUFFIX_BY_LANG.typescript; }
    if (/\.(js|jsx|mjs|cjs)$/.test(p)) { return SUFFIX_BY_LANG.javascript; }
    if (/\.(py|pyw)$/.test(p)) { return SUFFIX_BY_LANG.python; }
    return null;
}

/** 真实英文文件 URI -> 中文视图 URI（保留原扩展名并追加 .cnts/.cnjs/.cnpy） */
export function shadowUriOf(real: vscode.Uri): vscode.Uri {
    const suffix = suffixOf(real) || '';
    return real.with({ scheme: CN_SCHEME, path: real.path + suffix });
}

/** 中文视图 URI -> 真实英文文件 URI（去掉中文视图后缀） */
export function realUriOf(shadow: vscode.Uri): vscode.Uri {
    const p = shadow.path;
    for (const suffix of Object.keys(LANGS_BY_SUFFIX)) {
        if (p.toLowerCase().endsWith(suffix)) {
            return shadow.with({ scheme: 'file', path: p.slice(0, p.length - suffix.length) });
        }
    }
    return shadow.with({ scheme: 'file' });
}

export function isShadowUri(uri: vscode.Uri): boolean {
    return uri.scheme === CN_SCHEME;
}

/**
 * `cnshadow:` 虚拟文件系统。
 *
 * 磁盘永远英文：readFile 读取真实文件后正向转译为中文；
 * writeFile（Ctrl+S 保存虚拟文档）先反向还原英文、校验未映射标识符，再写真实文件。
 */
export class ShadowFileSystemProvider implements vscode.FileSystemProvider {
    private readonly emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this.emitter.event;

    /** 内部写盘标记，避免 watcher 触发自我刷新 */
    private readonly writing = new Set<string>();

    constructor(
        private readonly engine: EngineModule,
        private readonly log: Logger,
        private readonly getMaxLines: () => number,
        private readonly getBlockOnUnmapped: () => boolean,
        private readonly getMaps: (lang: LangId) => { fwd: Map<string, string>; rev: Map<string, string> }
    ) {}

    async readFile(uri: vscode.Uri): Promise<Uint8Array> {
        const real = realUriOf(uri);
        let raw: Uint8Array;
        try {
            raw = await vscode.workspace.fs.readFile(real);
        } catch {
            throw vscode.FileSystemError.FileNotFound(real);
        }
        const english = Buffer.from(raw).toString('utf8');
        const lang = langOfRealPath(this.engine, real);
        const res = this.engine.convertSource(
            english, lang, 'toChinese', this.tables(lang, 'toChinese'), this.getMaxLines()
        );
        if (res.degraded) {
            this.log.warn(`降级模式（大文件或不支持的语言）：${real.fsPath}`);
        }
        return Buffer.from(res.text, 'utf8');
    }

    async writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
        const real = realUriOf(uri);
        const chinese = Buffer.from(content).toString('utf8');
        const lang = langOfRealPath(this.engine, real);
        const res = this.engine.convertSource(
            chinese, lang, 'toEnglish', this.tables(lang, 'toEnglish'), this.getMaxLines()
        );

        if (res.unmapped.length > 0 && this.getBlockOnUnmapped()) {
            const first = res.unmapped[0];
            const msg = `保存被阻止：发现 ${res.unmapped.length} 个未映射的中文标识符，` +
                `第一个 "${first.token}" 位于第 ${first.line + 1} 行第 ${first.character + 1} 列。` +
                `请先执行「为标识符标注中文别名」补全映射。`;
            this.log.warn(msg);
            throw vscode.FileSystemError.Unavailable(msg);
        }

        this.writing.add(uri.toString());
        try {
            await vscode.workspace.fs.writeFile(real, Buffer.from(res.text, 'utf8'));
            this.log.info(`已保存（磁盘为英文）：${real.fsPath}`);
        } finally {
            setTimeout(() => this.writing.delete(uri.toString()), 500);
        }
    }

    async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        return vscode.workspace.fs.stat(realUriOf(uri));
    }

    watch(uri: vscode.Uri): vscode.Disposable {
        const real = realUriOf(uri);
        let watcher: vscode.FileSystemWatcher;
        try {
            watcher = vscode.workspace.createFileSystemWatcher(real.fsPath);
        } catch {
            return new vscode.Disposable(() => undefined);
        }
        const sub = watcher.onDidChange(() => {
            if (this.writing.has(uri.toString())) { return; }
            this.emitter.fire([{ type: vscode.FileChangeType.Changed, uri }]);
        });
        return new vscode.Disposable(() => {
            sub.dispose();
            watcher.dispose();
        });
    }

    /** 别名变更后刷新中文视图；跳过有未保存修改的文档，避免覆盖用户正在编辑的内容 */
    refreshAllOpen(): void {
        const targets = vscode.workspace.textDocuments.filter((d) => isShadowUri(d.uri));
        const dirty = targets.filter((d) => d.isDirty);
        const events = targets
            .filter((d) => !d.isDirty)
            .map((d) => ({ type: vscode.FileChangeType.Changed, uri: d.uri }));
        if (dirty.length > 0) {
            this.log.info(`有 ${dirty.length} 个中文文档未保存，已跳过映射刷新（保存后自动生效）`);
        }
        if (events.length > 0) { this.emitter.fire(events); }
    }

    readDirectory(): [string, vscode.FileType][] {
        throw vscode.FileSystemError.NoPermissions('中文视图不支持目录列举');
    }
    createDirectory(): void {
        throw vscode.FileSystemError.NoPermissions('中文视图不支持创建目录');
    }
    delete(): void {
        throw vscode.FileSystemError.NoPermissions('请删除真实文件');
    }
    rename(): void {
        throw vscode.FileSystemError.NoPermissions('请重命名真实文件');
    }

    private tables(lang: LangId, dir: 'toChinese' | 'toEnglish') {
        const maps = this.getMaps(lang);
        return this.engine.buildTables(lang, dir, maps.fwd, maps.rev);
    }
}

/** 以真实文件扩展名判断语言（虚拟路径与真实路径的扩展名一致） */
export function langOfRealPath(engine: EngineModule, real: vscode.Uri): LangId {
    return engine.langOfPath(real.fsPath);
}
