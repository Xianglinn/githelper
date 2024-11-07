import * as vscode from 'vscode';

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
            panel.webview.html = getWebviewContent();

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
function getWebviewContent() {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Chatbot</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 0;
                    margin: 0;
                }
                #chatContainer {
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    padding: 10px;
                }
                #messages {
                    flex-grow: 1;
                    overflow-y: auto;
                    border: 1px solid #ccc;
                    padding: 10px;
                    margin-bottom: 10px;
                }
                #inputForm {
                    display: flex;
                }
                #messageInput {
                    flex-grow: 1;
                    padding: 10px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                }
                #sendButton {
                    margin-left: 5px;
                    padding: 10px 15px;
                    border: none;
                    background-color: #007acc;
                    color: white;
                    cursor: pointer;
                }
            </style>
        </head>
        <body>
            <div id="chatContainer">
                <div id="messages"></div>
                <form id="inputForm">
                    <input type="text" id="messageInput" placeholder="Type a message..." />
                    <button type="button" id="sendButton">Send</button>
                </form>
            </div>
            <script>
                const vscode = acquireVsCodeApi();

                // Send message when clicking "Send" button
                document.getElementById('sendButton').onclick = (event) => {
                    event.preventDefault(); // Prevent form submission
                    const messageInput = document.getElementById('messageInput');
                    const message = messageInput.value;

                    if (message) {
                        // Display user's message in the chat window
                        const messageContainer = document.getElementById('messages');
                        messageContainer.innerHTML += '<div><strong>You:</strong> ' + message + '</div>';
                        messageContainer.scrollTop = messageContainer.scrollHeight;
                        messageInput.value = ''; // Clear input after sending

                        // Send message to the extension
                        vscode.postMessage({ command: 'newMessage', text: message });
                    }
                };

                // Receive bot responses from the extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.command === 'displayResponse') {
                        const messageContainer = document.getElementById('messages');
                        messageContainer.innerHTML += '<div><strong>Bot:</strong> ' + message.text + '</div>';
                        messageContainer.scrollTop = messageContainer.scrollHeight;
                    }
                });
            </script>
        </body>
        </html>
    `;
}
