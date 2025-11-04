'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Dynamically import Monaco Editor with proper local configuration
const Editor = dynamic(
  async () => {
    // Import Monaco React wrapper
    const { Editor, loader } = await import('@monaco-editor/react');

    // Configure loader to prevent CDN usage
    loader.config({
      monaco: await import('monaco-editor'),
    });

    return Editor;
  },
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          border: '1px solid #ccc',
          borderRadius: '8px',
          background: '#f9f9f9',
        }}
      >
        🔄 Loading Monaco Editor (Local)...
      </div>
    ),
  }
);

export default function MonacoTestPage() {
  const [isClient, setIsClient] = useState(false);
  const [editorStatus, setEditorStatus] = useState('Initializing...');
  const [editorValue, setEditorValue] =
    useState(`// Monaco Editor Test (Local Loading)
function hello() {
  console.log("Hello from Monaco Editor!");
  return "Monaco is working without CDN!";
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

  if (!isClient) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>🎮 Monaco Editor Test</h1>
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
      <h1>🎮 Monaco Editor Test (No CDN)</h1>
      <p>Testing Monaco Editor with local loading to avoid CSP issues:</p>

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
          <li>✅ Local loading (no CDN dependencies)</li>
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
          <strong>Loading method:</strong> Local (no CDN)
        </p>
      </div>
    </div>
  );
}
