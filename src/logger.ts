import * as vscode from 'vscode';

/** 统一的输出通道日志（VS Code「输出」面板 → CNShadow） */
export class Logger implements vscode.Disposable {
    private readonly channel: vscode.OutputChannel;

    constructor() {
        this.channel = vscode.window.createOutputChannel('CNShadow');
    }

    info(msg: string): void {
        this.channel.appendLine(`[${stamp()}] ${msg}`);
    }

    warn(msg: string): void {
        this.channel.appendLine(`[${stamp()}] [警告] ${msg}`);
    }

    error(msg: string): void {
        this.channel.appendLine(`[${stamp()}] [错误] ${msg}`);
    }

    show(): void {
        this.channel.show(true);
    }

    dispose(): void {
        this.channel.dispose();
    }
}

function stamp(): string {
    const d = new Date();
    const p = (n: number): string => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
