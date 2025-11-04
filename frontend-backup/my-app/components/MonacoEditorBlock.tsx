
import Editor from '@monaco-editor/react';
import React from 'react';

interface MonacoEditorComponentProps {
  language: string;
  value: string;
  height: string | number;
}

export const MonacoEditorComponent: React.FC<MonacoEditorComponentProps> = ({
  language = 'javascript',
  value = '// some comment',
  height = '30vh',
}) => {
  return (
    <Editor
      height={height}
      defaultLanguage={language}
      defaultValue={value}
    />
  );
};

export const MonacoEditorBlock = {
  fields: {
    language: {
      type: 'select',
      options: [
        { label: 'JavaScript', value: 'javascript' },
        { label: 'TypeScript', value: 'typescript' },
        { label: 'HTML', value: 'html' },
        { label: 'CSS', value: 'css' },
        { label: 'JSON', value: 'json' },
      ],
    },
    value: { type: 'textarea' },
    height: { type: 'text' },
  },
  defaultProps: {
    language: 'javascript',
    value: 'console.log("Hello, world!");',
    height: '30vh',
  },
  render: ({ language, value, height }) => (
    <MonacoEditorComponent
      language={language}
      value={value}
      height={height}
    />
  ),
};
