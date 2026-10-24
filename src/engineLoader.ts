import * as path from 'path';
import * as vscode from 'vscode';
import { pathToFileURL } from 'url';
import type { BuiltinMapModule, EngineModule } from './types';

// TS 编译为 CommonJS 时会把 `import()` 改写成 require()，而 require 不能加载 .mjs。
// 用 Function 构造器拿到原生动态 import，保证引擎与内置映射库可以原样复用（零改动拷贝）。
const nativeImport = new Function('p', 'return import(p);') as (p: string) => Promise<unknown>;

let enginePromise: Promise<EngineModule> | null = null;
let builtinPromise: Promise<BuiltinMapModule> | null = null;

function mediaUrl(extensionUri: vscode.Uri, file: string): string {
    return pathToFileURL(path.join(extensionUri.fsPath, 'media', file)).href;
}

/** 加载转换引擎（media/engine.mjs，与原中文模块完全同一份实现） */
export function loadEngine(extensionUri: vscode.Uri): Promise<EngineModule> {
    if (!enginePromise) {
        enginePromise = nativeImport(mediaUrl(extensionUri, 'engine.mjs')).then(
            (m) => m as EngineModule,
            (e) => {
                enginePromise = null;
                throw new Error('加载转换引擎失败：' + String((e as Error)?.message || e));
            }
        );
    }
    return enginePromise;
}

/** 加载内置映射库（media/builtin-map.mjs，约 2800 条别名） */
export function loadBuiltinMap(extensionUri: vscode.Uri): Promise<BuiltinMapModule> {
    if (!builtinPromise) {
        builtinPromise = nativeImport(mediaUrl(extensionUri, 'builtin-map.mjs')).then(
            (m) => m as BuiltinMapModule,
            (e) => {
                builtinPromise = null;
                throw new Error('加载内置映射库失败：' + String((e as Error)?.message || e));
            }
        );
    }
    return builtinPromise;
}
