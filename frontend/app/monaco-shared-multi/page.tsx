'use client';

import { useEffect, useState } from 'react';
import { trpc } from '../../utils/trpc';

import MonacoGrid from '../../components/MonacoGrid';
import RoleManager from '../../components/RoleManager';
import ModelAssigner from '../../components/ModelAssigner';

import { RoleCategory } from '../../components/RoleManager';

// Simple types
interface Role {
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

interface GenerationResult {
  text: string;
  modelId?: string;
  providerId?: string;
}

export default function MonacoSharedMultiPage() {
  // Role manager state (working foundation)
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [savedRoles, setSavedRoles] = useState<Role[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [modelStats, setModelStats] = useState<ModelStats>({ total: 0, matching: 0, byProvider: {} });

  // 8-column workspace state for shared Monaco editors
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

  // Add state for current model selection display
  const [currentModelDisplay, setCurrentModelDisplay] = useState<string>(
    'Model will be selected on generation'
  );

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const availableModels = await trpc.getModelsFromDatabase.query();
        setModels(availableModels);
      } catch (error) {
        console.error('Failed to fetch models:', error);
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    if (models.length > 0 && currentRole) {
      const matchingModels = models.filter((model: any) => {
        const params = currentRole.parameters;
        if (params.minContext && model.contextLength < params.minContext) return false;
        if (params.maxContext && model.contextLength > params.maxContext) return false;
        if (params.hasTools && !model.capabilities?.toolCalling) return false;
        if (params.vision && !model.capabilities?.vision) return false;
        if (params.embed && !model.capabilities?.embedding) return false;
        return true;
      });

      const byProvider: Record<string, number> = {};
      matchingModels.forEach((model: any) => {
        byProvider[model.provider] = (byProvider[model.provider] || 0) + 1;
      });

      setModelStats({
        total: models.length,
        matching: matchingModels.length,
        byProvider,
      });
    }
  }, [models, currentRole]);

  // 8-column workspace functions
  const updateEditorValue = (columnIndex: number, value: string) => {
    const newValues = [...editorValues];
    newValues[columnIndex] = value;
    setEditorValues(newValues);
  };

  const assignRoleToColumn = (columnIndex: number, roleId: string) => {
    const role = savedRoles.find(r => r.id === roleId) || null;
    const newColumnRoles = [...columnRoles];
    newColumnRoles[columnIndex] = role;
    setColumnRoles(newColumnRoles);

    if (role) {
      const newEditorValues = [...editorValues];
      newEditorValues[columnIndex] = role.prompt;
      setEditorValues(newEditorValues);
    }
  };

  // Generate content for a specific column using its specific prompt and assigned role
  const generateForColumn = async (columnIndex: number) => {
    const editorValue = editorValues[columnIndex];
    if (!editorValue.trim()) return;

    // Use column-specific role if assigned, otherwise fall back to the first saved role
    const roleToUse = columnRoles[columnIndex] || savedRoles[0];

    if (!roleToUse) {
      alert('Please select a role or create one first.');
      return;
    }

    const updatedGenerating = [...isGenerating];
    updatedGenerating[columnIndex] = true;
    setIsGenerating(updatedGenerating);

    try {
      const result = await generateWithLLM(editorValue, roleToUse);
      const newValues = [...editorValues];
      // Append the response to the existing content
      const separator = '\n\n--- LLM Response ---\n';
      newValues[columnIndex] = editorValue + separator + result.text;
      setEditorValues(newValues);

      const newSelectedModels = [...selectedModels];
      newSelectedModels[columnIndex] = result.modelId
        ? `${result.providerId || 'unknown provider'} • ${result.modelId}`
        : 'No model information returned';
      setSelectedModels(newSelectedModels);

      // Update global current model display
      setCurrentModelDisplay(
        result.modelId
          ? `${result.providerId || 'unknown provider'} • ${result.modelId}`
          : 'No model information returned'
      );
    } catch (error) {
      console.error('Generation failed:', error);
      const newValues = [...editorValues];
      const separator = '\n\n--- Error ---\n';
      newValues[columnIndex] = editorValue + separator + `❌ Error: ${error}`;
      setEditorValues(newValues);

      const newSelectedModels = [...selectedModels];
      newSelectedModels[columnIndex] = 'Model selection failed';
      setSelectedModels(newSelectedModels);

      // Update global current model display on failure
      setCurrentModelDisplay('Generation failed');
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
      const result = await trpc.generateContent.mutate({
        prompt,
        systemPrompt: role.prompt,
        modelCriteria: {
          minContext: role.parameters.minContext,
          maxContext: role.parameters.maxContext,
          toolCalling: role.parameters.hasTools,
          vision: role.parameters.vision,
        },
      });

      return {
        text: result.content || 'No content generated',
        modelId: result.modelId,
        providerId: result.providerId,
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
      <h1>🎭 Multi-Shared Monaco Workspace with Role Manager</h1>

      {/* Current Model Display */}
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

      <RoleManager
        savedRoles={savedRoles}
        setSavedRoles={setSavedRoles}
        modelStats={modelStats}
        setCurrentRoleForStats={setCurrentRole}
      />
      <ModelAssigner role={currentRole} models={models.map(m => ({ id: m.id, name: m.name }))} />
      <MonacoGrid
        roles={savedRoles}
        onRoleChange={assignRoleToColumn}
        onContentChange={updateEditorValue}
        editorContents={editorValues}
        onGenerate={generateForColumn}
      />
    </div>
  );
}