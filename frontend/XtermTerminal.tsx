import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';

export const XtermTerminal = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      const terminal = new Terminal({
        theme: {
          background: '#1e1e1e',
          foreground: '#ffffff',
        },
      });

      terminal.open(containerRef.current);
      terminal.write('Welcome to the terminal\r\n');
      terminal.write('$ ');

      return () => {
        terminal.dispose();
      };
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#1e1e1e',
      }}
    />
  );
};
