'use client';

import { useState } from 'react';
import SharedMonacoEditor from '../../components/SharedMonacoEditor';
import { Role } from './RoleManager'; // Assuming Role type is exported from RoleManager

interface MonacoGridProps {
  roles: Role[];
  onRoleChange: (editorIndex: number, roleId: string) => void;
  onContentChange: (editorIndex: number, content: string) => void;
  editorContents: string[];
}

export default function MonacoGrid({ roles, onRoleChange, onContentChange, editorContents }: MonacoGridProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: '1rem', height: 'calc(100vh - 200px)' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ border: '1px solid #ccc', padding: '1rem' }}>
          <div>
            <select onChange={(e) => onRoleChange(i, e.target.value)} style={{ marginBottom: '1rem', width: '100%' }}>
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
        </div>
      ))}
    </div>
  );
}