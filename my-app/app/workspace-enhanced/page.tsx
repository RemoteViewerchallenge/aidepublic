'use client';

import { Editor } from '@monaco-editor/react';
import { useEffect, useState } from 'react';

// Types
interface Role {
  id: number;
  name: string;
  basePrompt?: string;
  description?: string;
  systemPrompt?: string;
  modelCriteria?: ModelCriteria;
  isActive?: boolean;
  parameters?: {
    minContext?: number;
    maxContext?: number;
    embed?: boolean;
    hasTools?: boolean;
    vision?: boolean;
    uncensored?: boolean;
  };
}

interface ModelCriteria {
  minContext?: number;
  maxContext?: number;
  toolCalling?: boolean;
  vision?: boolean;
  reasoning?: boolean;
  embedding?: boolean;
  maxParameters?: number;
  preferredProviders?: string[];
}

interface GenerationRequest {
  role: Role | null;
  prompt: string;
  columnIndex: number;
}

interface ModelStats {
  total: number;
  matching: number;
  byProvider: Record<string, number>;
}

// API calls to your existing backend
const API_BASE = 'http://localhost:3000'; // Your DoMoreCo backend server

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  // Handle tRPC endpoints with proper formatting
  if (endpoint === '/getModelsFromDatabase') {
    const response = await fetch(`${API_BASE}/api/trpc/getModelsFromDatabase`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result?.data || data; // Handle tRPC response format
  }

  if (endpoint === '/generateContent') {
    const response = await fetch(`${API_BASE}/api/trpc/generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body,
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result?.data || data; // Handle tRPC response format
  }

  // Fallback for other endpoints
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  return response.json();
}; // Get real-time model statistics based on current parameters
const getModelStats = async (
  parameters: Role['parameters']
): Promise<ModelStats> => {
  try {
    console.log('🔍 Getting model stats with parameters:', parameters);
    const response = await apiCall('/getModelsFromDatabase');
    console.log(
      '📊 API response for models:',
      response ? `${response.length} models` : 'No response'
    );
    const allModels = response || [];

    // Filter models based on parameters
    const matchingModels = allModels.filter((model: any) => {
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
      total: allModels.length,
      matching: matchingModels.length,
      byProvider,
    };
  } catch (error) {
    console.error('❌ Error getting model stats:', error);
    return { total: 0, matching: 0, byProvider: {} };
  }
};

// Real LLM generation function
const generateWithLLM = async (request: GenerationRequest): Promise<string> => {
  try {
    console.log('🚀 Generating with real LLM...', {
      prompt: request.prompt.substring(0, 100),
      role: request.role?.name,
      column: request.columnIndex,
    });

    const response = await apiCall('/generateContent', {
      method: 'POST',
      body: JSON.stringify({
        prompt: request.prompt,
        systemPrompt:
          request.role?.basePrompt || 'You are a helpful assistant.',
        temperature: 0.7,
        maxTokens: 2000,
        modelCriteria: {
          minContext: request.role?.parameters.minContext,
          maxContext: request.role?.parameters.maxContext,
          toolCalling: request.role?.parameters.hasTools,
          vision: request.role?.parameters.vision,
          embedding: request.role?.parameters.embed,
        },
      }),
    });

    console.log('✅ Generation successful:', {
      model: response.modelId,
      provider: response.providerId,
      contentLength: response.content?.length,
    });

    return response.content || 'No content generated';
  } catch (error) {
    console.error('❌ Generation failed:', error);
    return `// ❌ Generation Error\n// ${
      error instanceof Error ? error.message : 'Unknown error'
    }\n\n// Check:\n// - Backend running on localhost:3000\n// - API keys configured\n// - Models available for parameters`;
  }
};

