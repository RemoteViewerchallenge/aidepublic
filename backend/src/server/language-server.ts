import { WebSocketServer, WebSocket } from 'ws';
import { Connection, TextDocuments } from 'vscode-languageserver';
import {
  WebSocketMessageReader,
  WebSocketMessageWriter,
  createConnection,
} from 'vscode-ws-jsonrpc';
import { TextDocument } from 'vscode-languageserver-textdocument';

const wss = new WebSocketServer({ port: 3000, path: '/sampleServer' });

wss.on('connection', (ws: WebSocket) => {
  const reader = new WebSocketMessageReader(ws);
  const writer = new WebSocketMessageWriter(ws);
  const connection = createConnection(reader, writer, () => {});
  const documents = new TextDocuments(TextDocument);

  documents.listen(connection);

  connection.onInitialize(() => ({
    capabilities: {
      textDocumentSync: 1, // Full sync
    },
  }));

  connection.listen();
});
