'use client';

import { Editor } from '@monaco-editor/react';
import { useState } from 'react';

// Role Manager Component
const RoleManager = () => {
  const [roles, setRoles] = useState([
    {
      id: 1,
      name: 'System Architect',
      description: 'Designs system architecture',
    },
    { id: 2, name: 'Code Reviewer', description: 'Reviews and optimizes code' },
    {
      id: 3,
      name: 'Documentation Writer',
      description: 'Creates technical documentation',
    },
  ]);

  const [newRole, setNewRole] = useState({ name: '', description: '' });

  const addRole = () => {
    if (newRole.name && newRole.description) {
      setRoles([
        ...roles,
        {
          id: Date.now(),
          name: newRole.name,
          description: newRole.description,
        },
      ]);
      setNewRole({ name: '', description: '' });
    }
  };

  const removeRole = id => {
    setRoles(roles.filter(role => role.id !== id));
  };

  return (
    <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>Role Manager</h3>

      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Role name"
          value={newRole.name}
          onChange={e => setNewRole({ ...newRole, name: e.target.value })}
          style={{
            width: '100%',
            padding: '8px',
            marginBottom: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        />
        <input
          type="text"
          placeholder="Role description"
          value={newRole.description}
          onChange={e =>
            setNewRole({ ...newRole, description: e.target.value })
          }
          style={{
            width: '100%',
            padding: '8px',
            marginBottom: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        />
        <button
          onClick={addRole}
          style={{
            background: '#007acc',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Add Role
        </button>
      </div>

      <div>
        {roles.map(role => (
          <div
            key={role.id}
            style={{
              background: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>{role.name}</strong>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {role.description}
                </div>
              </div>
              <button
                onClick={() => removeRole(role.id)}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function MonacoWorkspace() {
  const [promptContent, setPromptContent] = useState(`// AI Prompt Input
// Write your prompts and instructions here

const prompt = \`
Act as a senior software engineer.
Help me create a React component that...
\`;

console.log("Prompt:", prompt);`);

  const [generatedContent, setGeneratedContent] = useState(`// Generated Output
// AI responses and generated code will appear here

function ExampleComponent() {
  const [state, setState] = useState(null);
  
  return (
    <div>
      <h1>Generated Component</h1>
      <p>This is example generated content</p>
    </div>
  );
}

export default ExampleComponent;`);

  const [scratchContent, setScratchContent] = useState(`// Scratch Pad
// Use this space for notes, experiments, and temporary code

const ideas = [
  "Implement user authentication",
  "Add error handling",
  "Optimize performance",
  "Write unit tests"
];

// TODO: Implement these features
console.log(ideas);`);

  const [testContent, setTestContent] = useState(`// Test & Debug Space
// Write test cases and debug code here

import { test, expect } from 'vitest';

test('example test', () => {
  const result = 2 + 2;
  expect(result).toBe(4);
});

// Debug helpers
const debug = (value) => {
  console.log('DEBUG:', value);
  return value;
};`);

  return (
    <div
      style={{
        height: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: '8px',
        padding: '8px',
        background: '#f5f5f5',
      }}
    >
      {/* Top Row - Span 2 columns for Role Manager, 2 columns for Prompt */}
      <div
        style={{
          gridColumn: '1 / 3',
          background: '#fff',
          borderRadius: '8px',
          border: '1px solid #ddd',
          overflow: 'hidden',
        }}
      >
        <RoleManager />
      </div>

      <div
        style={{
          gridColumn: '3 / 5',
          background: '#fff',
          borderRadius: '8px',
          border: '1px solid #ddd',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            background: '#f8f9fa',
            padding: '12px',
            borderBottom: '1px solid #e9ecef',
            fontWeight: 'bold',
          }}
        >
          Prompt Input
        </div>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={promptContent}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            lineNumbers: 'on',
            folding: true,
            matchBrackets: 'always',
          }}
          onChange={value => setPromptContent(value || '')}
        />
      </div>

      {/* Bottom Row - 4 separate Monaco editors */}
      <div
        style={{
          background: '#fff',
          borderRadius: '8px',
          border: '1px solid #ddd',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            background: '#f8f9fa',
            padding: '12px',
            borderBottom: '1px solid #e9ecef',
            fontWeight: 'bold',
          }}
        >
          Generated Output
        </div>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={generatedContent}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            lineNumbers: 'on',
            folding: true,
            readOnly: false,
          }}
          onChange={value => setGeneratedContent(value || '')}
        />
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: '8px',
          border: '1px solid #ddd',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            background: '#f8f9fa',
            padding: '12px',
            borderBottom: '1px solid #e9ecef',
            fontWeight: 'bold',
          }}
        >
          Scratch Pad
        </div>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={scratchContent}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            lineNumbers: 'on',
            folding: true,
          }}
          onChange={value => setScratchContent(value || '')}
        />
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: '8px',
          border: '1px solid #ddd',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            background: '#f8f9fa',
            padding: '12px',
            borderBottom: '1px solid #e9ecef',
            fontWeight: 'bold',
          }}
        >
          Test & Debug
        </div>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={testContent}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            lineNumbers: 'on',
            folding: true,
          }}
          onChange={value => setTestContent(value || '')}
        />
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: '8px',
          border: '1px solid #ddd',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            background: '#f8f9fa',
            padding: '12px',
            borderBottom: '1px solid #e9ecef',
            fontWeight: 'bold',
          }}
        >
          Documentation
        </div>
        <Editor
          height="100%"
          defaultLanguage="markdown"
          value={`# Project Documentation

## Overview
This is a Monaco Editor workspace for AI-assisted development.

## Features
- **Role Manager**: Manage AI roles and personas
- **Prompt Input**: Write AI prompts and instructions  
- **Generated Output**: View AI responses and generated code
- **Scratch Pad**: Notes and experimental code
- **Test & Debug**: Test cases and debugging space

## Usage
1. Select or create a role in the Role Manager
2. Write your prompt in the Prompt Input editor
3. Generated responses appear in the Generated Output editor
4. Use other editors for notes, tests, and documentation

## Tips
- Use different themes for different purposes
- All editors support syntax highlighting
- Content is automatically saved as you type`}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            lineNumbers: 'on',
            folding: true,
          }}
        />
      </div>
    </div>
  );
}
