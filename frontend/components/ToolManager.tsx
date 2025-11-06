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

export default function ToolManager() {
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [newServerUrl, setNewServerUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginTop: '20px' }}>
      <h2>🔧 Tool Manager</h2>
      <div style={{ marginBottom: '15px' }}>
        <input
          type="text"
          value={newServerUrl}
          onChange={(e) => setNewServerUrl(e.target.value)}
          placeholder="Enter MCP Server URL"
          style={{ width: 'calc(100% - 100px)', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
        <button
          onClick={addMcpServer}
          disabled={isLoading}
          style={{ width: '90px', padding: '8px', border: 'none', background: '#007acc', color: 'white', borderRadius: '4px', marginLeft: '10px' }}
        >
          {isLoading ? 'Adding...' : 'Add Server'}
        </button>
      </div>
      <div>
        {mcpServers.map((server) => (
          <div key={server.id} style={{ border: '1px solid #eee', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
            <strong>{server.url}</strong>
            <ul>
              {server.tools.map((tool) => (
                <li key={tool.id}>
                  {tool.name} - {tool.description}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}