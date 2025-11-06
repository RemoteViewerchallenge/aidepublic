import type {
  InitializeParams,
  InitializeResult} from 'vscode-languageserver/node';
import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { WebSocket} from 'ws';
import { WebSocketServer } from 'ws';

// Create connection handler
function createLanguageServer(socket: WebSocket) {
  const connection = createConnection(ProposedFeatures.all);
  const documents = new TextDocuments(TextDocument);

  connection.onInitialize((_params: InitializeParams): InitializeResult => {
    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Full,
      },
    };
  });

  // Listen on the documents
  documents.listen(connection);

  // Setup WebSocket message handling
  socket.on('message', (data: Buffer) => {
    const message = data.toString();
    connection.sendNotification('custom/message', message);
  });

  // Start listening
  connection.listen();
}

// Create WebSocket server
const wss = new WebSocketServer({ port: 3000, path: '/sampleServer' });

wss.on('connection', (socket: WebSocket) => {
  console.log('Client connected to language server');
  createLanguageServer(socket);
});
