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
  id?: string;
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
  const editorsRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    if (!gridRef.current) return;

    const editorsMap = new Map<string, any>();
    const editorsRefSnapshot = editorsRef.current;

    // Clean up previous grid instance
    if (gridInstanceRef.current) {
      editorsRef.current.forEach(root => {
        try {
          root.unmount();
        } catch (e) {
          console.warn('Error unmounting Monaco editor:', e);
        }
      });
      editorsRef.current.clear();
      gridInstanceRef.current.destroy(false);
      gridInstanceRef.current = null;
    }

    // Initialize GridStack with responsive options
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
          handle: '.grid-item-header',
          scroll: true,
          appendTo: 'body',
        },
      },
      gridRef.current
    );

    // Load items with Monaco editors
    if (items.length > 0) {
      items.forEach((item, index) => {
        const itemId = `monaco-item-${index}`;
        const widget = gridInstanceRef.current!.addWidget({
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          content: `
            <div class="monaco-grid-item" data-item-id="${itemId}">
              <div class="grid-item-header">
                <span class="language-tag">${item.language}</span>
                <span class="theme-tag">${item.theme}</span>
              </div>
              <div class="monaco-editor-container" id="editor-${itemId}" style="height: calc(100% - 30px);"></div>
            </div>
          `,
        });
      });

      // Initialize Monaco editors after a short delay to ensure DOM is ready
      setTimeout(() => {
        items.forEach((item, index) => {
          const itemId = `monaco-item-${index}`;
          const container = document.getElementById(`editor-${itemId}`);
          if (container) {
            // Create Monaco editor
            import('@monaco-editor/react').then(({ Editor }) => {
              import('react-dom/client').then(({ createRoot }) => {
                const root = createRoot(container);
                root.render(
                  <Editor
                    height="100%"
                    language={item.language}
                    theme={item.theme}
                    value={item.content}
                    options={{
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 14,
                      wordWrap: 'on',
                      automaticLayout: true,
                      readOnly: false,
                      lineNumbers: 'on',
                      folding: true,
                      matchBrackets: 'always',
                    }}
                    onChange={value => {
                      // Handle code changes
                      console.log(`Editor ${itemId} changed:`, value);
                    }}
                  />
                );
                editorsMap.set(itemId, root);
                editorsRef.current.set(itemId, root);
              });
            });
          }
        });
      }, 100);
    }

    // Force grid to recalculate dimensions when props change
    const updateGridDimensions = () => {
      if (gridInstanceRef.current) {
        setTimeout(() => {
          gridInstanceRef.current!.column(columns);
          gridInstanceRef.current!.cellHeight(cellHeight);
          gridInstanceRef.current!.margin(margin);

          // Trigger resize for Monaco editors
          editorsRef.current.forEach((root, itemId) => {
            const container = document.getElementById(`editor-${itemId}`);
            if (container) {
              window.dispatchEvent(new Event('resize'));
            }
          });
        }, 100);
      }
    };

    // Update dimensions immediately
    updateGridDimensions();

    // Listen for window resize
    window.addEventListener('resize', updateGridDimensions);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', updateGridDimensions);
      // Cleanup Monaco editors
      editorsRefSnapshot.forEach(root => {
        try {
          root.unmount();
        } catch (e) {
          console.warn('Error unmounting Monaco editor:', e);
        }
      });
      editorsRefSnapshot.clear();

      if (gridInstanceRef.current) {
        gridInstanceRef.current.destroy(false);
        gridInstanceRef.current = null;
      }
    };
  }, [columns, cellHeight, margin, animate, float, items]);

  return (
    <div
      ref={gridRef}
      className="grid-stack monaco-grid"
      style={{
        minHeight: '600px',
        width: '100%',
        aspectRatio: '8/11', // 8:11 ratio as requested
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '10px',
        backgroundColor: '#f5f5f5',
        overflow: 'auto',
      }}
    />
  );
};

