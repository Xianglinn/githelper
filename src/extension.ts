import * as vscode from 'vscode';
import axios from 'axios';
import { exec } from 'child_process';
import { getHtmlContent } from './utils/htmlContent';

export function activate(context: vscode.ExtensionContext) {
    console.log('GitHelper Extension Activated!');

    const provider = new GitHelperViewProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(GitHelperViewProvider.viewType, provider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('githelper.fetchGitLog', async () => {
            const logs = await provider.fetchGitLog();
            vscode.window.showInformationMessage('Git log fetched!');
            provider.updateContent(logs);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('githelper.clearLogs', () => {
            provider.updateContent('');
            vscode.window.showInformationMessage('Logs cleared!');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('githelper.openChat', () => {
            provider.openChat();
        })
    );
}

class GitHelperViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'githelper.gitView';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = getHtmlContent(this._extensionUri);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'clearLogs':
                    this.updateContent('');
                    vscode.window.showInformationMessage('Logs cleared from Webview!');
                    break;
                case 'sendMessage':
                    const response = await this.sendToLLM(message.text);
                    webviewView.webview.postMessage({
                        type: 'chatResponse',
                        response: response || 'No response from LLM.',
                    });
                    break;
            }
        });
    }

    public updateContent(content: string) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'updateContent', content });
        }
    }

    public async fetchGitLog(): Promise<string> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder is open.');
            return '';
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        return new Promise((resolve, reject) => {
            exec('git log --oneline --graph --decorate --all', { cwd: workspacePath }, (err, stdout) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    public openChat() {
        vscode.window.showInformationMessage('Opening Chat...');
        if (this._view) {
            this._view.webview.postMessage({ type: 'openChat' });
        }
    }

    private async sendToLLM(message: string): Promise<string> {
        const API_URL = 'http://127.0.0.1:11434/api/generate'; // Update with Ollama's API URL
        const MODEL_NAME = 'GitHelper:latest';
    
        try {
            const response = await axios.post(API_URL, {
                model: MODEL_NAME,
                prompt: message,
                stream: false
            });
            console.log("API Response:", response.data); // Log the full response
            return response.data.response || "No response received.";
        } catch (error) {
            // console.error("Error querying Ollama:", error.message);
            throw error;
        }
    }
}

export function deactivate() {
    console.log('GitHelper Extension Deactivated');
}