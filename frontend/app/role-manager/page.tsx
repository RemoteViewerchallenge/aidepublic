'use client';

import { useState, useEffect } from 'react';
import RoleManager, { Role } from './RoleManager';
import MonacoGrid from './MonacoGrid';
import ModelAssigner from '../components/ModelAssigner';
import { trpc } from '../utils/trpc';

export default function RoleManagerPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [editorContents, setEditorContents] = useState<string[]>(Array(8).fill(''));
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const availableModels = await trpc.getModelsFromDatabase.query();
        setModels(availableModels.map(m => ({ id: m.id, name: m.name })));
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    };
    fetchModels();
  }, []);

  const handleRoleChange = (editorIndex: number, roleId: string) => {
    const selectedRole = roles.find(role => role.id === roleId);
    if (selectedRole) {
      const newContents = [...editorContents];
      newContents[editorIndex] = selectedRole.prompt;
      setEditorContents(newContents);
      setCurrentRole(selectedRole);
    }
  };

  const handleContentChange = (editorIndex: number, content: string) => {
    const newContents = [...editorContents];
    newContents[editorIndex] = content;
    setEditorContents(newContents);
  };

  return (
    <div>
      <RoleManager savedRoles={roles} setSavedRoles={setRoles} />
      <ModelAssigner role={currentRole} models={models} />
      <MonacoGrid
        roles={roles}
        onRoleChange={handleRoleChange}
        onContentChange={handleContentChange}
        editorContents={editorContents}
      />
    </div>
  );
}