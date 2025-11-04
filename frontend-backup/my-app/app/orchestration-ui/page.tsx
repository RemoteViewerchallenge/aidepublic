'use client';

import { useState } from 'react';

import { trpc } from '../../utils/trpc';
import RoleManager from '../role-manager/page';

type Role = {
  id: string;
  name: string;
  description: string;
};

type Step = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  pattern?: OrchestrationPattern;
  patternConfig?: any;
};

type OrchestrationPattern =
  | 'sequential'
  | 'parallel'
  | 'branch'
  | 'retry'
  | 'while'
  | 'forEach'
  | 'switch';

const complexOrchestrationTemplates = {
  'simple-test': {
    name: '🚀 Simple Test',
    description: 'Basic sequential steps for testing',
    steps: [
      {
        id: '1',
        name: 'Hello World',
        description: 'Basic greeting step',
        prompt: 'Say hello and introduce yourself as an AI assistant',
        pattern: 'sequential' as OrchestrationPattern,
      },
      {
        id: '2',
        name: 'Status Check',
        description: 'Confirm system is working',
        prompt: 'Confirm that you are operational and ready to help',
        pattern: 'sequential' as OrchestrationPattern,
      },
    ],
  },
  'parallel-test': {
    name: '⚡ Parallel Test',
    description: 'Test parallel execution',
    steps: [
      {
        id: '1',
        name: 'Parallel Tasks',
        description: 'Execute multiple tasks simultaneously',
        prompt: 'Perform parallel analysis of the following topics',
        pattern: 'parallel' as OrchestrationPattern,
        patternConfig: {
          branches: [
            'Analyze the benefits of AI technology',
            'Research current AI limitations',
            'Explore future AI possibilities',
          ],
        },
      },
    ],
  },
  'research-analysis': {
    name: 'Research & Analysis Pipeline',
    description: 'Parallel research followed by sequential analysis',
    steps: [
      {
        id: '1',
        name: 'Parallel Research',
        description: 'Research multiple aspects simultaneously',
        prompt: 'Research different aspects: technical, market, competition',
        pattern: 'parallel' as OrchestrationPattern,
        patternConfig: {
          branches: [
            'Research technical feasibility and requirements',
            'Analyze market size and opportunities',
            'Study competitive landscape and positioning',
          ],
        },
      },
      {
        id: '2',
        name: 'Synthesis Analysis',
        description: 'Synthesize research findings',
        prompt:
          'Analyze and synthesize the research findings into key insights',
        pattern: 'sequential' as OrchestrationPattern,
      },
      {
        id: '3',
        name: 'Strategic Recommendations',
        description: 'Generate actionable recommendations',
        prompt: 'Based on the analysis, provide strategic recommendations',
        pattern: 'sequential' as OrchestrationPattern,
      },
    ],
  },
  'content-creation': {
    name: 'Multi-Stage Content Creation',
    description: 'Iterative content creation with quality checks',
    steps: [
      {
        id: '1',
        name: 'Content Outline',
        description: 'Create detailed content outline',
        prompt: 'Create a comprehensive outline for the content',
        pattern: 'sequential' as OrchestrationPattern,
      },
      {
        id: '2',
        name: 'Draft Creation',
        description: 'Create content draft with retry logic',
        prompt: 'Write a high-quality draft based on the outline',
        pattern: 'retry' as OrchestrationPattern,
        patternConfig: {
          maxAttempts: 3,
          successCondition:
            'Content length > 500 words and includes key points',
        },
      },
      {
        id: '3',
        name: 'Quality Review',
        description: 'Review and improve content quality',
        prompt: 'Review content for clarity, grammar, and engagement',
        pattern: 'branch' as OrchestrationPattern,
        patternConfig: {
          condition: 'Quality score > 8',
          trueBranch: 'Finalize and format content',
          falseBranch: 'Revise and improve content',
        },
      },
    ],
  },
  'data-processing': {
    name: 'Iterative Data Processing',
    description: 'Process data items with conditional logic',
    steps: [
      {
        id: '1',
        name: 'Data Validation',
        description: 'Validate each data item',
        prompt: 'Validate and clean the data item',
        pattern: 'forEach' as OrchestrationPattern,
        patternConfig: {
          items: ['Dataset A', 'Dataset B', 'Dataset C'],
        },
      },
      {
        id: '2',
        name: 'Processing Logic',
        description: 'Apply different processing based on data type',
        prompt: 'Process data based on its characteristics',
        pattern: 'switch' as OrchestrationPattern,
        patternConfig: {
          cases: {
            numerical: 'Apply statistical analysis',
            textual: 'Perform NLP processing',
            mixed: 'Apply hybrid analysis',
            default: 'Standard processing',
          },
        },
      },
      {
        id: '3',
        name: 'Continuous Monitoring',
        description: 'Monitor processing until completion',
        prompt: 'Monitor and verify processing completion',
        pattern: 'while' as OrchestrationPattern,
        patternConfig: {
          condition: 'Processing not complete',
          maxIterations: 10,
        },
      },
    ],
  },
};

