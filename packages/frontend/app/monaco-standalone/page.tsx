'use client';

import React from 'react';
import { useEffect, useState } from 'react';

// Simple Monaco Editor component that doesn't depend on any external providers
export default function MonacoStandalonePage() {
  const [isClient, setIsClient] = useState(false);
  const [editorStatus, setEditorStatus] = useState('Initializing...');
  const [editorValue, setEditorValue] =
    useState(`// Monaco Editor Standalone Test
function hello() {
  console.log("Hello from Monaco Editor!");
  return "Monaco is working!";
}

// Try editing this code
const greeting = "Monaco Editor is awesome!";
console.log(greeting);

hello();

// Test autocomplete by typing: console.`);

  useEffect(() => {
    setIsClient(true);
    setEditorStatus('Ready for Monaco initialization...');
  }, []);

  const MonacoEditor = () => {
    const [Editor, setEditor] = useState<any>(null);

    useEffect(() => {
      import('@monaco-editor/react')
        .then(monaco => {
          setEditor(() => monaco.Editor);
          setEditorStatus('Monaco module loaded successfully');
        })
        .catch(error => {
          console.error('Failed to load Monaco:', error);
          setEditorStatus('❌ Failed to load Monaco Editor');
        });
    }, []);

    if (!Editor) {
      return (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            border: '1px solid #ccc',
            borderRadius: '8px',
            background: '#f9f9f9',
            height: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          🔄 Loading Monaco Editor...
        </div>
      );
    }

    return (
      <Editor
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
        onChange={(value: any) => {
          setEditorValue(value || '');
          console.log('✅ Editor content changed');
        }}
        onMount={(editor: any, monaco: any) => {
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
    );
  };

  if (!isClient) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>🎮 Monaco Editor Standalone Test</h1>
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

  return (
    <div style={{ padding: '20px' }}>
      <h1>🎮 Monaco Editor Standalone Test</h1>
      <p>
        Testing Monaco Editor without any external dependencies or providers:
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
        <MonacoEditor />
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
          <li>✅ Standalone loading (no external providers)</li>
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
          <strong>Loading method:</strong> Standalone (no providers)
        </p>
      </div>
    </div>
  );
}
