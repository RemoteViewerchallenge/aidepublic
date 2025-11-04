import React from 'react';
import { DropZone } from '@measured/puck';
import { GridStackComponent } from './GridStackComponent';

interface GridStackBlockRenderProps {
  children: React.ReactNode;
  columns: number;
  cellHeight: number;
  margin: number;
  animate: string;
  float: string;
}

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
  render: ({
    children,
    columns,
    cellHeight,
    margin,
    animate,
    float,
  }: {
    children: React.ReactNode;
    columns: number;
    cellHeight: number;
    margin: number;
    animate: string;
    float: string;
  }) => (
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
export { GridStackComponent };

