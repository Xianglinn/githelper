import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
   // Define the chat handler
   const handler: vscode.ChatRequestHandler = async (request, context, stream, token) => {
      // Initialize the prompt to send to your LLM
      const prompt = `You are a helpful assistant. Answer clearly and concisely.`;
      const userMessage = request.prompt;

      // Send the combined prompt and user input to your LLM API
      const responseChunks = await fetchLLMResponse(prompt + "\n" + userMessage);

      // Stream each response chunk back to the chat
      for (const chunk of responseChunks) {
         stream.markdown(chunk);
      }
   };

   // Register the chat participant with the handler
   const participant = vscode.chat.createChatParticipant('my-chat-llm.chat', handler);

   // Optionally, set an icon for the participant
   participant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');
}

async function fetchLLMResponse(query: string): Promise<string[]> {
	// const response = await fetch("https://your-llm-api.com/generate", {
	//    method: "POST",
	//    headers: {
	// 	  "Content-Type": "application/json"
	//    },
	//    body: JSON.stringify({ prompt: query })
	// });
 
	// const data = await response.json() as { messages: string[] };  // Type assertion here
	return ["good job"];
 }
 