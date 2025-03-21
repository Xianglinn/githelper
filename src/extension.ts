import * as vscode from 'vscode';
import axios from 'axios';
import { exec } from 'child_process';
import { getHtmlContent } from './utils/htmlContent';
import { Ollama } from "@langchain/ollama";
import * as path from 'path';
import { fetchGitLog, gitClone, gitStatus, gitLog, getGitRecommendation } from './utils/util_function';
import { performance } from 'perf_hooks';

const model = new Ollama({
    baseUrl: "http://127.0.0.1:11434", // Your local Ollama server
    model: "GitHelper:latest", // Your local model name
});

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
                    const cpuStart = process.cpuUsage();
                    const timeStart = performance.now();
                    const memStart = process.memoryUsage();
                    const response = await this.sendToLLM(message.text);
                    webviewView.webview.postMessage({
                        type: 'chatResponse',
                        response: response || 'No response from LLM.',
                    });

                    setTimeout(() => {
                        const cpuEnd = process.cpuUsage(cpuStart);
                        const timeEnd = performance.now();
                        const memEnd = process.memoryUsage();
                    
                        // Time
                        const elapsed = (timeEnd - timeStart).toFixed(2);
                    
                        // CPU
                        const userCPU = (cpuEnd.user / 1000).toFixed(2);     // μs → ms
                        const systemCPU = (cpuEnd.system / 1000).toFixed(2);
                        const totalCPU = (parseFloat(userCPU) + parseFloat(systemCPU)).toFixed(2);
                    
                        // Memory
                        const heapUsed = ((memEnd.heapUsed - memStart.heapUsed) / 1024 / 1024).toFixed(2);
                        const heapTotal = (memEnd.heapTotal / 1024 / 1024).toFixed(2);
                        const rss = (memEnd.rss / 1024 / 1024).toFixed(2);
                    
                        // Console output
                        console.log(`Average Time: ${elapsed} ms`);
                        console.log(`CPU Usage:
                        • User: ${userCPU} ms
                        • System: ${systemCPU} ms
                        • Total: ${totalCPU} ms`);
                        console.log(`Average Memory Usage:
                        • Heap Used Delta: ${heapUsed} MB
                        • Heap Total: ${heapTotal} MB
                        • RSS: ${rss} MB`);
                    
                        // Quick summary popup
                        vscode.window.showInformationMessage(`Time ${elapsed}ms | CPU: ${totalCPU}ms | Heap: ${heapUsed}MB`);
                    }, 0); // Replace this with your actual async function
                    break;
                // case 'analyzeGitLog':
                //     await this.analyzeGitLog();
                //     webviewView.webview.postMessage({
                //         type: 'chatResponse',
                //         response: 'Git log analyzed and memorized.',
                //     });
                // break;
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
        return fetchGitLog(workspacePath);
    }

    public openChat() {
        vscode.window.showInformationMessage('Opening Chat...');
        if (this._view) {
            this._view.webview.postMessage({ type: 'openChat' });
        }
    }

    private async sendToLLM(message: string): Promise<string> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return "No workspace folder is open.";
        }
    
        const workspacePath = workspaceFolders[0].uri.fsPath;
    
        if (message.toLowerCase().includes("store git log")) {
            let filePath: string;
            const localFolderPath = path.join(workspacePath, 'local');
            filePath = path.join(localFolderPath, 'git_log.txt');
    
            try {
                // Ensure the "local" folder exists
                await vscode.workspace.fs.createDirectory(vscode.Uri.file(localFolderPath));
    
                const logs = await this.fetchGitLog();
                // Write the git log to git_log.txt
                await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), Buffer.from(logs, 'utf8'));
                return "Git log stored successfully!";
            } catch (error) {
                console.error("Error storing git log:", error);
                return "Failed to store git log.";
            }
        } else if (message.toLowerCase().includes("git") && message.toLowerCase().includes("recommendation")) {
            try {
                const recommendation = await getGitRecommendation(workspacePath, message);
                return recommendation;
            } catch (error) {
                console.error("Error getting git recommendation:", error);
                return "Failed to get git recommendation.";
            }
        } else {
            try {
                // Fetch status and log in parallel
                const [status, log] = await Promise.all([
                    gitStatus(workspacePath),
                    gitLog(workspacePath)
                ]);
    
                const response = await model.invoke([
                    [
                        "system",
                        "You are a helpful assistant, focused on providing guidance for Git-related tasks. If the user asks for unrelated information, please tell them you are not able to help with that. Your name is GitHelper. Your author is team 2024892.",
                    ],
                    [
                        "user", 
                        `${message}\n${status}\n${log}`,
                    ],
                ]);
                return response;
            } catch (error) {
                console.error("Error querying LLM:", error);
                return "Failed to get response from LLM.";
            }
        }
    }
}

export function deactivate() {
    console.log('GitHelper Extension Deactivated');
}