import * as vscode from 'vscode';
import { Logger } from './logger';
import type { AliasFile, BuiltinGroup, BuiltinMapModule, LangId, MergedMaps } from './types';

/** 中文别名合法性：中文 / 下划线 / 数字，支持点号限定的多段路径；禁止英文字母 */
export const CN_ALIAS_RE = /^[\u4e00-\u9fff_][\u4e00-\u9fff0-9_]*(\.[\u4e00-\u9fff_][\u4e00-\u9fff0-9_]*)*$/;

const MAP_FILENAME = '.cnmap';

/**
 * 映射表：用户别名（.cnmap）+ 内置库别名的合并视图。
 * 用户同键优先于内置；写入前做完整校验，加载失败时锁定写入避免覆盖磁盘数据。
 */
export class MapStore {
    private fwd = new Map<string, string>(); // 英文限定路径 -> 中文别名（用户自定义）
    private rev = new Map<string, string>();
    private builtin: BuiltinMapModule | null = null;
    private mergedCache = new Map<LangId, MergedMaps>();
    private mapUri: vscode.Uri | null = null;
    private loadOk = false;

    constructor(private readonly log: Logger) {}

    async init(context: vscode.ExtensionContext): Promise<void> {
        const folder = vscode.workspace.workspaceFolders?.[0];
        const baseDir = folder ? folder.uri : context.globalStorageUri;
        this.mapUri = vscode.Uri.joinPath(baseDir, MAP_FILENAME);
        try {
            await vscode.workspace.fs.createDirectory(baseDir);
        } catch { /* 目录已存在或无法创建，持久化时会再报错 */ }
    }

    setBuiltin(m: BuiltinMapModule): void {
        this.builtin = m;
        this.mergedCache.clear();
    }

    get uri(): vscode.Uri | null {
        return this.mapUri;
    }

    get canPersist(): boolean {
        return !!this.mapUri && this.loadOk;
    }

    size(): number {
        return this.fwd.size;
    }

    builtinTotal(): number {
        return this.builtin ? this.builtin.builtinTotal() : 0;
    }

    builtinGroups(): BuiltinGroup[] {
        return this.builtin ? this.builtin.BUILTIN_GROUPS : [];
    }

