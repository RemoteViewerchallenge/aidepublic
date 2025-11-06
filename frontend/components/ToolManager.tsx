'use client';

import { useState } from 'react';
import { trpc } from '../utils/trpc';

interface McpServer {
  id: string;
  url: string;
  tools: Tool[];
}

interface Tool {
  id: string;
  name: string;
  description: string;
}

interface ToolManagerProps {
  onToolsChange: (toolIds: string[]) => void;
}

export default function ToolManager({ onToolsChange }: ToolManagerProps) {
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [newServerUrl, setNewServerUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

  const addMcpServer = async () => {
    setIsLoading(true);
    try {
      const tools = await trpc.mcp.getTools.query({ url: newServerUrl });
      const newServer: McpServer = {
        id: Date.now().toString(),
        url: newServerUrl,
        tools,
      };
      setMcpServers([...mcpServers, newServer]);
      setNewServerUrl('');
    } catch (error) {
      console.error('Failed to fetch tools from MCP server:', error);
      alert('Failed to fetch tools. Check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToolSelection = (toolId: string) => {
    setSelectedTools((prevSelectedTools) => {
      if (prevSelectedTools.includes(toolId)) {
        return prevSelectedTools.filter((id) => id !== toolId);
      } else {
        return [...prevSelectedTools, toolId];
      }
    });
  };

  return (
    <div style={{ border: '1px solid #333', padding: '15px', borderRadius: '8px', background: '#2d2d2d' }}>
      <h3 style={{ marginTop: 0 }}>🔧 Tool Manager</h3>
      <div style={{ marginBottom: '15px' }}>
        <input
          type="text"
          value={newServerUrl}
          onChange={(e) => setNewServerUrl(e.target.value)}
          placeholder="Enter MCP Server URL"
          style={{
            width: 'calc(100% - 110px)',
            padding: '8px',
            background: '#3c3c3c',
            border: '1px solid #444',
            borderRadius: '4px',
            color: '#fff',
          }}
        />
        <button
          onClick={addMcpServer}
          disabled={isLoading}
          style={{
            width: '100px',
            padding: '8px',
            border: 'none',
            background: '#007acc',
            color: 'white',
            borderRadius: '4px',
            marginLeft: '10px',
            cursor: 'pointer',
          }}
        >
          {isLoading ? 'Adding...' : 'Add Server'}
        </button>
      </div>
      <div>
        {mcpServers.map((server) => (
          <div key={server.id} style={{ border: '1px solid #444', padding: '10px', borderRadius: '4px', marginBottom: '10px', background: '#3c3c3c' }}>
            <strong>{server.url}</strong>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '10px' }}>
              {server.tools.map((tool) => (
                <li key={tool.id} style={{ marginBottom: '5px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
                    <input
                      type="checkbox"
                      checked={selectedTools.includes(tool.id)}
                      onChange={() => handleToolSelection(tool.id)}
                      style={{ marginRight: '10px' }}
                    />
                    <span>
                      <strong>{tool.name}</strong> - {tool.description}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <button
        onClick={() => onToolsChange(selectedTools)}
        style={{
          marginTop: '10px',
          padding: '8px 16px',
          border: 'none',
          background: '#28a745',
          color: 'white',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Save Tools
      </button>
    </div>
  );
}