import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import React, { useEffect, useRef } from 'react';

interface MonacoGridStackItem {
  x: number;
  y: number;
  w: number;
  h: number;
  content: string;
  language: string;
  theme: string;
}

interface MonacoGridStackProps {
  items: MonacoGridStackItem[];
  columns: number;
  cellHeight: number;
  margin: number;
  animate: boolean;
  float: boolean;
}

export const MonacoGridStackComponent: React.FC<MonacoGridStackProps> = ({
  items = [],
  columns = 12,
  cellHeight = 60,
  margin = 10,
  animate = true,
  float = true,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInstanceRef = useRef<GridStack | null>(null);

  useEffect(() => {
    if (!gridRef.current || !items.length) return;

    const gridElement = gridRef.current;

    // Clean up existing grid
    if (gridInstanceRef.current) {
      gridInstanceRef.current.destroy(false);
    }

    // Initialize GridStack
    gridInstanceRef.current = GridStack.init(
      {
        column: columns,
        cellHeight: cellHeight,
        margin: margin,
        animate: animate,
        float: float,
        acceptWidgets: false,
        removable: false,
        resizable: {
          handles: 'e,se,s,sw,w',
        },
        draggable: {
          handle: '.monaco-header',
          scroll: true,
        },
      },
      gridElement
    );

    // Add each Monaco editor as a grid item
    items.forEach((item, index) => {
      const itemId = `monaco-${index}`;
      gridInstanceRef.current!.addWidget({
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        content: `<div class="monaco-wrapper" id="${itemId}"></div>`,
      });

      // Render Monaco editor into the widget
      setTimeout(() => {
        const container = document.getElementById(itemId);
        if (container) {
          const editorContainer = document.createElement('div');
          editorContainer.className = 'monaco-editor-wrapper';
          editorContainer.innerHTML = `
            <div class="monaco-header">
              <span class="lang-badge">${item.language}</span>
              <span class="theme-badge">${item.theme}</span>
            </div>
            <div class="monaco-editor-container"></div>
          `;
          container.appendChild(editorContainer);

          const editorDiv = editorContainer.querySelector(
            '.monaco-editor-container'
          ) as HTMLElement;
          if (editorDiv) {
            // Use Monaco directly
            import('monaco-editor').then(monaco => {
              const editor = monaco.editor.create(editorDiv, {
                value: item.content,
                language: item.language,
                theme: item.theme,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                wordWrap: 'on',
                automaticLayout: true,
                lineNumbers: 'on',
                folding: true,
              });

              // Store editor reference for cleanup
              (container as any)._monacoEditor = editor;
            });
          }
        }
      }, 50);
    });

    // Cleanup function
    return () => {
      // Clean up Monaco editors
      const widgets = gridElement.querySelectorAll('.monaco-wrapper');
      widgets.forEach((widget: any) => {
        if (widget._monacoEditor) {
          widget._monacoEditor.dispose();
        }
      });

      if (gridInstanceRef.current) {
        gridInstanceRef.current.destroy(false);
        gridInstanceRef.current = null;
      }
    };
  }, [items, columns, cellHeight, margin, animate, float]);

  return (
    <>
      <style jsx>{`
        .monaco-wrapper {
          height: 100%;
          background: #fff;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .monaco-editor-wrapper {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .monaco-header {
          background: #f8f9fa;
          border-bottom: 1px solid #e9ecef;
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
          cursor: move;
          font-size: 12px;
        }
        .lang-badge {
          background: #007acc;
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
        }
        .theme-badge {
          background: #28a745;
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
        }
        .monaco-editor-container {
          flex: 1;
          min-height: 200px;
        }
      `}</style>
      <div
        ref={gridRef}
        className="grid-stack monaco-grid"
        style={{
          width: '100%',
          aspectRatio: '8/11', // 8:11 ratio as requested
          minHeight: '600px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '10px',
          backgroundColor: '#f5f5f5',
        }}
      />
    </>
  );
};