const initialRoles: Role[] = [
  {
    id: '1',
    name: 'Researcher',
    description: 'Gathers and analyzes information',
  },
  { id: '2', name: 'Writer', description: 'Creates engaging content' },
  {
    id: '3',
    name: 'Analyst',
    description: 'Provides data insights and recommendations',
  },
  { id: '4', name: 'Reviewer', description: 'Quality assurance and feedback' },
];

const initialSteps: Step[] = [
  {
    id: '1',
    name: 'Hello Test',
    description: 'Simple greeting test',
    prompt: 'Say hello and explain what you can do',
    pattern: 'sequential',
  },
];

export default function OrchestrationUIPage() {
  const [roles] = useState<Role[]>(initialRoles);
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [showRoles, setShowRoles] = useState(false); // Start with steps view for testing
  const [results, setResults] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [useRoles, setUseRoles] = useState(false); // Toggle for role-based vs step-only execution

  const runOrchestration = trpc.runOrchestration.useMutation();

  const loadTemplate = (templateKey: string) => {
    const template =
      complexOrchestrationTemplates[
        templateKey as keyof typeof complexOrchestrationTemplates
      ];
    if (template) {
      setSteps(template.steps);
      setSelectedTemplate(templateKey);
      setUseRoles(false); // Templates are step-based by default
    }
  };

  const handleRunOrchestration = async () => {
    setIsRunning(true);
    try {
      const orchestrationConfig = {
        roles: useRoles
          ? roles.map(({ name, description }) => ({ name, description }))
          : undefined,
        steps: steps.map(({ prompt, pattern, patternConfig }) => ({
          prompt,
          pattern: pattern || 'sequential',
          patternConfig: patternConfig || {},
        })),
      };

      console.log('🚀 Running orchestration:', orchestrationConfig);
      const response = await runOrchestration.mutateAsync(orchestrationConfig);
      setResults(response);
    } catch (error: any) {
      console.error('❌ Orchestration failed:', error);
      setResults({ error: error.message || 'Unknown error occurred' });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'system-ui',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <h1>🌋 Advanced Orchestration UI</h1>
        <p>Test complex orchestration patterns with volcano-sdk</p>
      </div>

      {/* Template Selector */}
      <div
        style={{
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '15px',
          background: '#f8f9fa',
        }}
      >
        <h3>📋 Complex Orchestration Templates (Step-Only Testing)</h3>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={useRoles}
              onChange={e => setUseRoles(e.target.checked)}
            />
            <span>Use Roles (when stable, we&apos;ll combine both)</span>
          </label>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {Object.entries(complexOrchestrationTemplates).map(
            ([key, template]) => (
              <button
                key={key}
                onClick={() => loadTemplate(key)}
                style={{
                  padding: '10px 15px',
                  background: selectedTemplate === key ? '#007acc' : '#e9ecef',
                  color: selectedTemplate === key ? 'white' : 'black',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {template.name}
              </button>
            )
          )}
        </div>
        {selectedTemplate && (
          <p style={{ marginTop: '10px', fontStyle: 'italic' }}>
            {
              complexOrchestrationTemplates[
                selectedTemplate as keyof typeof complexOrchestrationTemplates
              ].description
            }
          </p>
        )}
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', gap: '20px', minHeight: '600px' }}>
        {/* Left Panel: Roles and Steps */}
        <div
          style={{
            width: '400px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '15px',
          }}
        >
          <h2>Configuration</h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button
              onClick={() => setShowRoles(true)}
              style={{
                padding: '8px',
                background: showRoles ? '#007acc' : '#eee',
                color: showRoles ? 'white' : 'black',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              Roles ({roles.length})
            </button>
            <button
              onClick={() => setShowRoles(false)}
              style={{
                padding: '8px',
                background: !showRoles ? '#007acc' : '#eee',
                color: !showRoles ? 'white' : 'black',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              Steps ({steps.length})
            </button>
          </div>
          {showRoles ? (
            <RoleManager />
          ) : (
            <StepManager steps={steps} setSteps={setSteps} />
          )}
        </div>

        {/* Middle Panel: Enhanced Visualization */}
        <div
          style={{
            flex: 1,
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '15px',
          }}
        >
          <h2>🔄 Flow Visualization</h2>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
          >
            {steps.map((step, index) => (
              <div
                key={step.id}
                style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                <div
                  style={{
                    padding: '15px',
                    border: `2px solid ${getPatternColor(step.pattern)}`,
                    borderRadius: '8px',
                    background: `${getPatternColor(step.pattern)}15`,
                    minWidth: '200px',
                  }}
                >
                  <div style={{ fontWeight: 'bold' }}>{step.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Pattern: {step.pattern || 'sequential'}
                  </div>
                  <div style={{ fontSize: '11px', marginTop: '5px' }}>
                    {step.description}
                  </div>
                  {step.patternConfig && (
                    <div
                      style={{
                        fontSize: '10px',
                        marginTop: '5px',
                        background: '#f0f0f0',
                        padding: '3px',
                        borderRadius: '3px',
                      }}
                    >
                      {JSON.stringify(step.patternConfig, null, 1)}
                    </div>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div style={{ fontSize: '24px' }}>→</div>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={handleRunOrchestration}
            disabled={isRunning}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: isRunning ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
            }}
          >
            {isRunning ? '🔄 Running...' : '🚀 Run Complex Orchestration'}
          </button>
        </div>

        {/* Right Panel: Enhanced Results */}
        <div
          style={{
            width: '400px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            padding: '15px',
          }}
        >
          <h2>📊 Results</h2>
          {results ? (
            <div style={{ maxHeight: '500px', overflow: 'auto' }}>
              {results.error ? (
                <div
                  style={{
                    color: 'red',
                    padding: '10px',
                    background: '#ffe6e6',
                    borderRadius: '4px',
                  }}
                >
                  <strong>Error:</strong> {results.error}
                </div>
              ) : (
                <pre
                  style={{
                    fontSize: '12px',
                    background: '#f8f9fa',
                    padding: '10px',
                    borderRadius: '4px',
                  }}
                >
                  {JSON.stringify(results, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>
              No results yet. Select a template and run the orchestration.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function getPatternColor(pattern?: OrchestrationPattern): string {
  const colors = {
    sequential: '#007acc',
    parallel: '#28a745',
    branch: '#ffc107',
    retry: '#dc3545',
    while: '#6f42c1',
    forEach: '#fd7e14',
    switch: '#20c997',
  };
  return colors[pattern || 'sequential'] || '#007acc';
}

function StepManager({
  steps,
  setSteps,
}: {
  steps: Step[];
  setSteps: (steps: Step[]) => void;
}) {
  const addStep = () => {
    const newStep = {
      id: Date.now().toString(),
      name: 'New Step',
      description: 'New step description',
      prompt: 'New prompt',
      pattern: 'sequential' as OrchestrationPattern,
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (
    id: string,
    field: 'name' | 'description' | 'prompt' | 'pattern',
    value: string
  ) => {
    const updatedSteps = steps.map(step =>
      step.id === id ? { ...step, [field]: value } : step
    );
    setSteps(updatedSteps);
  };

  const updateStepPatternConfig = (id: string, config: any) => {
    const updatedSteps = steps.map(step =>
      step.id === id ? { ...step, patternConfig: config } : step
    );
    setSteps(updatedSteps);
  };

  const deleteStep = (id: string) => {
    const updatedSteps = steps.filter(step => step.id !== id);
    setSteps(updatedSteps);
  };

  return (
    <div>
      <h3>🔧 Steps Configuration</h3>
      {steps.map(step => (
        <div
          key={step.id}
          style={{
            padding: '15px',
            border: `2px solid ${getPatternColor(step.pattern)}`,
            borderRadius: '8px',
            marginBottom: '15px',
            background: `${getPatternColor(step.pattern)}08`,
          }}
        >
          <input
            type="text"
            value={step.name}
            onChange={e => updateStep(step.id, 'name', e.target.value)}
            style={{
              display: 'block',
              width: '100%',
              marginBottom: '8px',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
            }}
            placeholder="Step name"
          />
          <textarea
            value={step.description}
            onChange={e => updateStep(step.id, 'description', e.target.value)}
            style={{
              display: 'block',
              width: '100%',
              marginBottom: '8px',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              resize: 'vertical',
            }}
            placeholder="Step description"
            rows={2}
          />
          <textarea
            value={step.prompt}
            onChange={e => updateStep(step.id, 'prompt', e.target.value)}
            style={{
              display: 'block',
              width: '100%',
              marginBottom: '8px',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              resize: 'vertical',
            }}
            placeholder="Step prompt"
            rows={3}
          />
          <select
            value={step.pattern || 'sequential'}
            onChange={e => updateStep(step.id, 'pattern', e.target.value)}
            style={{
              display: 'block',
              width: '100%',
              marginBottom: '8px',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
            }}
          >
            <option value="sequential">🔄 Sequential</option>
            <option value="parallel">⚡ Parallel</option>
            <option value="branch">🌲 Branch</option>
            <option value="retry">🔁 Retry</option>
            <option value="while">🔄 While Loop</option>
            <option value="forEach">📋 For Each</option>
            <option value="switch">🔀 Switch</option>
          </select>

          {/* Pattern-specific configuration */}
          {step.pattern === 'parallel' && (
            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>
                Parallel Branches (JSON):
              </label>
              <textarea
                value={JSON.stringify(
                  step.patternConfig?.branches || [],
                  null,
                  2
                )}
                onChange={e => {
                  try {
                    const branches = JSON.parse(e.target.value);
                    updateStepPatternConfig(step.id, { branches });
                  } catch {}
                }}
                style={{
                  width: '100%',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
                rows={3}
                placeholder='["Task 1", "Task 2", "Task 3"]'
              />
            </div>
          )}

          {step.pattern === 'retry' && (
            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>
                Max Attempts:
              </label>
              <input
                type="number"
                value={step.patternConfig?.maxAttempts || 3}
                onChange={e =>
                  updateStepPatternConfig(step.id, {
                    ...step.patternConfig,
                    maxAttempts: parseInt(e.target.value),
                  })
                }
                style={{ width: '100%', padding: '4px' }}
                min="1"
                max="10"
              />
            </div>
          )}

          {step.pattern === 'while' && (
            <div style={{ marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>
                Max Iterations:
              </label>
              <input
                type="number"
                value={step.patternConfig?.maxIterations || 5}
                onChange={e =>
                  updateStepPatternConfig(step.id, {
                    ...step.patternConfig,
                    maxIterations: parseInt(e.target.value),
                  })
                }
                style={{ width: '100%', padding: '4px' }}
                min="1"
                max="20"
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => deleteStep(step.id)}
              style={{
                padding: '6px 12px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
              }}
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={addStep}
        style={{
          padding: '10px 15px',
          background: '#007acc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          width: '100%',
        }}
      >
        ➕ Add Step
      </button>
    </div>
  );
}
