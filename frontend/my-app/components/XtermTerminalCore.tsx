'use client';

import { useEffect, useRef, useState } from 'react';
import 'xterm/css/xterm.css';

export default function XtermTerminalCore() {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<any>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (!containerRef.current) return;

    const initializeTerminal = async () => {
      const { Terminal } = await import('xterm');
      const { FitAddon } = await import('@xterm/addon-fit');

      const terminal = new Terminal({
        theme: { background: '#1e1e1e', foreground: '#ffffff' },
        cursorBlink: true,
        fontSize: 12,
        fontFamily: 'Monaco, monospace',
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);

      terminal.open(containerRef.current!);
      fitAddon.fit();

      // Get initial prompt
      const initialPrompt = await getPrompt();

      // Welcome message
      terminal.write('Welcome to the terminal\r\n' + initialPrompt);

      // Store terminal reference
      terminalRef.current = terminal;

      // Handle input
      let currentLine = '';
      let cursorPosition = 0;

      terminal.onData(async data => {
        const code = data.charCodeAt(0);

        if (code === 13) {
          // Enter
          terminal.write('\r\n');
          if (currentLine.trim()) {
            await executeCommand(currentLine.trim());
            setCommandHistory(prev => [...prev, currentLine.trim()]);
            setHistoryIndex(-1);
          }
          currentLine = '';
          cursorPosition = 0;
          const prompt = await getPrompt();
          terminal.write(prompt);
        } else if (code === 127) {
          // Backspace
          if (cursorPosition > 0) {
            currentLine =
              currentLine.slice(0, cursorPosition - 1) +
              currentLine.slice(cursorPosition);
            cursorPosition--;
            // Redraw the line
            const prompt = await getPrompt();
            terminal.write(
              '\r' +
                prompt +
                currentLine +
                ' \b'.repeat(currentLine.length - cursorPosition + 1)
            );
          }
        } else if (code === 27) {
          // Escape sequences (arrow keys)
          // Handle arrow keys for history navigation
          if (data === '\x1b[A') {
            // Up arrow
            if (commandHistory.length > 0) {
              const newIndex =
                historyIndex === -1
                  ? commandHistory.length - 1
                  : Math.max(0, historyIndex - 1);
              setHistoryIndex(newIndex);
              currentLine = commandHistory[newIndex];
              cursorPosition = currentLine.length;
              const prompt = await getPrompt();
              terminal.write('\r' + prompt + currentLine);
            }
          } else if (data === '\x1b[B') {
            // Down arrow
            if (historyIndex >= 0) {
              const newIndex = historyIndex + 1;
              if (newIndex >= commandHistory.length) {
                setHistoryIndex(-1);
                currentLine = '';
                cursorPosition = 0;
                const prompt = await getPrompt();
                terminal.write('\r' + prompt);
              } else {
                setHistoryIndex(newIndex);
                currentLine = commandHistory[newIndex];
                cursorPosition = currentLine.length;
                const prompt = await getPrompt();
                terminal.write('\r' + prompt + currentLine);
              }
            }
          }
        } else if (code >= 32) {
          // Printable characters
          currentLine =
            currentLine.slice(0, cursorPosition) +
            data +
            currentLine.slice(cursorPosition);
          cursorPosition++;
          terminal.write(data);
        }
      });

      // Handle resize
      const resizeObserver = new ResizeObserver(() => fitAddon.fit());
      resizeObserver.observe(containerRef.current!);

      // Focus the terminal
      terminal.focus();

      return () => {
        resizeObserver.disconnect();
        terminal.dispose();
      };
    };

    const getPrompt = async () => {
      try {
        const response = await fetch('/api/prompt');
        const result = await response.json();
        return result.prompt;
      } catch (error) {
        return '$ ';
      }
    };

    const executeCommand = async (command: string) => {
      try {
        const response = await fetch('/api/terminal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ command }),
        });

        const result = await response.json();

        if (response.ok) {
          terminalRef.current.write(result.output + '\r\n');
        } else {
          terminalRef.current.write(`Error: ${result.error}\r\n`);
        }
      } catch (error) {
        terminalRef.current.write(`Command failed: ${error}\r\n`);
      }
    };

    initializeTerminal();
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
}
