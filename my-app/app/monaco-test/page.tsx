'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(
  () => import('@monaco-editor/react').then(mod => mod.Editor),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        Loading Monaco Editor...
      </div>
    ),
  }
);

export default function MonacoTestPage() {
  const [isClient, setIsClient] = useState(false);
  const [editorValue, setEditorValue] = useState(`// Monaco Editor Test
function hello() {
  console.log("Hello from Monaco Editor!");
  return "Monaco is working!";
}

// Try editing this code
const greeting = "Monaco Editor is awesome!";
console.log(greeting);

hello();`);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Monaco Editor Test</h1>
        <div
          style={{
            padding: '40px',
            textAlign: 'center',
            border: '1px solid #ccc',
            borderRadius: '8px',
          }}
        >
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>🎮 Monaco Editor Test</h1>
      <p>Testing if Monaco Editor works properly:</p>

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
            console.log(
              '✅ Editor content changed:',
              value?.substring(0, 50) + '...'
            );
          }}
          onMount={(editor, monaco) => {
            console.log('✅ Monaco Editor mounted successfully!', {
              editor,
              monaco,
            });
          }}
        />
      </div>

      <div>
        <h3>🧪 Features to test:</h3>
        <ul style={{ lineHeight: '1.6' }}>
          <li>✅ Syntax highlighting (JavaScript)</li>
          <li>✅ Line numbers</li>
          <li>✅ Code folding</li>
          <li>✅ Bracket matching</li>
          <li>✅ Dark theme</li>
          <li>✅ Minimap</li>
          <li>✅ Word wrap</li>
          <li>✅ Auto-complete (try typing &quot;console.&quot;)</li>
          <li>✅ Dynamic loading (no SSR issues)</li>
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
        <h4>📊 Current Status:</h4>
        <p>
          <strong>Client-side rendering:</strong>{' '}
          {isClient ? '✅ Active' : '❌ Not ready'}
        </p>
        <p>
          <strong>Editor value length:</strong> {editorValue.length} characters
        </p>
        <p>
          <strong>Monaco package:</strong> @monaco-editor/react@4.7.0
        </p>
      </div>
    </div>
  );
}
