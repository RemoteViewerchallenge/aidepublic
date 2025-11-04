import * as monaco from 'monaco-editor';
import { MonacoLanguageClient } from 'monaco-languageclient';
import { ErrorAction } from 'vscode-languageclient';
import {
  _BrowserMessageReader,
  _BrowserMessageWriter,
} from 'vscode-languageserver-protocol/browser';
import {
  toSocket,
  WebSocketMessageReader,
  WebSocketMessageWriter,
} from 'vscode-ws-jsonrpc';

const root = document.getElementById('root')!;

monaco.editor.create(root, {
  theme: 'vs-dark',
  automaticLayout: true,
});

type LanguageClientTransports = {
  reader: WebSocketMessageReader;
  writer: WebSocketMessageWriter;
};

const createLanguageClient = (transports: LanguageClientTransports) => {
  return new MonacoLanguageClient({
    name: 'Sample Language Client',
    clientOptions: {
      // use a language id as a document selector
      documentSelector: ['typescript'],
      // disable the default error handler
      errorHandler: {
        error: () => ({ action: ErrorAction.Continue }),
        closed: () => ({ action: ErrorAction.DoNotRestart }), // Use enum value for DoNotRestart
      },
    },
    messageTransports: transports,
  });
};

const createUrl = (hostname: string, port: number, path: string): string => {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${hostname}:${port}${path}`;
};

const url = createUrl(location.hostname, 3000, '/sampleServer');
const webSocket = new WebSocket(url);

webSocket.onopen = () => {
  const socket = toSocket(webSocket);
  const reader = new WebSocketMessageReader(socket);
  const writer = new WebSocketMessageWriter(socket);
  const languageClient = createLanguageClient({
    reader,
    writer,
  });
  languageClient.start();
  reader.onClose(() => languageClient.stop());
};
