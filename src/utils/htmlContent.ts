import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function getHtmlContent(extensionUri: vscode.Uri): string {
    const htmlPath = path.join(extensionUri.fsPath, 'src', 'webview.html');
    return fs.readFileSync(htmlPath, 'utf8');
}