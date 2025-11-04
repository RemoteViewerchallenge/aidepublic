'use client';

import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import React, { useEffect, useRef, useState } from 'react';

interface SharedMonacoEditorProps {
  value: string;
  onChange: (value: string | undefined) => void;
  language?: string;
  theme?: string;
  height?: string;
  readOnly?: boolean;
  placeholder?: string;
}

export const SharedMonacoEditor: React.FC<SharedMonacoEditorProps> = ({
  value,
  onChange,
  language = 'plaintext',
  theme = 'vs-dark',
  height = '400px',
  readOnly = false,
  placeholder = 'Enter your prompt here...',
}) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor
  ) => {
    editorRef.current = editor;
    setIsEditorReady(true);

    // Add placeholder text if value is empty
    if (!value && placeholder) {
      const placeholderDecoration = editor.createDecorationsCollection([
        {
          range: new monaco.Range(1, 1, 1, 1),
          options: {
            className: 'placeholder-text',
            after: {
              content: placeholder,
              inlineClassName: 'placeholder-inline',
            },
          },
        },
      ]);

      // Remove placeholder when user starts typing
      const disposable = editor.onDidChangeModelContent(() => {
        if (editor.getValue()) {
          placeholderDecoration.clear();
          disposable.dispose();
        }
      });
    }

    // Focus the editor
    editor.focus();
  };

  useEffect(() => {
    if (isEditorReady && editorRef.current) {
      // Scroll to bottom when value changes (useful for appending LLM responses)
      setTimeout(() => {
        const model = editorRef.current!.getModel();
        if (model) {
          const lineCount = model.getLineCount();
          editorRef.current!.revealLine(lineCount);
          editorRef.current!.setPosition({
            lineNumber: lineCount,
            column: model.getLineLength(lineCount) + 1,
          });
        }
      }, 100);
    }
  }, [value, isEditorReady]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <Editor
        height={height}
        language={language}
        theme={theme}
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
          readOnly,
          lineNumbers: 'on',
          folding: true,
          matchBrackets: 'always',
          renderWhitespace: 'selection',
          cursorBlinking: 'blink',
          cursorStyle: 'line',
          selectOnLineNumbers: true,
          roundedSelection: false,
          contextmenu: true,
          mouseWheelZoom: true,
          smoothScrolling: true,
          mouseWheelScrollSensitivity: 1,
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            useShadows: false,
            verticalHasArrows: false,
            horizontalHasArrows: false,
          },
        }}
      />
      <style jsx>{`
        .placeholder-text {
          opacity: 0.5;
          font-style: italic;
        }
        .placeholder-inline {
          opacity: 0.5;
          font-style: italic;
          pointer-events: none;
          user-select: none;
        }
      `}</style>
    </div>
  );
};

export default SharedMonacoEditor;
