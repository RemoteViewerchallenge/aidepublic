'use client';

import { useState, useEffect } from 'react';
import { Role } from './RoleManager';

interface Model {
  id: string;
  name: string;
}

interface ModelAssignerProps {
  role: Role | null;
  models: Model[];
}

export default function ModelAssigner({ role, models }: ModelAssignerProps) {
  const [assignedModel, setAssignedModel] = useState<Model | null>(null);

  useEffect(() => {
    if (role && models.length > 0) {
      if (role.category === 'errand') {
        // For errands, select a random model every time.
        const randomIndex = Math.floor(Math.random() * models.length);
        setAssignedModel(models[randomIndex]);
      } else if (role.category === 'job') {
        // For jobs, select a model and stick with it for the session.
        // We'll just select the first model for simplicity.
        setAssignedModel(models[0]);
      } else if (role.category === 'career') {
        // For careers, a specific model should be assigned.
        // We'll select a model that has "career" in its name, or default to the first model.
        const careerModel = models.find(m => m.name.toLowerCase().includes('career')) || models[0];
        setAssignedModel(careerModel);
      }
    }
  }, [role, models]);

  return (
    <div style={{ border: '1px solid #333', padding: '10px', borderRadius: '8px', marginTop: '10px', background: '#2d2d2d' }}>
      <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Assigned Model</h3>
      {assignedModel ? (
        <p style={{ margin: 0 }}>
          <strong>{assignedModel.name}</strong> ({assignedModel.id})
        </p>
      ) : (
        <p style={{ margin: 0, fontStyle: 'italic', color: '#888' }}>No model assigned.</p>
      )}
    </div>
  );
}