'use client';

import dynamic from 'next/dynamic';

const XtermTerminal = dynamic(() => import('@/components/XtermTerminalCore'), {
  ssr: false,
  loading: () => <div className="text-white p-4">Loading terminal...</div>,
});

export default XtermTerminal;
