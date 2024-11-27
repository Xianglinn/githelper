import path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import axios from 'axios';
import { Stream } from 'stream';

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
                async (message) => {
                    if (message.command === 'newMessage') {
                        const userMessage = message.text;
                        
                        // Send the user message to the Ollama model
                        try {
                            const reply = await queryOllamaModel(userMessage);
                            // Send the reply back to the webview
                            panel.webview.postMessage({ command: 'displayResponse', text: reply });
                        } catch (error) {
                            console.error("Error querying Ollama model:", error);
                            panel.webview.postMessage({ command: 'displayResponse', text: "Error connecting to Ollama." });
                        }
                    }
                },
                undefined,
                context.subscriptions
            );
        })
    );

    console.log('Extension "my-extension" is now active!');
}

// Function to query the Ollama API
async function queryOllamaModel(userMessage: string): Promise<string> {
    const API_URL = 'http://127.0.0.1:11434/api/generate'; // Update with Ollama's API URL
    const MODEL_NAME = 'llama3:latest'; // Replace with your Ollama model name

    try {
        const response = await axios.post(API_URL, {
            model: MODEL_NAME,
            prompt: userMessage,
            stream: false
        });
        console.log("API Response:", response.data); // Log the full response
        return response.data.response || "No response received.";
    } catch (error) {
        // console.error("Error querying Ollama:", error.message);
        throw error;
    }
}

// Function to define the HTML content for the chatbot UI
function getWebviewContent(context: vscode.ExtensionContext): string {
    const htmlPath = path.join(context.extensionPath, 'gui.html');
    return fs.readFileSync(htmlPath, 'utf8');
}


// curl http://127.0.0.1:11434/api/generate -d '{ "model": "llama3:latest", "prompt":"Why is the sky blue?"}'

// Invoke-WebRequest -Uri "http://127.0.0.1:11434/api/generate" `
//     -Method POST `
//     -ContentType "application/json" `
//     -Body '{ "model": "llama3:latest", "prompt": "Why is the sky blue?", "stream": false }' `