// Role Manager Component - Top row, 1.5 inches tall, full width
const RoleParameterManager = ({
  onRoleChange,
  currentRole,
}: {
  onRoleChange: (role: Role) => void;
  currentRole: Role;
}) => {
  const [modelStats, setModelStats] = useState<ModelStats>({
    total: 0,
    matching: 0,
    byProvider: {},
  });
  const [isLoadingSave, setIsLoadingSave] = useState(false);

  // Update model stats when parameters change
  useEffect(() => {
    const updateStats = async () => {
      const stats = await getModelStats(currentRole.parameters);
      setModelStats(stats);
    };
    updateStats();
  }, [currentRole.parameters]);

  const updateRoleParameter = (key: keyof Role['parameters'], value: any) => {
    onRoleChange({
      ...currentRole,
      parameters: {
        ...currentRole.parameters,
        [key]: value,
      },
    });
  };

  const saveRole = async () => {
    setIsLoadingSave(true);
    try {
      // Save to localStorage for now - can be extended to backend
      const savedRoles = JSON.parse(
        localStorage.getItem('workspace-roles') || '[]'
      );
      const roleIndex = savedRoles.findIndex(
        (r: Role) => r.id === currentRole.id
      );

      if (roleIndex >= 0) {
        savedRoles[roleIndex] = currentRole;
      } else {
        savedRoles.push({ ...currentRole, id: Date.now() });
      }

      localStorage.setItem('workspace-roles', JSON.stringify(savedRoles));
      console.log('✅ Role saved successfully');
    } catch (error) {
      console.error('❌ Failed to save role:', error);
    }
    setIsLoadingSave(false);
  };

  const loadRole = () => {
    try {
      const savedRoles = JSON.parse(
        localStorage.getItem('workspace-roles') || '[]'
      );
      if (savedRoles.length > 0) {
        onRoleChange(savedRoles[0]); // Load first saved role
        console.log('✅ Role loaded successfully');
      }
    } catch (error) {
      console.error('❌ Failed to load role:', error);
    }
  };

  return (
    <div
      style={{
        height: '96px', // ~1.5 inches
        background: '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        gap: '16px',
        overflow: 'hidden',
      }}
    >
      {/* Role Title & Base Prompt */}
      <div
        style={{
          flex: '0 0 300px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <input
          type="text"
          placeholder="Role Title"
          value={currentRole.name}
          onChange={e => onRoleChange({ ...currentRole, name: e.target.value })}
          style={{
            padding: '6px 8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        />
        <textarea
          placeholder="Base Prompt"
          value={currentRole.basePrompt}
          onChange={e =>
            onRoleChange({ ...currentRole, basePrompt: e.target.value })
          }
          style={{
            padding: '6px 8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '12px',
            resize: 'none',
            height: '44px',
          }}
        />
      </div>

      {/* Parameters */}
      <div
        style={{
          flex: '1',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          fontSize: '12px',
        }}
      >
        {/* Context Range */}
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '4px',
              fontWeight: 'bold',
            }}
          >
            Context Range
          </label>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input
              type="number"
              placeholder="Min"
              value={currentRole.parameters.minContext || ''}
              onChange={e =>
                updateRoleParameter(
                  'minContext',
                  parseInt(e.target.value) || undefined
                )
              }
              style={{
                width: '60px',
                padding: '2px 4px',
                border: '1px solid #ddd',
                borderRadius: '3px',
              }}
            />
            <span>-</span>
            <input
              type="number"
              placeholder="Max"
              value={currentRole.parameters.maxContext || ''}
              onChange={e =>
                updateRoleParameter(
                  'maxContext',
                  parseInt(e.target.value) || undefined
                )
              }
              style={{
                width: '60px',
                padding: '2px 4px',
                border: '1px solid #ddd',
                borderRadius: '3px',
              }}
            />
          </div>
        </div>

        {/* Boolean Parameters */}
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '4px',
              fontWeight: 'bold',
            }}
          >
            Capabilities
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {[
              { key: 'embed', label: 'Embedding' },
              { key: 'hasTools', label: 'Tools' },
              { key: 'vision', label: 'Vision' },
              { key: 'uncensored', label: 'Uncensored' },
            ].map(({ key, label }) => (
              <label
                key={key}
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(
                    currentRole.parameters[key as keyof Role['parameters']]
                  )}
                  onChange={e =>
                    updateRoleParameter(
                      key as keyof Role['parameters'],
                      e.target.checked
                    )
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Model Stats */}
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: '4px',
              fontWeight: 'bold',
            }}
          >
            Model Stats
          </label>
          <div style={{ fontSize: '11px', color: '#666' }}>
            <div>
              <strong>{modelStats.matching}</strong> / {modelStats.total} models
              match
            </div>
            {Object.entries(modelStats.byProvider).map(([provider, count]) => (
              <div key={provider}>
                {provider}: {count}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save/Load Buttons */}
      <div
        style={{
          flex: '0 0 100px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <button
          onClick={saveRole}
          disabled={isLoadingSave}
          style={{
            padding: '6px 12px',
            background: isLoadingSave ? '#ccc' : '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: isLoadingSave ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoadingSave ? 'Saving...' : 'Save Role'}
        </button>
        <button
          onClick={loadRole}
          style={{
            padding: '6px 12px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Load Role
        </button>
      </div>
    </div>
  );
};

// Delete role from your existing roles table
const deleteRole = async (roleId: number): Promise<void> => {
  try {
    await apiCall(`/api/roles/${roleId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Failed to delete role:', error);
    throw error;
  }
};

// Fetch roles from the backend database (roles table)
const fetchRoles = async (): Promise<Role[]> => {
  try {
    // For now, return empty array since roles endpoint might not be implemented yet
    // In the future, this could call your backend: await apiCall('/getRoles');
    return [];
  } catch (error) {
    console.error('Failed to fetch roles from backend:', error);
    return [];
  }
};

const getDefaultRoles = (): Role[] => [
  {
    id: 0,
    name: 'Test Mode',
    description: '🧪 Mock responses for testing the UI',
    systemPrompt:
      'You are in test mode. Generate mock responses for development.',
    modelCriteria: {
      minContext: 1000,
      toolCalling: false,
      reasoning: false,
      preferredProviders: ['test'],
    },
    isActive: false,
  },
  {
    id: 1,
    name: 'System Architect',
    description: 'Designs system architecture and technical solutions',
    systemPrompt:
      'You are a senior system architect with 15+ years of experience. Focus on scalable, maintainable solutions. Consider performance, security, and best practices.',
    modelCriteria: {
      minContext: 100000, // Needs large context for architecture docs
      toolCalling: true, // Needs to use tools for analysis
      reasoning: true, // Complex reasoning required
      preferredProviders: ['openrouter', 'ai-studio'],
    },
    isActive: false,
  },
  {
    id: 2,
    name: 'Code Reviewer',
    description: 'Reviews and optimizes code quality',
    systemPrompt:
      'You are an expert code reviewer. Analyze code for bugs, performance issues, security vulnerabilities, and adherence to best practices.',
    modelCriteria: {
      minContext: 50000, // Needs good context for code review
      toolCalling: true, // May need to run analysis tools
      reasoning: true, // Complex reasoning for code analysis
      preferredProviders: ['openrouter'],
    },
    isActive: false,
  },
  {
    id: 3,
    name: 'Documentation Writer',
    description: 'Creates clear, comprehensive documentation',
    systemPrompt:
      'You are a technical documentation specialist. Write clear, comprehensive documentation with examples and use cases.',
    modelCriteria: {
      minContext: 30000, // Moderate context needed
      toolCalling: false, // Mainly text generation
      reasoning: false, // Straightforward documentation task
      preferredProviders: ['ai-studio', 'openrouter'],
    },
    isActive: false,
  },
];

// Mock LLM API call for testing
const callLLMAPI = async (request: GenerationRequest): Promise<string> => {
  if (request.role?.name === 'Test Mode') {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const mockResponses = [
      `// Generated by ${
        request.role?.name || 'AI'
      }\n// Based on prompt: "${request.prompt.substring(
        0,
        50
      )}..."\n\nfunction generatedFunction() {\n  console.log("This is a mock response!");\n  return "AI generated content";\n}`,
      `/* AI Response from ${
        request.role?.name || 'Assistant'
      } */\n\nconst solution = {\n  approach: "Mock implementation",\n  code: "// Generated code would be here",\n  explanation: "This is a test response to demonstrate the LLM integration."\n};`,
      `# AI Generated Response\n\n## Role: ${
        request.role?.name || 'Default'
      }\n\n### Analysis\nBased on your prompt: "${request.prompt.substring(
        0,
        100
      )}..."\n\n### Recommendation\nThis is a mock response for testing purposes.\n\n### Next Steps\n1. Integrate real LLM API\n2. Test with actual prompts\n3. Refine role prompts`,
    ];

    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
  }

  // Use your backend's real generation API
  try {
    console.log('🚀 Making real API call to backend...', {
      prompt: request.prompt.substring(0, 100),
      role: request.role?.name,
      criteria: request.role?.modelCriteria,
    });

    const response = await apiCall('/generateContent', {
      method: 'POST',
      body: JSON.stringify({
        prompt: request.prompt,
        systemPrompt:
          request.role?.systemPrompt || 'You are a helpful assistant.',
        temperature: 0.7,
        maxTokens: 2000,
        modelCriteria: request.role?.modelCriteria || {},
      }),
    });

    console.log('✅ Generation successful:', {
      model: response.modelId,
      provider: response.providerId,
      contentLength: response.content?.length,
    });

    return response.content || 'No content generated';
  } catch (error) {
    console.error('❌ LLM API call failed:', error);

    // Fallback to helpful error message
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return `// ❌ Generation Error\n// ${errorMessage}\n\n// This could be due to:\n// 1. Backend server not running (check http://localhost:3000)\n// 2. No API keys configured for providers\n// 3. No suitable models available\n// 4. Network connectivity issues\n\n// Try:\n// - Start backend: cd /home/guy/DoMoreCo && npm run dev\n// - Check backend logs for errors\n// - Verify OpenRouter/Gemini API keys in .env`;
  }
};

// Role Manager Component with persistence and LLM integration
const RoleManager = ({
  onRoleSelect,
  selectedRole,
}: {
  onRoleSelect: (role: Role | null) => void;
  selectedRole: Role | null;
}) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    systemPrompt: '',
  });
  const [isAddingRole, setIsAddingRole] = useState(false);

  // Fetch roles from backend API or fallback to local storage/defaults
  const fetchRoles = async (): Promise<Role[]> => {
    try {
      const response = await apiCall('/api/roles');
      if (Array.isArray(response)) {
        return response;
      }
      return [];
    } catch (error) {
      // Fallback to localStorage or defaults
      const savedRoles = localStorage.getItem('ai-workspace-roles');
      if (savedRoles) {
        try {
          return JSON.parse(savedRoles);
        } catch (parseError) {
          return getDefaultRoles();
        }
      } else {
        return getDefaultRoles();
      }
    }
  };

  // Load roles from your backend database on component mount
  useEffect(() => {
    const loadRoles = async () => {
      try {
        const backendRoles = await fetchRoles();
        setRoles(backendRoles);
      } catch (error) {
        console.error('Failed to load roles from backend:', error);
        // Fallback to localStorage or defaults
        const savedRoles = localStorage.getItem('ai-workspace-roles');
        if (savedRoles) {
          try {
            setRoles(JSON.parse(savedRoles));
          } catch (parseError) {
            setRoles(getDefaultRoles());
          }
        } else {
          setRoles(getDefaultRoles());
        }
      }
    };

    // Load roles from your backend
    loadRoles();
  }, []);

  // Save roles to localStorage whenever roles change
  useEffect(() => {
    localStorage.setItem('ai-workspace-roles', JSON.stringify(roles));
  }, [roles]);

  const setDefaultRoles = () => {
    const defaultRoles: Role[] = [
      {
        id: 0,
        name: 'Test Mode',
        description: '🧪 Mock responses for testing the UI',
        systemPrompt:
          'You are in test mode. Generate mock responses for development.',
        modelCriteria: {
          minContext: 1000,
          toolCalling: false,
          reasoning: false,
          preferredProviders: ['test'],
        },
        isActive: false,
      },
      {
        id: 1,
        name: 'System Architect',
        description: 'Designs system architecture and technical solutions',
        systemPrompt:
          'You are a senior system architect with 15+ years of experience. Focus on scalable, maintainable solutions. Consider performance, security, and best practices. Provide detailed technical reasoning for your recommendations.',
        modelCriteria: {
          minContext: 100000,
          toolCalling: true,
          reasoning: true,
          preferredProviders: ['openrouter', 'ai-studio'],
        },
        isActive: false,
      },
      {
        id: 2,
        name: 'Code Reviewer',
        description: 'Reviews and optimizes code quality',
        systemPrompt:
          'You are an expert code reviewer with deep knowledge of multiple programming languages. Analyze code for bugs, performance issues, security vulnerabilities, and adherence to best practices. Provide specific, actionable feedback with examples.',
        modelCriteria: {
          minContext: 50000,
          toolCalling: true,
          reasoning: true,
          preferredProviders: ['openrouter'],
        },
        isActive: false,
      },
      {
        id: 3,
        name: 'Documentation Writer',
        description: 'Creates clear, comprehensive documentation',
        systemPrompt:
          'You are a technical documentation specialist who excels at creating clear, comprehensive documentation with practical examples and use cases. Focus on readability and practical implementation guidance.',
        modelCriteria: {
          minContext: 30000,
          toolCalling: false,
          reasoning: false,
          preferredProviders: ['ai-studio', 'openrouter'],
        },
        isActive: false,
      },
    ];
    setRoles(defaultRoles);
  };
  const addRole = () => {
    if (newRole.name && newRole.description && newRole.systemPrompt) {
      const role: Role = {
        id: Date.now(),
        name: newRole.name,
        description: newRole.description,
        systemPrompt: newRole.systemPrompt,
        modelCriteria: {
          minContext: 30000,
          toolCalling: false,
          reasoning: false,
          preferredProviders: ['openrouter', 'ai-studio'],
        },
        isActive: false,
      };
      setRoles([...roles, role]);
      setNewRole({ name: '', description: '', systemPrompt: '' });
      setIsAddingRole(false);
    }
  };

  const removeRole = (id: number) => {
    const updatedRoles = roles.filter(role => role.id !== id);
    setRoles(updatedRoles);
    if (selectedRole?.id === id) {
      onRoleSelect(null);
    }
  };

  const selectRole = (role: Role) => {
    const updatedRoles = roles.map(r => ({
      ...r,
      isActive: r.id === role.id,
    }));
    setRoles(updatedRoles);
    onRoleSelect(role);
  };

  return (
    <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ margin: '0', color: '#333' }}>Role Manager</h3>
        <button
          onClick={() => setIsAddingRole(!isAddingRole)}
          style={{
            background: '#007acc',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          {isAddingRole ? 'Cancel' : '+ Add Role'}
        </button>
      </div>

      {selectedRole && (
        <div
          style={{
            background: '#e8f5e8',
            border: '1px solid #28a745',
            borderRadius: '4px',
            padding: '8px',
            marginBottom: '16px',
            fontSize: '12px',
          }}
        >
          <strong>Active:</strong> {selectedRole.name}
        </div>
      )}

      {isAddingRole && (
        <div
          style={{
            background: '#f8f9fa',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '16px',
          }}
        >
          <input
            type="text"
            placeholder="Role name"
            value={newRole.name}
            onChange={e => setNewRole({ ...newRole, name: e.target.value })}
            style={{
              width: '100%',
              padding: '6px',
              marginBottom: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          />
          <input
            type="text"
            placeholder="Role description"
            value={newRole.description}
            onChange={e =>
              setNewRole({ ...newRole, description: e.target.value })
            }
            style={{
              width: '100%',
              padding: '6px',
              marginBottom: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
            }}
          />
          <textarea
            placeholder="System prompt (how should the AI behave in this role?)"
            value={newRole.systemPrompt}
            onChange={e =>
              setNewRole({ ...newRole, systemPrompt: e.target.value })
            }
            style={{
              width: '100%',
              padding: '6px',
              marginBottom: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
              minHeight: '60px',
              resize: 'vertical',
            }}
          />
          <button
            onClick={addRole}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Save Role
          </button>
        </div>
      )}

      <div>
        {roles.map(role => (
          <div
            key={role.id}
            style={{
              background: role.isActive ? '#e8f5e8' : '#f8f9fa',
              border: `1px solid ${role.isActive ? '#28a745' : '#e9ecef'}`,
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '8px',
              cursor: 'pointer',
            }}
            onClick={() => selectRole(role)}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '13px' }}>{role.name}</strong>
                {role.isActive && (
                  <span
                    style={{
                      color: '#28a745',
                      fontSize: '11px',
                      marginLeft: '8px',
                    }}
                  >
                    ACTIVE
                  </span>
                )}
                <div
                  style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}
                >
                  {role.description}
                </div>
                <div
                  style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}
                >
                  {role.systemPrompt.substring(0, 100)}...
                </div>
              </div>
              <button
                onClick={e => {
                  e.stopPropagation();
                  removeRole(role.id);
                }}
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
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function MonacoWorkspace() {
  // State for current role
  const [currentRole, setCurrentRole] = useState<Role>({
    id: 1,
    name: 'Assistant',
    basePrompt: 'You are a helpful AI assistant.',
    parameters: {
      minContext: 4000,
      maxContext: 100000,
      embed: false,
      hasTools: false,
      vision: false,
      uncensored: false,
    },
  });

  // State for 4 separate prompt contents (one for each column)
  const [promptContents, setPromptContents] = useState([
    `Write a detailed technical analysis of modern web development frameworks.

Consider:
1. Performance characteristics
2. Developer experience  
3. Ecosystem maturity
4. Use case suitability

Provide specific examples and recommendations.`,
    `Analyze the current state of AI and machine learning in software development.

Focus on:
1. Code generation tools
2. Testing automation
3. Bug detection
4. Performance optimization

Include practical examples.`,
    `Discuss database design patterns and best practices.

Cover:
1. Normalization vs. denormalization
2. Indexing strategies
3. Query optimization
4. Scalability considerations

Provide real-world scenarios.`,
    `Examine cloud architecture and deployment strategies.

Address:
1. Microservices vs. monoliths
2. Container orchestration
3. CI/CD pipelines
4. Security best practices

Include implementation details.`,
  ]);

  // State for the four generation columns (rest of page height)
  const [generatedContents, setGeneratedContents] = useState([
    '// Column 1 - Generated content will appear here\n// Click "Generate" to start AI generation',
    '// Column 2 - Generated content will appear here\n// Click "Generate" to start AI generation',
    '// Column 3 - Generated content will appear here\n// Click "Generate" to start AI generation',
    '// Column 4 - Generated content will appear here\n// Click "Generate" to start AI generation',
  ]);

  const [isGenerating, setIsGenerating] = useState([
    false,
    false,
    false,
    false,
  ]);

  // Generate content for a specific column using its specific prompt
  const generateForColumn = async (columnIndex: number) => {
    const promptContent = promptContents[columnIndex];
    if (!promptContent.trim()) return;

    const updatedGenerating = [...isGenerating];
    updatedGenerating[columnIndex] = true;
    setIsGenerating(updatedGenerating);

    try {
      const result = await generateWithLLM({
        role: currentRole,
        prompt: promptContent,
        columnIndex,
      });

      const newContents = [...generatedContents];
      newContents[columnIndex] = result;
      setGeneratedContents(newContents);
    } catch (error) {
      console.error(
        `❌ Generation failed for column ${columnIndex + 1}:`,
        error
      );
      const newContents = [...generatedContents];
      newContents[columnIndex] = `// ❌ Generation failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
      setGeneratedContents(newContents);
    }

    const finalGenerating = [...isGenerating];
    finalGenerating[columnIndex] = false;
    setIsGenerating(finalGenerating);
  };

  // Update a specific column's prompt content
  const updatePromptContent = (columnIndex: number, content: string) => {
    const newPrompts = [...promptContents];
    newPrompts[columnIndex] = content;
    setPromptContents(newPrompts);
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f5f5f5',
        padding: '8px',
        gap: '8px',
      }}
    >
      {/* Row 1: Role Manager - 1.5 inches tall, full width */}
      <RoleParameterManager
        onRoleChange={setCurrentRole}
        currentRole={currentRole}
      />

      {/* Row 2: Four Prompt Columns - 2 inches tall each */}
      <div
        style={{
          height: '128px', // ~2 inches
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
        }}
      >
        {[0, 1, 2, 3].map(columnIndex => (
          <div
            key={columnIndex}
            style={{
              background: '#ffffff',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                background: '#f8f9fa',
                padding: '6px 8px',
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
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
                  padding: '3px 6px',
                  background: isGenerating[columnIndex] ? '#6c757d' : '#007acc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  fontSize: '10px',
                  cursor:
                    isGenerating[columnIndex] ||
                    !promptContents[columnIndex].trim()
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                {isGenerating[columnIndex] ? 'Generating...' : 'Generate'}
              </button>
            </div>
            <Editor
              height="100%"
              defaultLanguage="markdown"
              value={promptContents[columnIndex]}
              theme="vs-light"
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 11,
                wordWrap: 'on',
                automaticLayout: true,
                lineNumbers: 'off',
                folding: false,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 0,
                glyphMargin: false,
              }}
              onChange={value => updatePromptContent(columnIndex, value || '')}
            />
          </div>
        ))}
      </div>

      {/* Row 3: Four AI Generation Columns - Rest of page height */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '8px',
        }}
      >
        {[0, 1, 2, 3].map(columnIndex => (
          <div
            key={columnIndex}
            style={{
              background: '#ffffff',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                background: isGenerating[columnIndex] ? '#fffbf0' : '#f8f9fa',
                padding: '8px 12px',
                borderBottom: '1px solid #e0e0e0',
                fontSize: '12px',
                fontWeight: 'bold',
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
            <Editor
              height="100%"
              defaultLanguage="markdown"
              value={generatedContents[columnIndex]}
              theme="vs-light"
              options={{
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
                wordWrap: 'on',
                automaticLayout: true,
                lineNumbers: 'on',
                folding: true,
                readOnly: false,
              }}
              onChange={value => {
                const newContents = [...generatedContents];
                newContents[columnIndex] = value || '';
                setGeneratedContents(newContents);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
