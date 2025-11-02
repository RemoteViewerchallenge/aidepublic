'use client';

import { useEffect, useState } from 'react';

// Simple types
interface Role {
  id: string;
  title: string;
  prompt: string;
  parameters: {
    minContext?: number;
    maxContext?: number;
    hasTools?: boolean;
    vision?: boolean;
    embed?: boolean;
  };
}

interface ModelStats {
  total: number;
  matching: number;
  byProvider: Record<string, number>;
}

// Test API function
const testAPI = async (): Promise<any> => {
  try {
    const response = await fetch(
      'http://localhost:3000/api/trpc/getModelsFromDatabase'
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.result?.data || data; // Handle tRPC response format
  } catch (error) {
    console.error('API Test Failed:', error);
    return null;
  }
};

// Get model statistics
const getModelStats = async (
  parameters: Role['parameters']
): Promise<ModelStats> => {
  try {
    const models = await testAPI();
    if (!models || !Array.isArray(models)) {
      return { total: 0, matching: 0, byProvider: {} };
    }

    // Filter models based on parameters
    const matchingModels = models.filter((model: any) => {
      if (parameters.minContext && model.contextLength < parameters.minContext)
        return false;
      if (parameters.maxContext && model.contextLength > parameters.maxContext)
        return false;
      if (parameters.hasTools && !model.capabilities?.toolCalling) return false;
      if (parameters.vision && !model.capabilities?.vision) return false;
      if (parameters.embed && !model.capabilities?.embedding) return false;
      return true;
    });

    // Count by provider
    const byProvider: Record<string, number> = {};
    matchingModels.forEach((model: any) => {
      byProvider[model.provider] = (byProvider[model.provider] || 0) + 1;
    });

    return {
      total: models.length,
      matching: matchingModels.length,
      byProvider,
    };
  } catch (error) {
    console.error('❌ Error getting model stats:', error);
    return { total: 0, matching: 0, byProvider: {} };
  }
};

export default function RoleManager() {
  const [currentRole, setCurrentRole] = useState<Role>({
    id: 'default',
    title: 'Assistant',
    prompt: 'You are a helpful AI assistant.',
    parameters: {
      minContext: 4000,
      maxContext: 100000,
      hasTools: false,
      vision: false,
      embed: false,
    },
  });

  const [modelStats, setModelStats] = useState<ModelStats>({
    total: 0,
    matching: 0,
    byProvider: {},
  });

  const [apiStatus, setApiStatus] = useState<string>('Testing...');
  const [savedRoles, setSavedRoles] = useState<Role[]>([]);

  // Test API connection on mount
  useEffect(() => {
    const testConnection = async () => {
      const result = await testAPI();
      if (result) {
        setApiStatus(
          `✅ Connected: ${
            Array.isArray(result) ? result.length : 'Unknown'
          } models`
        );
      } else {
        setApiStatus('❌ API connection failed');
      }
    };
    testConnection();
  }, []);

  // Update model stats when parameters change
  useEffect(() => {
    const updateStats = async () => {
      const stats = await getModelStats(currentRole.parameters);
      setModelStats(stats);
    };
    updateStats();
  }, [currentRole.parameters]);

  // Load saved roles
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('workspace-roles') || '[]');
      setSavedRoles(saved);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  }, []);

  const updateRoleParameter = (key: keyof Role['parameters'], value: any) => {
    setCurrentRole({
      ...currentRole,
      parameters: {
        ...currentRole.parameters,
        [key]: value,
      },
    });
  };

  const saveRole = () => {
    try {
      const roleToSave = { ...currentRole, id: Date.now().toString() };
      const updated = [...savedRoles, roleToSave];
      setSavedRoles(updated);
      localStorage.setItem('workspace-roles', JSON.stringify(updated));
      alert('Role saved successfully!');
    } catch (error) {
      console.error('Failed to save role:', error);
      alert('Failed to save role');
    }
  };

  const loadRole = (role: Role) => {
    setCurrentRole(role);
  };

  const deleteRole = (roleId: string) => {
    const updated = savedRoles.filter(r => r.id !== roleId);
    setSavedRoles(updated);
    localStorage.setItem('workspace-roles', JSON.stringify(updated));
  };

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'monospace',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <h1>🎭 Role Manager</h1>

      {/* API Status */}
      <div
        style={{
          background: apiStatus.includes('✅') ? '#d4edda' : '#f8d7da',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: `1px solid ${
            apiStatus.includes('✅') ? '#c3e6cb' : '#f5c6cb'
          }`,
        }}
      >
        <strong>API Status:</strong> {apiStatus}
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}
      >
        {/* Current Role Editor */}
        <div
          style={{
            border: '1px solid #ddd',
            padding: '15px',
            borderRadius: '8px',
          }}
        >
          <h2>Current Role</h2>

          <div style={{ marginBottom: '15px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: 'bold',
              }}
            >
              Role Title:
            </label>
            <input
              type="text"
              value={currentRole.title}
              onChange={e =>
                setCurrentRole({ ...currentRole, title: e.target.value })
              }
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '5px',
                fontWeight: 'bold',
              }}
            >
              Base Prompt:
            </label>
            <textarea
              value={currentRole.prompt}
              onChange={e =>
                setCurrentRole({ ...currentRole, prompt: e.target.value })
              }
              rows={4}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Parameters */}
          <h3>Model Filtering Parameters</h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '15px',
            }}
          >
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Min Context:
              </label>
              <input
                type="number"
                value={currentRole.parameters.minContext || ''}
                onChange={e =>
                  updateRoleParameter(
                    'minContext',
                    parseInt(e.target.value) || undefined
                  )
                }
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>
                Max Context:
              </label>
              <input
                type="number"
                value={currentRole.parameters.maxContext || ''}
                onChange={e =>
                  updateRoleParameter(
                    'maxContext',
                    parseInt(e.target.value) || undefined
                  )
                }
                style={{
                  width: '100%',
                  padding: '6px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '10px',
              marginBottom: '15px',
            }}
          >
            <label
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <input
                type="checkbox"
                checked={currentRole.parameters.hasTools || false}
                onChange={e =>
                  updateRoleParameter('hasTools', e.target.checked)
                }
              />
              Tool Calling
            </label>
            <label
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <input
                type="checkbox"
                checked={currentRole.parameters.vision || false}
                onChange={e => updateRoleParameter('vision', e.target.checked)}
              />
              Vision
            </label>
            <label
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <input
                type="checkbox"
                checked={currentRole.parameters.embed || false}
                onChange={e => updateRoleParameter('embed', e.target.checked)}
              />
              Embedding
            </label>
          </div>

          <button
            onClick={saveRole}
            style={{
              background: '#007acc',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            💾 Save Role
          </button>
        </div>

        {/* Stats and Saved Roles */}
        <div>
          {/* Model Statistics */}
          <div
            style={{
              border: '1px solid #ddd',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
            }}
          >
            <h2>📊 Model Statistics</h2>
            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <div>
                <strong>Total Models:</strong> {modelStats.total}
              </div>
              <div>
                <strong>Matching Filters:</strong> {modelStats.matching}
              </div>

              {Object.keys(modelStats.byProvider).length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <strong>By Provider:</strong>
                  <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    {Object.entries(modelStats.byProvider).map(
                      ([provider, count]) => (
                        <li key={provider}>
                          {provider}: {count}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Saved Roles */}
          <div
            style={{
              border: '1px solid #ddd',
              padding: '15px',
              borderRadius: '8px',
            }}
          >
            <h2>💾 Saved Roles</h2>
            {savedRoles.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic' }}>
                No saved roles yet
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {savedRoles.map(role => (
                  <div
                    key={role.id}
                    style={{
                      border: '1px solid #eee',
                      padding: '10px',
                      borderRadius: '4px',
                      background: '#f9f9f9',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <strong>{role.title}</strong>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          onClick={() => loadRole(role)}
                          style={{
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deleteRole(role.id)}
                          style={{
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#666',
                        marginTop: '5px',
                      }}
                    >
                      {role.prompt.substring(0, 80)}...
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
