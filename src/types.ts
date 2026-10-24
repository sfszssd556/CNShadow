// 共享类型定义：与 media/engine.mjs、media/builtin-map.mjs 的运行时接口保持一致。

export type LangId = 'typescript' | 'javascript' | 'python' | 'other';
export type Direction = 'toChinese' | 'toEnglish';

export interface Token {
    kind: 'id' | 'num' | 'punct' | 'str';
    text: string;
    start: number;
    end: number;
    line: number;
}

export interface UnmappedToken {
    token: string;
    line: number;
    character: number;
}

export interface ConvertResult {
    text: string;
    unmapped: UnmappedToken[];
    degraded: boolean;
}

export interface Tables {
    kw: Map<string, string>;
    aliases: Map<string, string>;
    crossRef: Map<string, string>;
}

export interface TokenEdit {
    start: number;
    end: number;
    text: string;
}

export interface QualifiedKey {
    key: string;
    start: number;
    end: number;
}

/** media/engine.mjs 的导出集合 */
export interface EngineModule {
    langOfPath(p: string): LangId;
    langOfMonaco(languageId: string, path?: string): LangId;
    scan(src: string, lang: LangId): Token[];
    countLines(src: string): number;
    keywordMap(lang: LangId, dir: Direction): Map<string, string>;
    buildTables(
        lang: LangId,
        dir: Direction,
        forwardAliases: Map<string, string>,
        reverseAliases: Map<string, string>
    ): Tables;
    convertSource(
        source: string,
        lang: LangId,
        dir: Direction,
        tables: Tables,
        maxLines: number
    ): ConvertResult;
    translateTokenAtOffset(
        text: string,
        offset: number,
        lang: LangId,
        dir: Direction,
        tables: Tables
    ): TokenEdit | null;
    qualifiedKeyAtOffset(text: string, offset: number, lang: LangId): QualifiedKey | null;
}

export interface BuiltinGroup {
    id: string;
    label: string;
    short: string;
    langs: LangId[];
    items: Array<[string, string]>;
}

/** media/builtin-map.mjs 的导出集合 */
export interface BuiltinMapModule {
    BUILTIN_GROUPS: BuiltinGroup[];
    MAP_CONFLICTS: unknown[];
    builtinFor(lang: LangId): Array<[string, string]>;
    builtinTotal(): number;
}

/** .cnmap 文件结构 */
export interface AliasFile {
    version: number;
    language: string;
    aliases: Record<string, string>;
    meta?: { createdAt?: string; updatedAt?: string };
}

/** 合并后的双向映射表 */
export interface MergedMaps {
    fwd: Map<string, string>; // 英文限定路径 -> 中文别名
    rev: Map<string, string>; // 中文别名 -> 英文限定路径
}
