'use client';

import { Editor } from '@monaco-editor/react';
import { useEffect, useState } from 'react';
import XtermTerminal from '../../components/XtermTerminal';

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

// Test API function - using working non-batch format
const testAPI = async (): Promise<any> => {
  try {
    const response = await fetch('/api/trpc/getModelsFromDatabase');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    // tRPC returns an array for batch calls, get the first result
    const result = Array.isArray(data) ? data[0] : data;
    return result.result?.data || result.result || data;
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

export default function Workspace1() {
  // Role manager state (working foundation)
  const [currentRole, setCurrentRole] = useState<Role>({
    id: 'default',
    title: 'Assistant',
    prompt: 'You are a helpful AI assistant.',
    parameters: {
      minContext: 1000, // Lower minimum context to match more models
      maxContext: 200000, // Higher maximum to be more inclusive
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

  // 4-column workspace state
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [columnRoles, setColumnRoles] = useState<(Role | null)[]>([
    null,
    null,
    null,
    null,
  ]);
  const [promptContents, setPromptContents] = useState<string[]>([
    '',
    '',
    '',
    '',
  ]);
  const [generatedContents, setGeneratedContents] = useState<string[]>([
    '',
    '',
    '',
    '',
  ]);
  const [isGenerating, setIsGenerating] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);
  const [selectedModels, setSelectedModels] = useState<string[]>([
    '',
    '',
    '',
    '',
  ]);

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

  // Fetch provider status on mount
  useEffect(() => {
    const getStatus = async () => {
      try {
        const response = await fetch('/api/trpc/getProviderStatus');
        const data = await response.json();
        // Normalize tRPC response shapes. Possible shapes:
        // - batch: [{ result: { data: ... } }]
        // - single: { result: { data: ... } }
        // - direct: { ... }
        let status: any = null;
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0];
          status = item?.result?.data ?? item?.result ?? item;
        } else if (data && typeof data === 'object') {
          status = data.result?.data ?? data.result ?? data;
        } else {
          status = data;
        }

        if (!status) {
          console.warn('Provider status response had unexpected shape', {
            data,
          });
        }

        setProviderStatus(status);
      } catch (error) {
        console.error('Failed to get provider status:', error);
      }
    };
    getStatus();
  }, []);

  // Update model stats when parameters change
  useEffect(() => {
    const updateStats = async () => {
      const stats = await getModelStats(currentRole.parameters);
      setModelStats(stats);
    };
    updateStats();
  }, [currentRole.parameters]);

  // Load saved roles (but make them short-lived - clear after session)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('workspace-roles') || '[]');
      // Clear saved roles after loading to make them short-lived
      localStorage.removeItem('workspace-roles');
      setSavedRoles(saved);
      // Make all roles (current + saved) available for column assignment
      const allRoles = [currentRole, ...saved];
      const uniqueRoles = Array.from(
        new Map(allRoles.map(role => [role.id, role])).values()
      );
      setAvailableRoles(uniqueRoles);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  }, [currentRole]);

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
      // Don't save to localStorage to keep roles short-lived
      // localStorage.setItem('workspace-roles', JSON.stringify(updated));
      alert('Role created successfully (temporary)!');
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
    // Don't persist to localStorage for short-lived roles
    // localStorage.setItem('workspace-roles', JSON.stringify(updated));
  };

  // 4-column workspace functions
  const updatePromptContent = (columnIndex: number, content: string) => {
    const newContents = [...promptContents];
    newContents[columnIndex] = content;
    setPromptContents(newContents);
  };

  const assignRoleToColumn = (columnIndex: number, roleId: string) => {
    const role = availableRoles.find(r => r.id === roleId) || null;
    const newColumnRoles = [...columnRoles];
    newColumnRoles[columnIndex] = role;
    setColumnRoles(newColumnRoles);
  };

  // Generate content for a specific column using its specific prompt and assigned role
  const generateForColumn = async (columnIndex: number) => {
    const promptContent = promptContents[columnIndex];
    if (!promptContent.trim()) return;

    // Use column-specific role if assigned, otherwise fall back to current role
    const roleToUse = columnRoles[columnIndex] || currentRole;

    const updatedGenerating = [...isGenerating];
    updatedGenerating[columnIndex] = true;
    setIsGenerating(updatedGenerating);

    try {
      const result = await generateWithLLM(promptContent, roleToUse);
      const newContents = [...generatedContents];
      newContents[columnIndex] = result.text;
      setGeneratedContents(newContents);

      const newSelectedModels = [...selectedModels];
      newSelectedModels[columnIndex] = result.modelId
        ? `${result.providerId || 'unknown provider'} • ${result.modelId}`
        : 'No model information returned';
      setSelectedModels(newSelectedModels);
    } catch (error) {
      console.error('Generation failed:', error);
      const newContents = [...generatedContents];
      newContents[columnIndex] = `Error: ${error}`;
      setGeneratedContents(newContents);

      const newSelectedModels = [...selectedModels];
      newSelectedModels[columnIndex] = 'Model selection failed';
      setSelectedModels(newSelectedModels);
    } finally {
      const updatedGenerating = [...isGenerating];
      updatedGenerating[columnIndex] = false;
      setIsGenerating(updatedGenerating);
    }
  };

  // Generation function using the correct tRPC format
  const generateWithLLM = async (
    prompt: string,
    role: Role
  ): Promise<GenerationResult> => {
    try {
      console.log('🚀 Starting generation...', {
        prompt: prompt.substring(0, 100) + '...',
        role: role.title,
        parameters: role.parameters,
      });

      const requestBody = {
        prompt: prompt,
        systemPrompt: role.prompt || 'You are a helpful assistant.',
        temperature: 0.7,
        maxTokens: 2000,
        modelCriteria: {
          minContext: role.parameters.minContext,
          maxContext: role.parameters.maxContext,
          toolCalling: role.parameters.hasTools,
          vision: role.parameters.vision,
          reasoning: role.parameters.hasTools, // Map hasTools to reasoning for now
          embedding: role.parameters.embed,
        },
      };

      console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
      console.log('🌐 Making API call to: /api/trpc/generateContent');

      // Use simple non-batch format that works
      const response = await fetch('/api/trpc/generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response status:', response.status);
      console.log(
        '📥 Response headers:',
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API call failed:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
        });
        throw new Error(`API call failed (${response.status}): ${errorText}`);
      }

      const responseText = await response.text();
      console.log('📄 Raw response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('📊 Parsed response data:', data);
      } catch (parseError) {
        console.error('❌ Failed to parse response as JSON:', parseError);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      // Check if there's an error in the response
      if (data.error) {
        console.error('❌ API returned error:', data.error);
        throw new Error(`API Error: ${data.error.message}`);
      }

      const actualResult = data.result?.data || data.result || data;
      console.log('✅ Final result:', actualResult);

      console.log('✅ Generation successful:', {
        model: actualResult.modelId,
        provider: actualResult.providerId,
        contentLength: actualResult.content?.length,
      });

      return {
        text:
          actualResult.content ||
          actualResult.response ||
          'No content generated',
        modelId: actualResult.modelId || actualResult.model,
        providerId: actualResult.providerId,
      };
    } catch (error) {
      console.error('❌ Generation failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { text: `❌ Error: ${errorMsg}` };
    }
  };

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
      <h1>🎭 Enhanced Workspace with Role Manager</h1>

      {/* Compact Role Manager */}
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

        {/* API Status */}
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
            gridTemplateColumns: '1fr 1fr',
            gap: '15px',
          }}
        >
          {/* Current Role Editor */}
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
            {/* Model Stats */}
            <div style={{ marginBottom: '15px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
                Model Stats
              </h3>
              <div style={{ fontSize: '12px' }}>
                <div>
                  <strong>{modelStats.matching}</strong> / {modelStats.total}{' '}
                  models match
                </div>
                {Object.keys(modelStats.byProvider).length > 0 &&
                  Object.entries(modelStats.byProvider).map(
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

            {/* Saved Roles */}
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
        </div>
      </div>

      {/* 4-Column Workspace */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          marginBottom: '10px',
        }}
      >
        {Array.from({ length: 4 }).map((_, columnIndex) => (
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
                <span>Prompt {columnIndex + 1}</span>
                <button
                  onClick={() => generateForColumn(columnIndex)}
                  disabled={
                    isGenerating[columnIndex] ||
                    !promptContents[columnIndex].trim()
                  }
                  style={{
                    background: isGenerating[columnIndex] ? '#666' : '#007acc',
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
              </div>

              {/* Role Assignment */}
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

            {columnIndex === 3 ? (
              <div style={{ height: '300px' }}>
                <XtermTerminal />
              </div>
            ) : (
              <Editor
                height="300px"
                language="markdown"
                theme="vs-dark"
                value={promptContents[columnIndex]}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: 'off',
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  fontSize: 12,
                  fontFamily: 'Monaco, monospace',
                }}
                onChange={value =>
                  updatePromptContent(columnIndex, value || '')
                }
              />
            )}
          </div>
        ))}
      </div>

      {/* Generated Content Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
        }}
      >
        {Array.from({ length: 4 }).map((_, columnIndex) => (
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
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>AI Column {columnIndex + 1}</span>
              {isGenerating[columnIndex] && (
                <span style={{ color: '#ff6b35', fontSize: '10px' }}>
                  Generating...
                </span>
              )}
            </div>

            {columnIndex === 3 ? (
              <div style={{ height: '300px' }}>
                <XtermTerminal />
              </div>
            ) : (
              <Editor
                height="300px"
                language="markdown"
                theme="vs-dark"
                value={generatedContents[columnIndex]}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  lineNumbers: 'off',
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  fontSize: 12,
                  fontFamily: 'Monaco, monospace',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
