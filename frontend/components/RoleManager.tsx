'use client';

import { useEffect, useState } from 'react';
import ToolManager from './ToolManager';

// Simple types
export type RoleCategory = 'errand' | 'job' | 'career';

export interface Role {
  id: string;
  title: string;
  prompt: string;
  category: RoleCategory;
  tools: string[];
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

interface RoleManagerProps {
  savedRoles: Role[];
  setSavedRoles: (roles: Role[]) => void;
  modelStats: ModelStats;
  setCurrentRoleForStats: (role: Role) => void;
}

export default function RoleManager({
  savedRoles,
  setSavedRoles,
  modelStats,
  setCurrentRoleForStats,
}: RoleManagerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role>({
    id: 'default',
    title: 'Assistant',
    prompt: 'You are a helpful AI assistant.',
    category: 'errand',
    tools: [],
    parameters: {
      minContext: 4000,
      maxContext: 100000,
      hasTools: false,
      vision: false,
      embed: false,
    },
  });

  useEffect(() => {
    setCurrentRoleForStats(currentRole);
  }, [currentRole, setCurrentRoleForStats]);

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
        border: '1px solid #333',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        background: '#252525',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>🎭 Role Manager</h2>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{ padding: '5px 10px', cursor: 'pointer', background: '#333', border: '1px solid #444', color: '#fff' }}
        >
          {isCollapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' }}>
            {/* Current Role Editor */}
            <div
              style={{
                border: '1px solid #333',
                padding: '15px',
                borderRadius: '8px',
                background: '#2d2d2d',
              }}
            >
              <h3 style={{ marginTop: 0 }}>Current Role</h3>

              <div style={{ marginBottom: '15px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                  }}
                >
                  Role Category:
                </label>
                <select
                  value={currentRole.category}
                  onChange={(e) =>
                    setCurrentRole({ ...currentRole, category: e.target.value as RoleCategory })
                  }
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#3c3c3c',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                  }}
                >
                  <option value="errand">Errand</option>
                  <option value="job">Job</option>
                  <option value="career">Career</option>
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                  }}
                >
                  Role Title:
                </label>
                <input
                  type="text"
                  value={currentRole.title}
                  onChange={(e) =>
                    setCurrentRole({ ...currentRole, title: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#3c3c3c',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                  }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                    fontSize: '12px',
                  }}
                >
                  Base Prompt:
                </label>
                <textarea
                  value={currentRole.prompt}
                  onChange={(e) =>
                    setCurrentRole({ ...currentRole, prompt: e.target.value })
                  }
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#3c3c3c',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    color: '#fff',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Parameters */}
              <h4 style={{ marginTop: '20px', marginBottom: '10px' }}>Model Filtering Parameters</h4>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  marginBottom: '15px',
                }}
              >
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
                    Min Context:
                  </label>
                  <input
                    type="number"
                    value={currentRole.parameters.minContext || ''}
                    onChange={(e) =>
                      updateRoleParameter(
                        'minContext',
                        parseInt(e.target.value) || undefined
                      )
                    }
                    style={{
                      width: '100%',
                      padding: '6px',
                      background: '#3c3c3c',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      color: '#fff',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>
                    Max Context:
                  </label>
                  <input
                    type="number"
                    value={currentRole.parameters.maxContext || ''}
                    onChange={(e) =>
                      updateRoleParameter(
                        'maxContext',
                        parseInt(e.target.value) || undefined
                      )
                    }
                    style={{
                      width: '100%',
                      padding: '6px',
                      background: '#3c3c3c',
                      border: '1px solid #444',
                      borderRadius: '4px',
                      color: '#fff',
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
                  fontSize: '12px',
                }}
              >
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <input
                    type="checkbox"
                    checked={currentRole.parameters.hasTools || false}
                    onChange={(e) =>
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
                    onChange={(e) =>
                      updateRoleParameter('vision', e.target.checked)
                    }
                  />
                  Vision
                </label>
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <input
                    type="checkbox"
                    checked={currentRole.parameters.embed || false}
                    onChange={(e) =>
                      updateRoleParameter('embed', e.target.checked)
                    }
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
            <ToolManager onToolsChange={(toolIds) => setCurrentRole({ ...currentRole, tools: toolIds })} />

            {/* Stats and Saved Roles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Model Statistics */}
              <div
                style={{
                  border: '1px solid #333',
                  padding: '15px',
                  borderRadius: '8px',
                  background: '#2d2d2d',
                }}
              >
                <h3 style={{ marginTop: 0 }}>📊 Model Statistics</h3>
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
                  border: '1px solid #333',
                  padding: '15px',
                  borderRadius: '8px',
                  background: '#2d2d2d',
                }}
              >
                <h3 style={{ marginTop: 0 }}>💾 Saved Roles</h3>
                {savedRoles.length === 0 ? (
                  <p style={{ color: '#888', fontStyle: 'italic' }}>
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
                    {savedRoles.map((role) => (
                      <div
                        key={role.id}
                        style={{
                          border: '1px solid #444',
                          padding: '10px',
                          borderRadius: '4px',
                          background: '#3c3c3c',
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
                            color: '#aaa',
                            marginTop: '5px',
                          }}
                        >
                          {(role.prompt || '').substring(0, 80)}...
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}