'use client';

import { Editor } from '@monaco-editor/react';

export default function MonacoTestPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Monaco Editor Test</h1>
      <p>Testing if Monaco Editor works properly:</p>

      <div
        style={{
          height: '400px',
          width: '100%',
          border: '1px solid #ccc',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <Editor
          height="400px"
          defaultLanguage="javascript"
          defaultValue={`// Monaco Editor Test
function hello() {
  console.log("Hello from Monaco Editor!");
  return "Monaco is working!";
}

// Try editing this code
const greeting = "Monaco Editor is awesome!";
console.log(greeting);

hello();`}
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
          }}
          onChange={value => {
            console.log('Editor content changed:', value);
          }}
        />
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Features to test:</h3>
        <ul>
          <li>✅ Syntax highlighting (JavaScript)</li>
          <li>✅ Line numbers</li>
          <li>✅ Code folding</li>
          <li>✅ Bracket matching</li>
          <li>✅ Dark theme</li>
          <li>✅ Minimap</li>
          <li>✅ Word wrap</li>
          <li>✅ Auto-complete (try typing &quot;console.&quot;)</li>
        </ul>
      </div>
    </div>
  );
}
