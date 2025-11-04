'use client';

import { useEffect, useState } from 'react';

type ToolItem = {
  name: string;
  description?: string;
  roles?: string[];
};

type ServerItem = {
  name: string;
  url?: string;
};

export default function RoleMcpSelector({
  roleId,
  proxyBaseUrl = 'http://localhost:9090',
  mcpAdminUrl = 'http://localhost:8080',
  rolesServiceUrl = 'http://localhost:4600',
}: {
  roleId: string;
  proxyBaseUrl?: string;
  mcpAdminUrl?: string;
  rolesServiceUrl?: string;
}) {
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [selectedServers, setSelectedServers] = useState<
    Record<string, boolean>
  >({});
  const [toolsByServer, setToolsByServer] = useState<
    Record<string, ToolItem[]>
  >({});
  const [proxyTools, setProxyTools] = useState<ToolItem[]>([]);
  const [selectedTools, setSelectedTools] = useState<Record<string, boolean>>(
    {}
  );
  const [loadingServers, setLoadingServers] = useState(false);
  const [serverStatus, setServerStatus] = useState<
    Record<string, 'up' | 'down' | 'unknown'>
  >({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadServers = async () => {
      setLoadingServers(true);
      try {
        // Attempt to fetch servers from MCPJungle admin API
        const res = await fetch(`${mcpAdminUrl}/api/v0/servers`);
        if (!res.ok) throw new Error(`Failed to fetch servers: ${res.status}`);
        const data = await res.json();
        // Normalize possible shapes: array of { name } or { servers: [...] }
        let list: any[] = [];
        if (Array.isArray(data)) list = data;
        else if (Array.isArray(data.servers)) list = data.servers;
        else if (Array.isArray(data.items)) list = data.items;
        else list = data;

        const normalized: ServerItem[] = (list || []).map((s: any) => ({
          name: s.name || s.id || s.server || s.hostname || String(s),
          url: s.url || s.baseUrl,
        }));
        setServers(normalized);
      } catch (err) {
        console.warn('RoleMcpSelector: failed to load servers', err);
        setServers([]);
      } finally {
        setLoadingServers(false);
      }
    };
    loadServers();

    // load existing assignments for this role and proxy internal tools
    const loadAssignmentsAndProxy = async () => {
      try {
        // load existing role assignments
        const r = await fetch(
          `${rolesServiceUrl}/roles/${encodeURIComponent(roleId)}/tools`
        );
        if (r.ok) {
          const body = await r.json();
          const assigned: string[] = body.tools || [];
          const sel: Record<string, boolean> = {};
          const serverSel: Record<string, boolean> = {};
          assigned.forEach(t => {
            // expected format server/tool or proxy-internal tool name
            if (t.includes('/')) {
              sel[t] = true;
              const [server] = t.split('/');
              serverSel[server] = true;
            } else {
              // proxy internal tool, mark as selected with proxy key
              sel[`_proxy/${t}`] = true;
            }
          });
          setSelectedTools(sel);
          setSelectedServers(prev => ({ ...prev, ...serverSel }));
        }
      } catch (err) {
        // ignore
      }

      try {
        // attempt to fetch proxy's own tools (if exposed)
        const p = await fetch(`${proxyBaseUrl}/tools`);
        if (p.ok) {
          const data = await p.json();
          let list: any[] = [];
          if (Array.isArray(data)) list = data;
          else if (Array.isArray(data.tools)) list = data.tools;
          else list = data;
          const tools: ToolItem[] = (list || []).map((t: any) => ({
            name: t.name || t.id || String(t),
            description: t.description || t.desc,
          }));
          setProxyTools(tools);
        }
      } catch (err) {
        // proxy may not expose internal tools endpoint; that's fine
      }
    };
    loadAssignmentsAndProxy();
  }, [mcpAdminUrl, proxyBaseUrl, rolesServiceUrl, roleId]);

  // probe server health (best-effort) and update status map
  useEffect(() => {
    const controllers: Record<string, AbortController> = {};
    const probe = async (s: ServerItem) => {
      if (!s || !s.url)
        return setServerStatus(prev => ({ ...prev, [s.name]: 'unknown' }));
      const url = s.url.replace(/\/$/, '') || s.url;
      const targets = [url, `${url}/health`, `${url}/api/health`];
      setServerStatus(prev => ({ ...prev, [s.name]: 'unknown' }));
      for (const t of targets) {
        try {
          const c = new AbortController();
          controllers[s.name] = c;
          const res = await fetch(t, { method: 'GET', signal: c.signal });
          if (res.ok) {
            setServerStatus(prev => ({ ...prev, [s.name]: 'up' }));
            return;
          }
        } catch (e) {
          // try next
        }
      }
      setServerStatus(prev => ({ ...prev, [s.name]: 'down' }));
    };

    servers.forEach(s => probe(s));

    return () => {
      Object.values(controllers).forEach(c => c.abort());
    };
  }, [servers]);

  useEffect(() => {
    // whenever selectedServers changes, fetch tools for newly selected servers
    Object.keys(selectedServers).forEach(serverName => {
      if (selectedServers[serverName] && !toolsByServer[serverName]) {
        fetchToolsForServer(serverName);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServers]);

  const fetchToolsForServer = async (serverName: string) => {
    try {
      const safeName = encodeURIComponent(serverName);
      const res = await fetch(
        `${mcpAdminUrl}/api/v0/servers/${safeName}/tools`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Normalize: data may be { tools: [...] } or array
      let list: any[] = [];
      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data.tools)) list = data.tools;
      else if (Array.isArray(data.items)) list = data.items;
      else list = data;

      const tools: ToolItem[] = (list || []).map((t: any) => ({
        name: t.name || t.id || String(t),
        description: t.description || t.desc,
        roles: t.roles || [],
      }));
      setToolsByServer(prev => ({ ...prev, [serverName]: tools }));
    } catch (err) {
      console.warn('Failed to fetch tools for', serverName, err);
      setToolsByServer(prev => ({ ...prev, [serverName]: [] }));
    }
  };

  const toggleServer = (name: string) => {
    setSelectedServers(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleTool = (server: string, toolName: string) => {
    const key = `${server}/${toolName}`;
    setSelectedTools(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveAssignments = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const tools = Object.keys(selectedTools).filter(k => selectedTools[k]);
      // PUT /roles/:id/tools expects an array of tool names (we'll send server/tool)
      const res = await fetch(
        `${rolesServiceUrl}/roles/${encodeURIComponent(roleId)}/tools`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tools),
        }
      );
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Save failed ${res.status}: ${body}`);
      }
      const data = await res.json();
      setMessage('Saved assignments');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save role tools', err);
      setMessage('Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        width: 280,
        fontSize: 11,
        padding: '8px',
        background: '#1f1f1f',
        border: '1px solid #2b2b2b',
        borderRadius: 6,
        marginTop: 6,
        color: '#eee',
      }}
    >
      {/* compact utilitarian panel - no title to save vertical space */}

      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <div style={{ fontSize: 10, color: '#9ab' }}>Role</div>
        <div style={{ flex: 1, fontSize: 12, fontFamily: 'monospace' }}>
          {roleId}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
        <div style={{ fontSize: 10, color: '#bbb' }}>MCP Servers</div>
        <div style={{ maxHeight: 120, overflow: 'auto', paddingRight: 6 }}>
          {loadingServers ? (
            <div style={{ color: '#999', fontSize: 11 }}>Loading…</div>
          ) : servers.length === 0 ? (
            <div style={{ color: '#777', fontSize: 11 }}>No servers</div>
          ) : (
            servers.map(s => (
              <div
                key={s.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 0',
                }}
              >
                <input
                  type="checkbox"
                  checked={!!selectedServers[s.name]}
                  onChange={() => toggleServer(s.name)}
                  style={{ margin: 0 }}
                />
                <div style={{ flex: 1, fontSize: 11, color: '#eee' }}>
                  {s.name}
                </div>
                <div
                  title={serverStatus[s.name] || 'unknown'}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 6,
                    background:
                      serverStatus[s.name] === 'up'
                        ? '#2ecc71'
                        : serverStatus[s.name] === 'down'
                        ? '#e74c3c'
                        : '#777',
                  }}
                />
              </div>
            ))
          )}
        </div>

        <div style={{ fontSize: 10, color: '#bbb' }}>Tools</div>
        <div style={{ maxHeight: 220, overflow: 'auto', paddingRight: 6 }}>
          {/* proxy internal tools compact */}
          {proxyTools.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ color: '#9aa', fontSize: 10 }}>proxy</div>
              {proxyTools.map(t => (
                <label
                  key={t.name}
                  style={{
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                    fontSize: 11,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!selectedTools[`_proxy/${t.name}`]}
                    onChange={() =>
                      setSelectedTools(prev => ({
                        ...prev,
                        [`_proxy/${t.name}`]: !prev[`_proxy/${t.name}`],
                      }))
                    }
                    style={{ margin: 0 }}
                  />
                  <div style={{ color: '#eee' }}>{t.name}</div>
                </label>
              ))}
            </div>
          )}

          {Object.entries(toolsByServer).map(([server, tools]) => (
            <div key={server} style={{ marginBottom: 6 }}>
              <div style={{ color: '#9aa', fontSize: 10 }}>{server}</div>
              {tools.length === 0 ? (
                <div style={{ color: '#666', fontSize: 10 }}>No tools</div>
              ) : (
                tools.map(t => (
                  <label
                    key={t.name}
                    style={{
                      display: 'flex',
                      gap: 6,
                      alignItems: 'center',
                      fontSize: 11,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!selectedTools[`${server}/${t.name}`]}
                      onChange={() => toggleTool(server, t.name)}
                      style={{ margin: 0 }}
                    />
                    <div style={{ color: '#eee' }}>{t.name}</div>
                  </label>
                ))
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={saveAssignments}
            disabled={saving}
            style={{
              background: '#1177bb',
              color: 'white',
              border: 'none',
              padding: '6px 8px',
              borderRadius: 4,
              fontSize: 11,
              cursor: saving ? 'default' : 'pointer',
              flex: 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          {message && (
            <div style={{ color: '#9ad', fontSize: 11 }}>{message}</div>
          )}
        </div>
      </div>
    </div>
  );
}
