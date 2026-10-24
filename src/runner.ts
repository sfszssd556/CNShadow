import { execFile } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import type { EngineModule } from './types';
import { isShadowUri, realUriOf } from './shadowFs';
import { detectPython } from './python';
import { Logger } from './logger';

/** 复用一个运行终端，避免每次运行都新建面板 */
let runTerminal: vscode.Terminal | null = null;

interface NodeInfo {
    cmd: string;
    major: number;
}

let nodeInfo: NodeInfo | null | undefined;

function detectNode(): Promise<NodeInfo | null> {
    if (nodeInfo !== undefined) { return Promise.resolve(nodeInfo); }
    return new Promise((resolve) => {
        execFile('node', ['--version'], { timeout: 4000, windowsHide: true }, (err, stdout) => {
            if (err) { nodeInfo = null; resolve(null); return; }
            const m = String(stdout || '').trim().match(/^v(\d+)\./);
            const major = m ? Number(m[1]) : 0;
            nodeInfo = { cmd: 'node', major };
            resolve(nodeInfo);
        });
    });
}

function quote(p: string): string {
    return '"' + p.replace(/"/g, '\\"') + '"';
}

function getTerminal(cwd: string): vscode.Terminal {
    if (runTerminal && runTerminal.exitStatus === undefined) {
        return runTerminal;
    }
    runTerminal = vscode.window.createTerminal({ name: 'CNShadow 运行', cwd });
    return runTerminal;
}

/** 把 TypeScript 转译为 CommonJS 临时文件（旧版 Node 的兜底方案） */
function transpileToTemp(file: string): string | null {
    try {
        const ts = require('typescript') as typeof import('typescript');
        const code = fs.readFileSync(file, 'utf8');
        const out = ts.transpileModule(code, {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2020,
                esModuleInterop: true,
            },
            fileName: file,
        }).outputText;
        const dir = path.join(os.tmpdir(), 'cnshadow-run');
        fs.mkdirSync(dir, { recursive: true });
        const base = path.basename(file).replace(/\.[^.]+$/, '');
        const tmp = path.join(dir, `${base}-${Date.now()}.js`);
        fs.writeFileSync(tmp, out, 'utf8');
        setTimeout(() => { try { fs.unlinkSync(tmp); } catch { /* 忽略 */ } }, 120 * 1000);
        return tmp;
    } catch {
        return null;
    }
}

/**
 * 运行当前文件。
 *
 * 中文视图里直接点运行即可：先把中文还原成英文写回真实文件（等同于保存），
 * 再执行真实文件，不需要来回切换视图。
 */
export async function runCurrentFile(engine: EngineModule, log: Logger): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('请先打开一个代码文件');
        return;
    }
    const doc = editor.document;
    const shadow = isShadowUri(doc.uri);
    const real = shadow ? realUriOf(doc.uri) : doc.uri;
    if (real.scheme !== 'file') {
        vscode.window.showWarningMessage('仅支持运行本地文件');
        return;
    }
    const lang = engine.langOfPath(real.fsPath);
    if (lang === 'other') {
        vscode.window.showWarningMessage('当前文件类型暂不支持直接运行（支持 .ts / .js / .py）');
        return;
    }

    // 中文视图：先反向还原并写盘；有未映射标识符时保存会失败，此时不运行
    if (doc.isDirty || shadow) {
        try {
            const saved = await doc.save();
            if (!saved) {
                vscode.window.showErrorMessage(
                    '运行已取消：保存未完成。请检查是否有未映射的中文标识符，或磁盘是否可写。'
                );
                return;
            }
        } catch (e) {
            vscode.window.showErrorMessage(
                '运行已取消：' + String((e as Error)?.message || e)
            );
            return;
        }
    }

    const file = real.fsPath;
    const cwd = path.dirname(file);
    let command: string;

    if (lang === 'python') {
        const py = await detectPython();
        if (!py) {
            vscode.window.showErrorMessage('未检测到 Python 解释器（已尝试 py / python / python3）');
            return;
        }
        command = `${py} -u ${quote(file)}`;
    } else if (lang === 'javascript') {
        command = `node ${quote(file)}`;
    } else {
        const node = await detectNode();
        if (!node) {
            vscode.window.showErrorMessage('未检测到 Node.js');
            return;
        }
        if (node.major >= 23) {
            // Node 23+ 原生支持运行 .ts，模块解析与直接运行完全一致
            command = `node ${quote(file)}`;
        } else if (node.major >= 22) {
            command = `node --experimental-strip-types ${quote(file)}`;
        } else {
            const tmp = transpileToTemp(file);
            if (!tmp) {
                vscode.window.showErrorMessage('TypeScript 转译失败，无法运行');
                return;
            }
            command = `node ${quote(tmp)}`;
        }
    }

    log.info(`运行：${command}`);
    const terminal = getTerminal(cwd);
    terminal.show(true);
    terminal.sendText(command, true);
}
