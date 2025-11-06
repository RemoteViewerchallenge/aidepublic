'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import McpServerManager from '../../components/McpServerManager';
import React from 'react';
import RoleMcpSelector from '../../components/RoleMcpSelector';

// Dynamically import the editor to prevent SSR issues ("window is not defined")
const SharedMonacoEditor = dynamic(
  () => import('../../components/SharedMonacoEditor'),
  { ssr: false }
);

// --- Types ---
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

interface GenerationResult {
  text: string;
  modelId?: string;
  providerId?: string;
}

interface ProviderStatus {
  gemini: boolean;
  openrouter: boolean;
  aistudio: boolean;
}

// --- API Functions ---
const testAPI = async (): Promise<any> => {
  try {
    const response = await fetch('/api/trpc/getModelsFromDatabase');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    const result = Array.isArray(data) ? data[0] : data;
    return result.result?.data || result.result || data;
  } catch (error) {
    console.error('API Test Failed:', error);
    return null;
  }
};

const getModelStats = async (
  parameters: Role['parameters']
): Promise<ModelStats> => {
  try {
    const models = await testAPI();
    if (!models || !Array.isArray(models)) {
      return { total: 0, matching: 0, byProvider: {} };
    }

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

export default function DoMoreCoPage() {
  // --- State ---
  const [currentRole, setCurrentRole] = useState<Role>({
    id: 'default',
    title: 'Assistant',
    prompt: 'You are a helpful AI assistant.',
    parameters: {
      minContext: 1000,
      maxContext: 200000,
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
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(
    null
  );
  const [savedRoles, setSavedRoles] = useState<Role[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [columnRoles, setColumnRoles] = useState<(Role | null)[]>(
    Array(8).fill(null)
  );
  const [editorValues, setEditorValues] = useState<string[]>(Array(8).fill(''));
  const [isGenerating, setIsGenerating] = useState<boolean[]>(
    Array(8).fill(false)
  );
  const [selectedModels, setSelectedModels] = useState<string[]>(
    Array(8).fill('')
  );
  const [currentModelDisplay, setCurrentModelDisplay] = useState<string>(
    'Model will be selected on generation'
  );

  // --- Effects ---
  useEffect(() => {
    const testConnection = async () => {
      const result = await testAPI();
      setApiStatus(
        result
          ? `✅ Connected: ${
              Array.isArray(result) ? result.length : 'Unknown'
            } models`
          : '❌ API connection failed'
      );
    };
    testConnection();
  }, []);

  useEffect(() => {
    const getStatus = async () => {
      try {
        const response = await fetch('/api/trpc/getProviderStatus');
        const data = await response.json();
        let status: any = null;
        if (Array.isArray(data) && data.length > 0) {
          status = data[0]?.result?.data ?? data[0]?.result ?? data[0];
        } else if (data && typeof data === 'object') {
          status = data.result?.data ?? data.result ?? data;
        }
        setProviderStatus(status);
      } catch (error) {
        console.error('Failed to get provider status:', error);
      }
    };
    getStatus();
  }, []);

  useEffect(() => {
    const updateStats = async () => {
      const stats = await getModelStats(currentRole.parameters);
      setModelStats(stats);
    };
    updateStats();
  }, [currentRole.parameters]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('workspace-roles') || '[]');
      localStorage.removeItem('workspace-roles');
      setSavedRoles(saved);
      const allRoles = [currentRole, ...saved];
      const uniqueRoles = Array.from(
        new Map(allRoles.map(role => [role.id, role])).values()
      );
      setAvailableRoles(uniqueRoles);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  }, [currentRole]);

  // --- Handlers ---
  const updateRoleParameter = (key: keyof Role['parameters'], value: any) => {
    setCurrentRole({
      ...currentRole,
      parameters: { ...currentRole.parameters, [key]: value },
    });
  };

  const saveRole = () => {
    try {
      const roleToSave = { ...currentRole, id: Date.now().toString() };
      const updated = [...savedRoles, roleToSave];
      setSavedRoles(updated);
      alert('Role created successfully (temporary)!');
    } catch (error) {
      console.error('Failed to save role:', error);
      alert('Failed to save role');
    }
  };

  const loadRole = (role: Role) => setCurrentRole(role);

  const deleteRole = (roleId: string) => {
    const updated = savedRoles.filter(r => r.id !== roleId);
    setSavedRoles(updated);
  };

  const updateEditorValue = (columnIndex: number, value: string) => {
    const newValues = [...editorValues];
    newValues[columnIndex] = value;
    setEditorValues(newValues);
  };

  const assignRoleToColumn = (columnIndex: number, roleId: string) => {
    const role = availableRoles.find(r => r.id === roleId) || null;
    const newColumnRoles = [...columnRoles];
    newColumnRoles[columnIndex] = role;
    setColumnRoles(newColumnRoles);
  };

  const generateForColumn = async (columnIndex: number) => {
    const editorValue = editorValues[columnIndex];
    if (!editorValue.trim()) return;

    const roleToUse = columnRoles[columnIndex] || currentRole;
    const updatedGenerating = [...isGenerating];
    updatedGenerating[columnIndex] = true;
    setIsGenerating(updatedGenerating);

    try {
      const result = await generateWithLLM(editorValue, roleToUse);
      const newValues = [...editorValues];
      newValues[columnIndex] += `\n\n--- LLM Response ---\n${result.text}`;
      setEditorValues(newValues);

      const newSelectedModels = [...selectedModels];
      const modelDisplay = result.modelId
        ? `${result.providerId || 'unknown'} • ${result.modelId}`
        : 'No model info';
      newSelectedModels[columnIndex] = modelDisplay;
      setSelectedModels(newSelectedModels);
      setCurrentModelDisplay(modelDisplay);
    } catch (error) {
      console.error('Generation failed:', error);
      const newValues = [...editorValues];
      newValues[columnIndex] += `\n\n--- Error ---\n❌ Error: ${error}`;
      setEditorValues(newValues);
      const newSelectedModels = [...selectedModels];
      newSelectedModels[columnIndex] = 'Model selection failed';
      setSelectedModels(newSelectedModels);
      setCurrentModelDisplay('Generation failed');
    } finally {
      const updatedGenerating = [...isGenerating];
      updatedGenerating[columnIndex] = false;
      setIsGenerating(updatedGenerating);
    }
  };

  const generateWithLLM = async (
    prompt: string,
    role: Role
  ): Promise<GenerationResult> => {
    const requestBody = {
      prompt,
      systemPrompt: role.prompt || 'You are a helpful assistant.',
      temperature: 0.7,
      maxTokens: 2000,
      modelCriteria: {
        minContext: role.parameters.minContext,
        maxContext: role.parameters.maxContext,
        toolCalling: role.parameters.hasTools,
        vision: role.parameters.vision,
        reasoning: role.parameters.hasTools,
        embedding: role.parameters.embed,
      },
    };

    const response = await fetch('/api/trpc/generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(`API Error: ${data.error.message}`);

    const actualResult = data.result?.data || data.result || data;
    return {
      text: actualResult.content || 'No content generated',
      modelId: actualResult.modelId || actualResult.model,
      providerId: actualResult.providerId,
    };
  };

  const clearEditor = (columnIndex: number) => {
    const newValues = [...editorValues];
    newValues[columnIndex] = '';
    setEditorValues(newValues);
    const newSelectedModels = [...selectedModels];
    newSelectedModels[columnIndex] = '';
    setSelectedModels(newSelectedModels);
  };

  // --- Render ---
  return (
    <div
      style={{
        padding: '10px',
        fontFamily: 'monospace',
        background: '#1e1e1e',
        color: '#fff',
        minHeight: '100vh',
      }}
    >
      <h1>🎭 DoMoreCo Workspace with MCP</h1>

      <div
        style={{
          background: '#1a1a1a',
          padding: '8px',
          borderRadius: '4px',
          marginBottom: '10px',
          border: '1px solid #333',
          fontSize: '12px',
          textAlign: 'center',
        }}
      >
        <strong>Current Model:</strong> {currentModelDisplay}
      </div>

      <div
        style={{
          border: '1px solid #333',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          background: '#252525',
        }}
      >
        <h2>Role Manager</h2>

        <div
          style={{
            background: apiStatus.includes('✅') ? '#1a4d3a' : '#4d1a1a',
            padding: '8px',
            borderRadius: '4px',
            marginBottom: '15px',
            border: `1px solid ${
              apiStatus.includes('✅') ? '#28a745' : '#dc3545'
            }`,
            fontSize: '12px',
          }}
        >
          <strong>API:</strong>{' '}
          <span style={{ fontFamily: 'monospace' }}>{apiStatus}</span>
        </div>

        {providerStatus && (
          <div
            style={{
              background: '#252525',
              padding: '8px',
              borderRadius: '4px',
              marginBottom: '15px',
              border: '1px solid #333',
              fontSize: '12px',
            }}
          >
            <strong>Provider Status:</strong>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {Object.entries(providerStatus).map(([provider, enabled]) => (
                <li key={provider}>
                  {provider}: {enabled ? '✅ Enabled' : '❌ Disabled'}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            gap: '15px',
          }}
        >
          {/* Role Editor */}
          <div>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                value={currentRole.title}
                onChange={e =>
                  setCurrentRole({ ...currentRole, title: e.target.value })
                }
                placeholder="Role Title"
                style={{
                  width: '100%',
                  padding: '6px',
                  background: '#2d2d2d',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <textarea
                value={currentRole.prompt}
                onChange={e =>
                  setCurrentRole({ ...currentRole, prompt: e.target.value })
                }
                rows={3}
                placeholder="Base Prompt"
                style={{
                  width: '100%',
                  padding: '6px',
                  background: '#2d2d2d',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '11px',
                  resize: 'vertical',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <input
                type="number"
                value={currentRole.parameters.minContext || ''}
                onChange={e =>
                  updateRoleParameter(
                    'minContext',
                    parseInt(e.target.value) || undefined
                  )
                }
                placeholder="Min Context"
                style={{
                  flex: 1,
                  padding: '4px',
                  background: '#2d2d2d',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '11px',
                }}
              />
              <input
                type="number"
                value={currentRole.parameters.maxContext || ''}
                onChange={e =>
                  updateRoleParameter(
                    'maxContext',
                    parseInt(e.target.value) || undefined
                  )
                }
                placeholder="Max Context"
                style={{
                  flex: 1,
                  padding: '4px',
                  background: '#2d2d2d',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '11px',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                fontSize: '11px',
                marginBottom: '10px',
              }}
            >
              <label
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <input
                  type="checkbox"
                  checked={currentRole.parameters.hasTools || false}
                  onChange={e =>
                    updateRoleParameter('hasTools', e.target.checked)
                  }
                />
                Tools
              </label>
              <label
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <input
                  type="checkbox"
                  checked={currentRole.parameters.vision || false}
                  onChange={e =>
                    updateRoleParameter('vision', e.target.checked)
                  }
                />
                Vision
              </label>
              <label
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <input
                  type="checkbox"
                  checked={currentRole.parameters.embed || false}
                  onChange={e => updateRoleParameter('embed', e.target.checked)}
                />
                Embed
              </label>
            </div>
            <button
              onClick={saveRole}
              style={{
                background: '#007acc',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              💾 Save Role
            </button>
          </div>

          {/* Stats and Saved Roles */}
          <div>
            <div style={{ marginBottom: '15px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
                Model Stats
              </h3>
              <div style={{ fontSize: '12px' }}>
                <div>
                  <strong>{modelStats.matching}</strong> / {modelStats.total}{' '}
                  models match
                </div>
                {Object.entries(modelStats.byProvider).map(
                  ([provider, count]) => (
                    <div
                      key={provider}
                      style={{ fontSize: '10px', color: '#aaa' }}
                    >
                      {provider}: {count}
                    </div>
                  )
                )}
              </div>
            </div>
            <div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
                Saved Roles
              </h3>
              <div
                style={{
                  fontSize: '10px',
                  maxHeight: '100px',
                  overflow: 'auto',
                }}
              >
                {savedRoles.length === 0 ? (
                  <div style={{ color: '#666', fontStyle: 'italic' }}>
                    No saved roles
                  </div>
                ) : (
                  savedRoles.map(role => (
                    <div
                      key={role.id}
                      style={{
                        background: '#333',
                        padding: '6px',
                        borderRadius: '3px',
                        marginBottom: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{ flex: 1, cursor: 'pointer' }}
                        onClick={() => loadRole(role)}
                      >
                        {role.title}
                      </span>
                      <button
                        onClick={() => deleteRole(role.id)}
                        style={{
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '2px 6px',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          fontSize: '9px',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* MCP Tool Selector */}
          <RoleMcpSelector key={currentRole.id} roleId={currentRole.id} />
        </div>
      </div>

      {/* 8-Column Workspace */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          marginBottom: '10px',
        }}
      >
        {Array.from({ length: 8 }).map((_, columnIndex) => (
          <div
            key={columnIndex}
            style={{
              border: '1px solid #333',
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#252525',
            }}
          >
            <div
              style={{
                padding: '10px',
                background: '#333',
                borderBottom: '1px solid #444',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span>Editor {columnIndex + 1}</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => generateForColumn(columnIndex)}
                    disabled={
                      isGenerating[columnIndex] ||
                      !editorValues[columnIndex].trim()
                    }
                    style={{
                      background: isGenerating[columnIndex]
                        ? '#666'
                        : '#007acc',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: isGenerating[columnIndex] ? 'default' : 'pointer',
                      fontSize: '11px',
                    }}
                  >
                    {isGenerating[columnIndex] ? '⏳' : '🚀'}
                  </button>
                  <button
                    onClick={() => clearEditor(columnIndex)}
                    style={{
                      background: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '8px',
                  fontSize: '11px',
                }}
              >
                <span>Role:</span>
                <select
                  value={columnRoles[columnIndex]?.id || ''}
                  onChange={e =>
                    assignRoleToColumn(columnIndex, e.target.value)
                  }
                  style={{
                    flex: 1,
                    padding: '2px 4px',
                    background: '#2d2d2d',
                    border: '1px solid #444',
                    borderRadius: '3px',
                    color: '#fff',
                    fontSize: '10px',
                  }}
                >
                  <option value="">Default Role</option>
                  {availableRoles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.title}
                    </option>
                  ))}
                </select>
              </div>
              {selectedModels[columnIndex] && (
                <div
                  style={{
                    fontSize: '10px',
                    color: '#9cdcfe',
                    background: '#1f2d3a',
                    border: '1px solid #2c3f50',
                    borderRadius: '4px',
                    padding: '4px',
                    marginBottom: '6px',
                  }}
                >
                  <strong>Model:</strong> {selectedModels[columnIndex]}
                </div>
              )}
            </div>

            <SharedMonacoEditor
              value={editorValues[columnIndex]}
              onChange={value => updateEditorValue(columnIndex, value || '')}
              language="plaintext"
              theme="vs-dark"
              height="400px"
              placeholder={`Enter your prompt for Editor ${columnIndex + 1}...`}
            />
          </div>
        ))}
      </div>

      {/* MCP Server Manager at the bottom */}
      <div style={{ marginTop: '40px' }}>
        <McpServerManager />
      </div>
    </div>
  );
}