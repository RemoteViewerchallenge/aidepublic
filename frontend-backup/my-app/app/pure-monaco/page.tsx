'use client';

import { useEffect, useState } from 'react';

// Pure Monaco Editor test without any external dependencies
export default function PureMonacoPage() {
  const [isClient, setIsClient] = useState(false);
  const [editorStatus, setEditorStatus] = useState('Initializing...');
  const [editorValue, setEditorValue] = useState(`// Pure Monaco Editor Test
function hello() {
  console.log("Hello from Pure Monaco Editor!");
  return "Monaco is working without any dependencies!";
}

// Try editing this code
const greeting = "Pure Monaco Editor is awesome!";
console.log(greeting);

hello();

// Test autocomplete by typing: console.`);

  useEffect(() => {
    setIsClient(true);
    setEditorStatus('Ready for Monaco initialization...');
  }, []);

  const [MonacoEditor, setMonacoEditor] = useState<any>(null);

  useEffect(() => {
    if (isClient) {
      // Dynamically import Monaco Editor only on the client side
      import('@monaco-editor/react')
        .then(module => {
          setMonacoEditor(() => module.Editor);
          setEditorStatus('Monaco Editor module loaded successfully');
        })
        .catch(error => {
          console.error('Failed to load Monaco Editor:', error);
          setEditorStatus('❌ Failed to load Monaco Editor');
        });
    }
  }, [isClient]);

  if (!isClient) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>🎮 Pure Monaco Editor Test</h1>
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            border: '1px solid #ccc',
            borderRadius: '8px',
          }}
        >
          ⏳ Initializing client-side rendering...
        </div>
      </div>
    );
  }

  if (!MonacoEditor) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>🎮 Pure Monaco Editor Test</h1>

        <div
          style={{
            marginBottom: '15px',
            padding: '10px',
            background: '#e8f4f8',
            borderRadius: '4px',
          }}
        >
          <strong>Status:</strong> {editorStatus}
        </div>

        <div
          style={{
            height: '400px',
            width: '100%',
            border: '1px solid #ccc',
            borderRadius: '8px',
            overflow: 'hidden',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f9f9f9',
          }}
        >
          🔄 Loading Monaco Editor...
        </div>

        <div>
          <h3>🧪 Loading Monaco Editor...</h3>
          <p>Please wait while we load the Monaco Editor component.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>🎮 Pure Monaco Editor Test</h1>
      <p>
        Testing Monaco Editor with zero external dependencies (no tRPC, no
        providers):
      </p>

      <div
        style={{
          marginBottom: '15px',
          padding: '10px',
          background: '#e8f4f8',
          borderRadius: '4px',
        }}
      >
        <strong>Status:</strong> {editorStatus}
      </div>

      <div
        style={{
          height: '400px',
          width: '100%',
          border: '1px solid #ccc',
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '20px',
        }}
      >
        <MonacoEditor
          height="400px"
          defaultLanguage="javascript"
          value={editorValue}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            lineNumbers: 'on',
            folding: true,
            matchBrackets: 'always',
            bracketPairColorization: { enabled: true },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnCommitCharacter: true,
            tabCompletion: 'on',
          }}
          onChange={value => {
            setEditorValue(value || '');
            console.log('✅ Editor content changed');
          }}
          onMount={(editor, monaco) => {
            setEditorStatus('✅ Monaco Editor loaded and ready!');
            console.log('✅ Monaco Editor mounted successfully!', {
              editor,
              monaco,
            });
          }}
          loading={
            <div style={{ padding: '20px', textAlign: 'center' }}>
              🔄 Initializing Monaco Editor...
            </div>
          }
        />
      </div>

      <div>
        <h3>🧪 Features to test:</h3>
        <ul style={{ lineHeight: '1.6' }}>
          <li>✅ Syntax highlighting (JavaScript)</li>
          <li>✅ Line numbers and folding</li>
          <li>✅ Bracket matching and colorization</li>
          <li>✅ Dark theme</li>
          <li>✅ Minimap</li>
          <li>✅ Word wrap</li>
          <li>✅ Auto-complete (type &quot;console.&quot;)</li>
          <li>✅ Pure implementation (no external dependencies)</li>
          <li>✅ CSP compliant</li>
        </ul>
      </div>

      <div
        style={{
          marginTop: '20px',
          padding: '15px',
          background: '#f5f5f5',
          borderRadius: '8px',
        }}
      >
        <h4>📊 Debug Information:</h4>
        <p>
          <strong>Client-side rendering:</strong>{' '}
          {isClient ? '✅ Active' : '❌ Not ready'}
        </p>
        <p>
          <strong>Editor status:</strong> {editorStatus}
        </p>
        <p>
          <strong>Editor value length:</strong> {editorValue.length} characters
        </p>
        <p>
          <strong>Monaco package:</strong> @monaco-editor/react@4.7.0
        </p>
        <p>
          <strong>Loading method:</strong> Pure dynamic import (no dependencies)
        </p>
        <p>
          <strong>Dependencies:</strong> None (tRPC-free)
        </p>
      </div>
    </div>
  );
}
