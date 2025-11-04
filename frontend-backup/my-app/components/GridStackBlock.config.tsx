import React from 'react';
import type { DropZone } from '@measured/puck';
import type { GridStackComponent } from './GridStackBlock';

export const GridStackBlockConfig = {
  fields: {
    children: {
      type: 'custom' as const,
      render: () => React.createElement(DropZone, { zone: 'grid-items' }),
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
  }) => React.createElement(GridStackComponent, {
    columns,
    cellHeight,
    margin,
    animate: animate === 'true',
    float: float === 'true',
    children,
  }),
};