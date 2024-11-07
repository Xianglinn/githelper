import path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('extension.openChatbot', () => {
            const panel = vscode.window.createWebviewPanel(
                'chatbot', // Identifies the type of the webview
                'Chatbot', // Title of the panel displayed to the user
                vscode.ViewColumn.One, // Editor column to show the new webview panel
                {
                    enableScripts: true // Enable JavaScript in the webview
                }
            );

            // Set the HTML content for the webview
            panel.webview.html = getWebviewContent(context);

            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(
                (message) => {
                    if (message.command === 'newMessage') {
                        const userMessage = message.text;
                        // Generate a predefined reply
                        const reply = handleUserMessage(userMessage);
                        // Send the reply back to the webview
                        panel.webview.postMessage({ command: 'displayResponse', text: reply });
                    }
                },
                undefined,
                context.subscriptions
            );
        })
    );
}

// Function to simulate handling user messages with predefined responses
function handleUserMessage(userMessage: string): string {
    // Simple predefined responses
    const responses: { [key: string]: string } = {
        "hello": "Hello! How can I help you today?",
        "how are you": "I'm a bot, but thanks for asking! How are you?",
        "what's your name": "I'm your helpful chatbot assistant!",
        "bye": "Goodbye! Feel free to reach out anytime."
    };

    // Check if there's a predefined response
    const lowercasedMessage = userMessage.toLowerCase();
    if (responses[lowercasedMessage]) {
        return responses[lowercasedMessage];
    } else {
        return "I'm here to help! Could you please rephrase your question?";
    }
}

// Function to define the HTML content for the chatbot UI
// Function to define the HTML content for the chatbot UI
function getWebviewContent(context: vscode.ExtensionContext): string {
    const htmlPath = path.join(context.extensionPath, 'gui.html');
    return fs.readFileSync(htmlPath, 'utf8');
}