// CSS styles for Monaco GridStack
const monacoGridStyles = `
  .monaco-grid .grid-stack-item {
    background: #fff;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    overflow: hidden;
  }

  .monaco-grid .grid-item-header {
    background: #f8f9fa;
    border-bottom: 1px solid #e9ecef;
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: move;
    font-size: 12px;
    font-weight: 500;
  }

  .monaco-grid .language-tag {
    background: #007acc;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
  }

  .monaco-grid .theme-tag {
    background: #28a745;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
  }

  .monaco-grid .monaco-editor-container {
    position: relative;
    overflow: hidden;
  }

  .monaco-grid .grid-stack-item-content {
    height: 100%;
    padding: 0;
  }

  .monaco-grid-item {
    height: 100%;
    display: flex;
    flex-direction: column;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = monacoGridStyles;
  document.head.appendChild(styleElement);
}

// Puck component configuration
export const MonacoGridStackBlock = {
  fields: {
    items: {
      type: 'array' as const,
      arrayFields: {
        content: {
          type: 'textarea' as const,
          placeholder: 'Enter your code here...',
        },
        language: {
          type: 'select' as const,
          options: [
            { label: 'JavaScript', value: 'javascript' },
            { label: 'TypeScript', value: 'typescript' },
            { label: 'Python', value: 'python' },
            { label: 'HTML', value: 'html' },
            { label: 'CSS', value: 'css' },
            { label: 'JSON', value: 'json' },
            { label: 'SQL', value: 'sql' },
            { label: 'Markdown', value: 'markdown' },
            { label: 'YAML', value: 'yaml' },
            { label: 'XML', value: 'xml' },
          ],
        },
        theme: {
          type: 'select' as const,
          options: [
            { label: 'VS Code Dark', value: 'vs-dark' },
            { label: 'VS Code Light', value: 'light' },
            { label: 'High Contrast', value: 'hc-black' },
          ],
        },
        x: { type: 'number' as const },
        y: { type: 'number' as const },
        w: { type: 'number' as const },
        h: { type: 'number' as const },
      },
    },
    columns: { type: 'number' as const },
    cellHeight: { type: 'number' as const },
    margin: { type: 'number' as const },
    animate: {
      type: 'select' as const,
      options: [
        { label: 'Yes', value: 'true' },
        { label: 'No', value: 'false' },
      ],
    },
    float: {
      type: 'select' as const,
      options: [
        { label: 'Yes', value: 'true' },
        { label: 'No', value: 'false' },
      ],
    },
  },
  defaultProps: {
    items: [
      {
        x: 0,
        y: 0,
        w: 6,
        h: 8,
        content: `// Welcome to Monaco Editor!\nfunction hello() {\n  console.log("Hello, World!");\n  return "Monaco Editor in GridStack!";\n}\n\nhello();`,
        language: 'javascript',
        theme: 'vs-dark',
      },
      {
        x: 6,
        y: 0,
        w: 6,
        h: 6,
        content: `# Monaco Editor Demo\n\nThis is a **Markdown** editor within a GridStack layout.\n\n- Drag to move\n- Resize handles on corners\n- Full Monaco features\n\n## Features:\n- Syntax highlighting\n- Code completion\n- Error detection\n- Multiple themes`,
        language: 'markdown',
        theme: 'light',
      },
      {
        x: 6,
        y: 6,
        w: 6,
        h: 4,
        content: `{\n  "name": "monaco-gridstack",\n  "version": "1.0.0",\n  "description": "Monaco Editor in GridStack",\n  "features": [\n    "Drag and drop",\n    "Resizable editors",\n    "Multiple languages",\n    "Theme support"\n  ]\n}`,
        language: 'json',
        theme: 'vs-dark',
      },
    ],
    columns: 12,
    cellHeight: 50,
    margin: 8,
    animate: 'true',
    float: 'true',
  },
  render: ({ items, columns, cellHeight, margin, animate, float }) => (
    <MonacoGridStackComponent
      items={items}
      columns={columns}
      cellHeight={cellHeight}
      margin={margin}
      animate={animate === 'true'}
      float={float === 'true'}
    />
  ),
};
