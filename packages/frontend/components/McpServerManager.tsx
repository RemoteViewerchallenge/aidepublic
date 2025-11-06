'use client';

import React, { useEffect, useState } from 'react';

type McpServer = {
  id: string;
  name: string;
  description?: string;
  transport: 'stdio' | 'streamable_http';
  url?: string;
  command?: string;
  args?: string[];
  ui_url?: string; // For linking to the server's own UI
};

// A more specific type for the data we expect from the MCPJungle API
type McpApiServer = {
  id?: string;
  name: string;
  description?: string;
  transport: 'stdio' | 'streamable_http';
  url?: string;
  command?: string;
  args?: string[];
};

export default function McpServerManager({
  mcpAdminUrl = 'http://localhost:8080',
}: {
  mcpAdminUrl?: string;
}) {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTransport, setNewTransport] = useState<'stdio' | 'streamable_http'>(
    'streamable_http'
  );
  const [newUrl, setNewUrl] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [newArgs, setNewArgs] = useState('');

  const fetchServers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${mcpAdminUrl}/api/v0/servers`);
      if (!res.ok) throw new Error(`Failed to fetch servers: ${res.status}`);
      const data = (await res.json()) as McpApiServer[];
      const normalized: McpServer[] = data.map(s => ({
        id: s.id || s.name,
        name: s.name,
        description: s.description,
        transport: s.transport,
        url: s.url,
        command: s.command,
        args: s.args,
        // Heuristic to find the UI for servers like Lootbox
        ui_url: s.url ? s.url.replace(/\/mcp\/?$/, '/ui') : undefined,
      }));
      setServers(normalized);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Failed to load MCP servers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, [mcpAdminUrl]);

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: {
      name: string;
      description: string;
      transport: 'stdio' | 'streamable_http';
      url?: string;
      command?: string;
      args?: string[];
    } = {
      name: newName,
      description: newDescription,
      transport: newTransport,
    };

    if (newTransport === 'streamable_http') {
      payload.url = newUrl;
    } else {
      payload.command = newCommand;
      payload.args = newArgs.split('\n').filter(arg => arg.trim() !== '');
    }

    try {
      const res = await fetch(`${mcpAdminUrl}/api/v0/servers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Failed to add server: ${res.status} ${errorBody}`);
      }

      // Reset form and refresh list
      setShowAddForm(false);
      setNewName('');
      setNewDescription('');
      setNewUrl('');
      setNewCommand('');
      setNewArgs('');
      await fetchServers();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    }
  };

  const handleDeleteServer = async (serverId: string) => {
    if (!confirm(`Are you sure you want to delete the server "${serverId}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${mcpAdminUrl}/api/v0/servers/${encodeURIComponent(serverId)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Failed to delete server: ${res.status} ${errorBody}`);
      }
      await fetchServers();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    }
  };

  const renderAddForm = () => (
    <div style={{ border: '1px solid #444', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
      <h3 style={{ marginTop: 0 }}>Add New MCP Server</h3>
      <form onSubmit={handleAddServer} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input type="text" placeholder="Name (e.g., 'my-github-mcp')" value={newName} onChange={e => setNewName(e.target.value)} required style={inputStyle} />
        <input type="text" placeholder="Description" value={newDescription} onChange={e => setNewDescription(e.target.value)} style={inputStyle} />
        <select
          value={newTransport}
          onChange={e =>
            setNewTransport(e.target.value as 'stdio' | 'streamable_http')
          }
          style={inputStyle}>
          <option value="streamable_http">Streamable HTTP</option>
          <option value="stdio">STDIO</option>
        </select>
        {newTransport === 'streamable_http' ? (
          <input type="text" placeholder="URL (e.g., http://host.docker.internal:9090/lootbox/mcp)" value={newUrl} onChange={e => setNewUrl(e.target.value)} required style={inputStyle} />
        ) : (
          <>
            <input type="text" placeholder="Command (e.g., 'npx')" value={newCommand} onChange={e => setNewCommand(e.target.value)} required style={inputStyle} />
            <textarea placeholder="Arguments (one per line)" value={newArgs} onChange={e => setNewArgs(e.target.value)} style={{ ...inputStyle, height: '60px' }} />
          </>
        )}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" style={buttonStyle}>Add Server</button>
          <button type="button" onClick={() => setShowAddForm(false)} style={{ ...buttonStyle, background: '#555' }}>Cancel</button>
        </div>
      </form>
    </div>
  );

  return (
    <div style={{ background: '#2a2a2a', color: 'white', padding: '1rem', borderRadius: '8px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>MCP Server Management</h2>
        <button onClick={() => setShowAddForm(!showAddForm)} style={buttonStyle}>
          {showAddForm ? 'Cancel' : '+ Add Server'}
        </button>
      </div>

      {error && <div style={{ color: '#ff8a8a', background: '#5c2a2a', padding: '0.5rem', borderRadius: '4px', margin: '1rem 0' }}>Error: {error}</div>}

      {showAddForm && renderAddForm()}

      <div style={{ marginTop: '1rem' }}>
        {loading ? (
          <p>Loading servers...</p>
        ) : servers.length === 0 && !error ? (
          <p>No MCP servers registered.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {servers.map(server => (
              <li key={server.id} style={{ background: '#3a3a3a', padding: '0.75rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{server.name}</div>
                  <div style={{ fontSize: '0.8em', color: '#ccc', marginTop: '4px' }}>{server.description || 'No description'}</div>
                  <div style={{ fontSize: '0.75em', color: '#aaa', marginTop: '4px', fontFamily: 'monospace' }}>
                    {server.transport === 'streamable_http' ? server.url : `${server.command} ${server.args?.join(' ')}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {server.ui_url && (
                    <a href={server.ui_url} target="_blank" rel="noopener noreferrer" style={{ ...buttonStyle, background: '#2a6a3d', textDecoration: 'none' }}>
                      UI
                    </a>
                  )}
                  <button onClick={() => handleDeleteServer(server.id)} style={{ ...buttonStyle, background: '#a03d3d' }}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#1e1e1e',
  color: 'white',
  border: '1px solid #555',
  borderRadius: '4px',
  padding: '0.5rem',
  fontSize: '0.9em',
};

const buttonStyle: React.CSSProperties = {
  background: '#007acc',
  color: 'white',
  border: 'none',
  padding: '0.5rem 1rem',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.9em',
  whiteSpace: 'nowrap',
};
