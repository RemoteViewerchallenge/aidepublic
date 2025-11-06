'use client';

import React, { useEffect, useState } from 'react';

interface Model {
  id: string;
  name: string;
  apiProvider: 'openrouter' | 'google' | 'aistudio';
  isFree: boolean;
}

export default function PureMonacoPage() {
  const [isClient, setIsClient] = useState(false);
  const [MonacoEditor, setMonacoEditor] = useState<any>(null);
  const [status, setStatus] = useState('Initializing...');

  const [prompt, setPrompt] = useState('// Write your prompt here...\n');
  const [generatedText, setGeneratedText] = useState(
    '// AI-generated text will appear here.'
  );

  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !MonacoEditor) {
      import('@monaco-editor/react')
        .then(module => {
          setMonacoEditor(() => module.Editor);
          setStatus('Monaco Editor module loaded. Fetching models...');
          fetchModels();
        })
        .catch(error => {
          console.error('Failed to load Monaco Editor:', error);
          setStatus('❌ Failed to load Monaco Editor');
        });
    }
    // The fetchModels function is defined below and doesn't need to be in the dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, MonacoEditor]);

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/trpc/getModelsFromDatabase');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // tRPC responses can be an array, so we handle that case
      const result = (Array.isArray(data) ? data[0] : data).result.data.map((m: any) => ({...m, apiProvider: m.provider}));
      setModels(result);
      setStatus(`✅ Ready. Found ${result.length} models.`);
      if (result.length > 0) {
        setSelectedModel(result[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
      setStatus('❌ Failed to fetch models from API.');
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setStatus('⏳ Syncing models with providers...');
    try {
      const response = await fetch('/api/trpc/model.syncModelsWithProviders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const result = (Array.isArray(data) ? data[0] : data).result.data;

      setStatus(
        `✅ Sync complete! Found ${result.aiStudioCount + result.openRouterCount} models. Refreshing list...`
      );
      // After a successful sync, re-fetch the models to update the dropdown
      await fetchModels();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStatus(`❌ Sync failed: ${errorMessage}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !selectedModel) {
      setStatus('⚠️ Please enter a prompt and select a model.');
      return;
    }

    const model = models.find(m => m.id === selectedModel);
    if (!model) {
      setStatus('❌ Selected model not found.');
      return;
    }

    setIsGenerating(true);
    setStatus(`⏳ Generating with ${model.name}...`);

    try {
      const response = await fetch('/api/trpc/bareBones.generateBareBones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          modelId: model.id,
          providerId: model.apiProvider,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API Error (${response.status}): ${errorText || 'Unknown error'}`
        );
      }

      const data = await response.json();
      const result = (Array.isArray(data) ? data[0] : data).result.data;

      setGeneratedText(result.content);
      setStatus(`✅ Generation complete with ${result.modelId}.`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('Generation failed:', error);
      setGeneratedText(`// Generation failed:\n${errorMessage}`);
      setStatus('❌ Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isClient) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Bare Bones Monaco Page</h1>
        <p>⏳ Initializing client-side rendering...</p>
      </div>
    );
  }

  if (!MonacoEditor) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Bare Bones Monaco Page</h1>
        <p>{status}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Bare Bones Monaco Page</h1>
      <p>Fetching models from the database. Sync with providers on demand.</p>

      <div
        style={{
          marginBottom: '15px',
          padding: '10px',
          background: '#f0f0f0',
          borderRadius: '4px',
        }}
      >
        <strong>Status:</strong> {status}
      </div>

      <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
        <select
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
          disabled={models.length === 0 || isGenerating}
          style={{ padding: '8px', flexGrow: 1 }}
        >
          {models.length === 0 ? (
            <option>Loading models...</option>
          ) : (
            models.map(model => (
              <option key={model.id} value={model.id}>
                {`[${model.apiProvider}] ${model.name} ${
                  model.isFree ? '(Free)' : ''
                }`}
              </option>
            ))
          )}
        </select>
        <button
          onClick={handleSync}
          disabled={isSyncing || isGenerating}
          style={{ padding: '8px 16px', whiteSpace: 'nowrap' }}
        >
          {isSyncing ? '⏳ Syncing...' : '🔄 Sync Models'}
        </button>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          style={{ padding: '8px 16px' }}
        >
          {isGenerating ? '⏳ Generating...' : '🚀 Generate'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h3>Prompt</h3>
          <MonacoEditor
            height="60vh"
            language="markdown"
            theme="vs-dark"
            value={prompt}
            onChange={(value: string | undefined) => setPrompt(value || '')}
            options={{ minimap: { enabled: false } }}
          />
        </div>
        <div>
          <h3>Generated Text</h3>
          <MonacoEditor
            height="60vh"
            language="markdown"
            theme="vs-dark"
            value={generatedText}
            options={{ readOnly: true, minimap: { enabled: false } }}
          />
        </div>
      </div>
    </div>
  );
}
