import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import React, { useEffect, useRef } from 'react';
import { DropZone } from '@measured/puck';

interface GridStackComponentProps {
  children: React.ReactNode;
  columns: number;
  cellHeight: number;
  margin: number;
  animate: boolean;
  float: boolean;
}

export const GridStackComponent: React.FC<GridStackComponentProps> = ({
  children,
  columns = 12,
  cellHeight = 60,
  margin = 10,
  animate = true,
  float = true,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInstanceRef = useRef<GridStack | null>(null);

  useEffect(() => {
    if (!gridRef.current) return;

    gridInstanceRef.current = GridStack.init(
      {
        column: columns,
        cellHeight: cellHeight,
        margin: margin,
        animate: animate,
        float: float,
        acceptWidgets: true,
        removable: true,
        resizable: {
          handles: 'e,se,s,sw,w',
        },
        draggable: {
          handle: '.grid-stack-item-content',
          scroll: true,
          appendTo: 'body',
        },
      },
      gridRef.current
    );

    return () => {
      if (gridInstanceRef.current) {
        gridInstanceRef.current.destroy(false);
      }
    };
  }, [columns, cellHeight, margin, animate, float]);

  return (
    <div
      ref={gridRef}
      className="grid-stack"
      style={{
        minHeight: '400px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '10px',
        backgroundColor: '#f9f9f9',
      }}
    >
      {children}
    </div>
  );
};

export const GridStackBlock = {
  fields: {
    children: {
      type: 'custom',
      render: () => <DropZone zone="grid-items" />,
    },
    columns: { type: 'number' },
    cellHeight: { type: 'number' },
    margin: { type: 'number' },
    animate: {
      type: 'select',
      options: [
        { label: 'Yes', value: 'true' },
        { label: 'No', value: 'false' },
      ],
    },
    float: {
      type: 'select',
      options: [
        { label: 'Yes', value: 'true' },
        { label: 'No', value: 'false' },
      ],
    },
  },
  defaultProps: {
    children: null,
    columns: 12,
    cellHeight: 60,
    margin: 10,
    animate: 'true',
    float: 'true',
  },
  render: ({ children, columns, cellHeight, margin, animate, float }) => (
    <GridStackComponent
      columns={columns}
      cellHeight={cellHeight}
      margin={margin}
      animate={animate === 'true'}
      float={float === 'true'}
    >
      {children}
    </GridStackComponent>
  ),
};