    userEntries(): Array<[string, string]> {
        return [...this.fwd.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    }

    /** 某语言的合并映射（内置 + 用户，用户覆盖内置） */
    maps(lang: LangId): MergedMaps {
        const hit = this.mergedCache.get(lang);
        if (hit) { return hit; }
        const fwd = new Map<string, string>();
        if (this.builtin) {
            for (const [en, cn] of this.builtin.builtinFor(lang)) { fwd.set(en, cn); }
        }
        for (const [en, cn] of this.fwd) { fwd.set(en, cn); }
        const rev = new Map<string, string>();
        for (const [en, cn] of fwd) { rev.set(cn, en); }
        const out = { fwd, rev };
        this.mergedCache.set(lang, out);
        return out;
    }

    /** 别名当前占用者（自定义或内置），用于冲突校验 */
    aliasOwner(alias: string): string | null {
        if (this.rev.has(alias)) { return this.rev.get(alias)!; }
        for (const g of this.builtinGroups()) {
            for (const [en, cn] of g.items) {
                if (cn === alias) { return en; }
            }
        }
        return null;
    }

    /** 中文别名或英文键 -> 英文限定路径 */
    resolveEnglishKey(keyOrAlias: string): string | undefined {
        if (this.fwd.has(keyOrAlias)) { return keyOrAlias; }
        return this.rev.get(keyOrAlias);
    }

    hasUserAlias(en: string): boolean {
        return this.fwd.has(en);
    }

    async load(): Promise<void> {
        this.fwd.clear();
        this.rev.clear();
        this.mergedCache.clear();
        this.loadOk = false;
        if (!this.mapUri) { this.loadOk = true; return; }

        let raw: Uint8Array;
        try {
            raw = await vscode.workspace.fs.readFile(this.mapUri);
        } catch {
            // 文件不存在：按空表处理，允许后续写入
            this.loadOk = true;
            this.log.info('未找到 .cnmap，按空映射表处理');
            return;
        }

        let parsed: AliasFile;
        try {
            parsed = JSON.parse(Buffer.from(raw).toString('utf8')) as AliasFile;
        } catch (e) {
            this.log.error('.cnmap 不是合法 JSON，已按空表加载且锁定写入：' + String(e));
            return;
        }

        const aliases = (parsed && parsed.aliases) || {};
        for (const [en, cn] of Object.entries(aliases)) {
            if (!CN_ALIAS_RE.test(cn)) {
                this.log.warn(`别名 "${cn}" 含英文字母或非法字符，已跳过（${en}）`);
                continue;
            }
            const holder = this.rev.get(cn);
            if (holder && holder !== en) {
                this.log.warn(`别名冲突："${cn}" 已映射到 "${holder}"，跳过 ${en}`);
                continue;
            }
            this.fwd.set(en, cn);
            this.rev.set(cn, en);
        }
        this.loadOk = true;
        this.log.info(`.cnmap 加载完成：自定义 ${this.fwd.size} 条，内置 ${this.builtinTotal()} 条`);
    }

    /** 新增或覆盖别名；返回 null 表示成功，否则为错误信息 */
    async setAlias(en: string, cn: string): Promise<string | null> {
        if (!en) { return '英文限定路径不能为空'; }
        if (!CN_ALIAS_RE.test(cn)) { return `别名 "${cn}" 非法：仅允许中文、下划线、数字与点号`; }
        if (!this.canPersist) { return '.cnmap 未能安全加载，已阻止写入（请先修复或执行「重载 .cnmap」）'; }

        const owner = this.aliasOwner(cn);
        if (owner && owner !== en) { return `别名冲突："${cn}" 已映射到 "${owner}"`; }

        const old = this.fwd.get(en);
        const bak = { fwd: new Map(this.fwd), rev: new Map(this.rev) };
        if (old && old !== cn) { this.rev.delete(old); }
        this.fwd.set(en, cn);
        this.rev.set(cn, en);
        this.mergedCache.clear();

        const err = await this.persist();
        if (err) {
            this.fwd = bak.fwd;
            this.rev = bak.rev;
            this.mergedCache.clear();
            return err;
        }
        return null;
    }

    async removeAlias(en: string): Promise<boolean> {
        const cn = this.fwd.get(en);
        if (cn === undefined) { return false; }
        const bak = { fwd: new Map(this.fwd), rev: new Map(this.rev) };
        this.fwd.delete(en);
        this.rev.delete(cn);
        this.mergedCache.clear();
        const err = await this.persist();
        if (err) {
            this.fwd = bak.fwd;
            this.rev = bak.rev;
            this.mergedCache.clear();
            this.log.error(err);
            return false;
        }
        return true;
    }

    /** 写回 .cnmap；返回 null 表示成功 */
    private async persist(): Promise<string | null> {
        if (!this.mapUri) { return '未找到可写入的 .cnmap 路径'; }
        if (!this.loadOk) { return '.cnmap 未能安全加载，已阻止写入'; }

        let createdAt = new Date().toISOString();
        try {
            const raw = await vscode.workspace.fs.readFile(this.mapUri);
            const old = JSON.parse(Buffer.from(raw).toString('utf8')) as AliasFile;
            if (old.meta?.createdAt) { createdAt = old.meta.createdAt; }
        } catch { /* 文件不存在则新建 */ }

        const file: AliasFile = {
            version: 1,
            language: 'mixed',
            aliases: Object.fromEntries([...this.fwd.entries()].sort()),
            meta: { createdAt, updatedAt: new Date().toISOString() },
        };
        try {
            await vscode.workspace.fs.writeFile(
                this.mapUri,
                Buffer.from(JSON.stringify(file, null, 2) + '\n', 'utf8')
            );
        } catch (e) {
            return '.cnmap 写入失败：' + String((e as Error)?.message || e);
        }
        return null;
    }
}
