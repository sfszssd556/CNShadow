import * as vscode from 'vscode';
import type { EngineModule, LangId } from './types';
import { MapStore } from './mapStore';
import { introspectPythonModule } from './python';
import { Logger } from './logger';
import { realUriOf } from './shadowFs';

/** 中文视图语言 id，仅在这些语言上注册（英文文件交给 VS Code 原生 IntelliSense） */
const CN_LANG_IDS = ['cnshadow-typescript', 'cnshadow-javascript', 'cnshadow-python'];

/** 光标前的点号链（中英文标识符均可） */
function chainBeforeCursor(lineText: string): string | null {
    const m = lineText.match(/([A-Za-z_\u4e00-\u9fff][\w\u4e00-\u9fff]*(?:\.[A-Za-z_\u4e00-\u9fff][\w\u4e00-\u9fff]*)*)\.$/);
    return m ? m[1] : null;
}

/** 中文链 -> 英文链：完整链命中优先，其次只还原首段 */
function resolveChainEn(chain: string, rev: Map<string, string>): string {
    const full = rev.get(chain);
    if (full) { return full; }
    const segs = chain.split('.');
    segs[0] = rev.get(segs[0]) || segs[0];
    return segs.join('.');
}

/** 从英文源码提取 import 绑定：局部名 -> 模块路径 */
function pyImportBindings(enText: string): Map<string, string> {
    const out = new Map<string, string>();
    const re = /^[ \t]*(?:import[ \t]+([^#\n]+)|from[ \t]+([A-Za-z_][\w.]*)[ \t]+import[ \t]+([^#\n]+))/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(enText))) {
        if (m[1]) {
            for (const part of m[1].split(',')) {
                const pm = part.trim().match(/^([A-Za-z_][\w.]*)(?:[ \t]+as[ \t]+([A-Za-z_]\w*))?$/);
                if (pm) { out.set(pm[2] || pm[1].split('.')[0], pm[1]); }
            }
        } else {
            for (const part of m[3].split(',')) {
                const pm = part.trim().match(/^([A-Za-z_]\w*)(?:[ \t]+as[ \t]+([A-Za-z_]\w*))?$/);
                if (pm) { out.set(pm[2] || pm[1], m[2] + '.' + pm[1]); }
            }
        }
    }
    return out;
}

/**
 * 中文视图的库成员补全：
 *   - JS/TS：用内置映射表的静态链（控制台.* / 数学.* …）补全直接子成员；
 *   - Python：解析文档 import，实时内省模块成员，带签名与文档首行；
 *   - 标签显示「中文别名 + 英文原名」，插入中文别名（当前视图就是中文）。
 */
export function registerCompletion(
    engine: EngineModule,
    store: MapStore,
    log: Logger,
    isEnabled: () => boolean
): vscode.Disposable {
    const provider: vscode.CompletionItemProvider = {
        async provideCompletionItems(doc, position) {
            if (!isEnabled()) { return undefined; }
            const lang = engine.langOfPath(realUriOf(doc.uri).fsPath);
            if (lang !== 'typescript' && lang !== 'javascript' && lang !== 'python') {
                return undefined;
            }

            const lineText = doc.lineAt(position.line).text;
            const prefixText = lineText.slice(0, position.character);
            const chain = chainBeforeCursor(prefixText);
            if (!chain) { return undefined; }

            const maps = store.maps(lang);
            const chainEn = resolveChainEn(chain, maps.rev);
            const segs = chainEn.split('.');
            const range = new vscode.Range(position, position);

            if (lang === 'python') {
                const enText = engine.convertSource(
                    doc.getText(), 'python', 'toEnglish',
                    engine.buildTables('python', 'toEnglish', maps.fwd, maps.rev),
                    100000
                ).text;
                const baseMod = pyImportBindings(enText).get(segs[0]);
                if (!baseMod) { return undefined; }
                const modulePath = [baseMod].concat(segs.slice(1)).join('.');
                const members = await introspectPythonModule(modulePath);
                if (!members.length) { return undefined; }
                const items = members.map((mb) => {
                    const alias = maps.fwd.get(modulePath + '.' + mb.name);
                    const cnSeg = alias ? alias.split('.').pop() || '' : '';
                    const item = new vscode.CompletionItem(
                        cnSeg ? `${cnSeg}  ${mb.name}` : mb.name,
                        mb.kind === 'class' ? vscode.CompletionItemKind.Class : vscode.CompletionItemKind.Function
                    );
                    item.insertText = cnSeg || mb.name;
                    item.filterText = mb.name + (cnSeg ? ' ' + cnSeg : '');
                    item.detail = mb.name + (mb.sig || '');
                    if (mb.doc) { item.documentation = new vscode.MarkdownString(mb.doc); }
                    item.range = range;
                    return item;
                });
                return new vscode.CompletionList(items, false);
            }

            // JS / TS：从合并映射表中取直接子成员
            const prefix = chainEn + '.';
            const items: vscode.CompletionItem[] = [];
            for (const [en, aliasFull] of maps.fwd) {
                if (!en.startsWith(prefix)) { continue; }
                const rest = en.slice(prefix.length);
                if (rest.includes('.')) { continue; }
                const cnSeg = aliasFull.split('.').pop() || '';
                const item = new vscode.CompletionItem(
                    cnSeg ? `${cnSeg}  ${rest}` : rest,
                    vscode.CompletionItemKind.Function
                );
                item.insertText = cnSeg || rest;
                item.filterText = rest + ' ' + cnSeg;
                item.detail = en;
                item.range = range;
                items.push(item);
            }
            if (!items.length) {
                log.info(`未找到 ${chainEn} 的内置成员映射`);
                return undefined;
            }
            return new vscode.CompletionList(items, true);
        },
    };

    return vscode.Disposable.from(
        ...CN_LANG_IDS.map((id) => vscode.languages.registerCompletionItemProvider(id, provider, '.'))
    );
}
