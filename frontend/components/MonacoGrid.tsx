'use client';

import { useState } from 'react';
import SharedMonacoEditor from '../../components/SharedMonacoEditor';
import { Role } from './RoleManager';
import { trpc } from '../../utils/trpc';

interface MonacoGridProps {
  roles: Role[];
  onRoleChange: (editorIndex: number, roleId: string) => void;
  onContentChange: (editorIndex: number, content: string) => void;
  editorContents: string[];
  onGenerate: (editorIndex: number, role: Role) => void;
}

export default function MonacoGrid({
  roles,
  onRoleChange,
  onContentChange,
  editorContents,
  onGenerate,
}: MonacoGridProps) {
  const [selectedRoles, setSelectedRoles] = useState<(Role | null)[]>(Array(8).fill(null));

  const handleRoleSelection = (editorIndex: number, roleId: string) => {
    const role = roles.find((r) => r.id === roleId) || null;
    const newSelectedRoles = [...selectedRoles];
    newSelectedRoles[editorIndex] = role;
    setSelectedRoles(newSelectedRoles);
    onRoleChange(editorIndex, roleId);
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: '1rem',
        height: 'calc(100vh - 200px)',
      }}
    >
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ border: '1px solid #ccc', padding: '1rem' }}>
          <div>
            <select
              onChange={(e) => handleRoleSelection(i, e.target.value)}
              style={{ marginBottom: '1rem', width: '100%' }}
            >
              <option value="">Select a Role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.title}
                </option>
              ))}
            </select>
          </div>
          <SharedMonacoEditor
            value={editorContents[i]}
            onChange={(value) => onContentChange(i, value || '')}
            language="plaintext"
            theme="vs-dark"
            height="300px"
          />
          <button
            onClick={() => onGenerate(i, selectedRoles[i]!)}
            disabled={!selectedRoles[i]}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              border: 'none',
              background: selectedRoles[i] ? '#007acc' : '#ccc',
              color: 'white',
              borderRadius: '4px',
            }}
          >
            Generate
          </button>
        </div>
      ))}
    </div>
  );
}