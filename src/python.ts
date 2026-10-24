import { execFile } from 'child_process';

/** Python 成员信息（补全用） */
export interface PyMember {
    name: string;
    sig: string;
    doc: string;
    kind: 'function' | 'class';
}

export interface PySyntaxIssue {
    line: number;
    column: number;
    message: string;
}

export interface PyCheckResult {
    ok: boolean;
    errors: PySyntaxIssue[];
    error?: string;
}

let pythonCmd: string | null | undefined;

/** 探测 Python 解释器（一次性缓存） */
export function detectPython(): Promise<string | null> {
    if (pythonCmd !== undefined) { return Promise.resolve(pythonCmd); }
    const candidates = process.platform === 'win32'
        ? ['py', 'python', 'python3']
        : ['python3', 'python'];
    return new Promise((resolve) => {
        const tryNext = (i: number): void => {
            if (i >= candidates.length) { pythonCmd = null; resolve(null); return; }
            const cmd = candidates[i];
            const args = process.platform === 'win32' && cmd === 'py' ? ['-3', '--version'] : ['--version'];
            execFile(cmd, args, { timeout: 4000, windowsHide: true }, (err) => {
                if (err) { tryNext(i + 1); return; }
                pythonCmd = cmd === 'py' ? 'py -3' : cmd;
                resolve(pythonCmd);
            });
        };
        tryNext(0);
    });
}

function splitCmd(cmd: string): { bin: string; pre: string[] } {
    const parts = cmd.split(' ');
    return { bin: parts[0], pre: parts.slice(1) };
}

// 纯语法检查：ast.parse，不导入模块、不执行任何代码
const CHECK_SCRIPT = `
import ast, sys, json
code = sys.stdin.read()
try:
    ast.parse(code)
except SyntaxError as e:
    print(json.dumps({"ok": True, "errors": [{
        "line": e.lineno or 1,
        "column": e.offset or 1,
        "message": (e.msg or "invalid syntax")
    }]}))
    sys.exit(0)
except Exception as e:
    print(json.dumps({"ok": False, "error": type(e).__name__ + ": " + str(e)}))
    sys.exit(0)
print(json.dumps({"ok": True, "errors": []}))
`.trim();

const INTROSPECT_SCRIPT = `
import importlib, inspect, json, sys
name = sys.argv[1]
try:
    mod = importlib.import_module(name)
except Exception as e:
    print(json.dumps({"ok": False, "error": str(e)}))
    sys.exit(0)
out = []
for attr in dir(mod):
    if attr.startswith("_"):
        continue
    try:
        obj = getattr(mod, attr)
    except Exception:
        continue
    if not callable(obj):
        continue
    try:
        sig = str(inspect.signature(obj))
    except Exception:
        sig = ""
    doc = inspect.getdoc(obj) or ""
    first = doc.split("\\n")[0].strip() if doc else ""
    kind = "class" if inspect.isclass(obj) else "function"
    out.append({"name": attr, "sig": sig, "doc": first, "kind": kind})
print(json.dumps({"ok": True, "members": out}, ensure_ascii=False))
`.trim();

/** 语法检查（用于中文模式问题检测器） */
export async function checkPythonSyntax(code: string): Promise<PyCheckResult> {
    const cmd = await detectPython();
    if (!cmd) { return { ok: false, errors: [], error: '未检测到 Python 解释器' }; }

    const { bin, pre } = splitCmd(cmd);
    return new Promise<PyCheckResult>((resolve) => {
        const child = execFile(
            bin,
            pre.concat(['-c', CHECK_SCRIPT]),
            { timeout: 10000, maxBuffer: 1024 * 1024, windowsHide: true },
            (err, stdout) => {
                if (err) {
                    resolve({ ok: false, errors: [], error: '语法检查进程失败：' + err.message });
                    return;
                }
                try {
                    const parsed = JSON.parse(String(stdout || '').trim());
                    if (parsed && Array.isArray(parsed.errors)) {
                        resolve({ ok: true, errors: parsed.errors as PySyntaxIssue[] });
                    } else {
                        resolve({ ok: false, errors: [], error: String(parsed?.error || '结果解析失败') });
                    }
                } catch {
                    resolve({ ok: false, errors: [], error: '语法检查结果解析失败' });
                }
            }
        );
        if (child.stdin) {
            child.stdin.on('error', () => undefined);
            child.stdin.end(code, 'utf-8');
        }
    });
}

const MEMBER_RE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const memberCache = new Map<string, Promise<PyMember[]>>();

/** 采集模块公开成员（名字 / 签名 / 文档首行），结果进程内缓存 */
export function introspectPythonModule(module: string): Promise<PyMember[]> {
    if (!MEMBER_RE.test(module)) { return Promise.resolve([]); }
    const hit = memberCache.get(module);
    if (hit) { return hit; }

    const task = (async (): Promise<PyMember[]> => {
        const cmd = await detectPython();
        if (!cmd) { return []; }
        const { bin, pre } = splitCmd(cmd);
        return new Promise<PyMember[]>((resolve) => {
            execFile(
                bin,
                pre.concat(['-c', INTROSPECT_SCRIPT, module]),
                { timeout: 8000, maxBuffer: 4 * 1024 * 1024, windowsHide: true },
                (err, stdout) => {
                    if (err) { resolve([]); return; }
                    try {
                        const parsed = JSON.parse(String(stdout || '').trim());
                        if (parsed && parsed.ok && Array.isArray(parsed.members)) {
                            resolve(parsed.members as PyMember[]);
                        } else {
                            resolve([]);
                        }
                    } catch {
                        resolve([]);
                    }
                }
            );
        });
    })();

    memberCache.set(module, task);
    void task.then((members) => {
        if (members.length === 0) {
            // 失败结果短缓存，避免反复 spawn
            setTimeout(() => memberCache.delete(module), 60 * 1000).unref?.();
        }
    });
    return task;
}
