import React from 'react';
import { MonacoEditorComponent } from './MonacoEditorBlock';

export const MonacoGridStackBlock = {
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
    x: { type: 'number' },
    y: { type: 'number' },
    w: { type: 'number' },
    h: { type: 'number' },
  },
  defaultProps: {
    language: 'javascript',
    value: 'console.log("Hello, world!");',
    height: '100%',
    x: 0,
    y: 0,
    w: 4,
    h: 4,
  },
  render: ({ language, value, height, x, y, w, h }) => (
    <div
      className="grid-stack-item"
      gs-x={x}
      gs-y={y}
      gs-w={w}
      gs-h={h}
    >
      <div className="grid-stack-item-content">
        <MonacoEditorComponent
          language={language}
          value={value}
          height={height}
        />
      </div>
    </div>
  ),
};
