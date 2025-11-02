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
};

const initialRoles: Role[] = [
  { id: '1', name: 'Researcher', description: 'Gathers information' },
  { id: '2', name: 'Writer', description: 'Writes content' },
];

const initialSteps: Step[] = [
  {
    id: '1',
    name: 'Step 1',
    description: 'Initial research',
    prompt: 'Research the topic',
  },
  {
    id: '2',
    name: 'Step 2',
    description: 'Drafting the document',
    prompt: 'Draft the document',
  },
];

export default function OrchestrationUIPage() {
  const [roles] = useState<Role[]>(initialRoles);
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [showRoles, setShowRoles] = useState(true);
  const [results, setResults] = useState<any>(null);

  const runOrchestration = trpc.runOrchestration.useMutation();

  const handleRunOrchestration = async () => {
    const orchestrationConfig = {
      roles: roles.map(({ name, description }) => ({ name, description })),
      steps: steps.map(({ prompt }) => ({ prompt })),
    };
    const response = await runOrchestration.mutateAsync(orchestrationConfig);
    setResults(response);
  };

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'system-ui',
        display: 'flex',
        gap: '20px',
      }}
    >
      {/* Left Panel: Roles and Steps */}
      <div
        style={{
          width: '400px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '15px',
        }}
      >
        <h2>Orchestration</h2>
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
            Roles
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
            Steps
          </button>
        </div>
        {showRoles ? (
          <RoleManager />
        ) : (
          <StepManager steps={steps} setSteps={setSteps} />
        )}
      </div>

      {/* Middle Panel: Visualization */}
      <div
        style={{
          flex: 1,
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '15px',
        }}
      >
        <h2>Flow Visualization</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {steps.map((step, index) => (
            <div
              key={step.id}
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              <div
                style={{
                  padding: '15px',
                  border: '1px solid #007acc',
                  borderRadius: '4px',
                  background: '#f0f8ff',
                }}
              >
                {step.name}
              </div>
              {index < steps.length - 1 && (
                <div style={{ fontSize: '24px' }}>→</div>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={handleRunOrchestration}
          style={{
            marginTop: '20px',
            padding: '10px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Run Orchestration
        </button>
      </div>

      {/* Right Panel: Results */}
      <div
        style={{
          width: '400px',
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '15px',
        }}
      >
        <h2>Results</h2>
        {results ? (
          <pre>{JSON.stringify(results, null, 2)}</pre>
        ) : (
          <p>No results yet.</p>
        )}
      </div>
    </div>
  );
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
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (
    id: string,
    field: 'name' | 'description' | 'prompt',
    value: string
  ) => {
    const updatedSteps = steps.map(step =>
      step.id === id ? { ...step, [field]: value } : step
    );
    setSteps(updatedSteps);
  };

  const deleteStep = (id: string) => {
    const updatedSteps = steps.filter(step => step.id !== id);
    setSteps(updatedSteps);
  };

  return (
    <div>
      <h3>Steps</h3>
      {steps.map(step => (
        <div
          key={step.id}
          style={{
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        >
          <input
            type="text"
            value={step.name}
            onChange={e => updateStep(step.id, 'name', e.target.value)}
            style={{ display: 'block', width: '100%', marginBottom: '5px' }}
          />
          <textarea
            value={step.description}
            onChange={e => updateStep(step.id, 'description', e.target.value)}
            style={{ display: 'block', width: '100%', marginBottom: '5px' }}
          />
          <textarea
            value={step.prompt}
            onChange={e => updateStep(step.id, 'prompt', e.target.value)}
            style={{ display: 'block', width: '100%', marginBottom: '5px' }}
          />
          <button
            onClick={() => deleteStep(step.id)}
            style={{
              padding: '4px 8px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
            }}
          >
            Delete
          </button>
        </div>
      ))}
      <button
        onClick={addStep}
        style={{
          padding: '8px',
          background: '#007acc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
        }}
      >
        Add Step
      </button>
    </div>
  );
}
