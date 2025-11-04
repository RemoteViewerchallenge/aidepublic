import { describe, expect, it, vi } from 'vitest';

import type { Role } from '../src/orchestration-creator';
import { createOrchestration } from '../src/orchestration-creator';
import { agent } from '../src/volcano-sdk';

describe('createOrchestration', () => {
  const llmMock = {
    gen: vi.fn().mockResolvedValue('mock llm output'),
    genWithTools: vi.fn().mockResolvedValue({ content: 'mock llm output' }),
    genStream: vi.fn(),
  };

  it('should create a non-role-based orchestration', async () => {
    const orchestration = createOrchestration({
      steps: [
        { prompt: 'Step 1', llm: llmMock as any },
        { prompt: 'Step 2', llm: llmMock as any },
      ],
    });

    const results = await orchestration.run();
    expect(results).toHaveLength(2);
    expect(results[0].llmOutput).toBe('mock llm output');
    expect(results[1].llmOutput).toBe('mock llm output');
  });

  it('should create a role-based orchestration', async () => {
    const researcher: Role = {
      name: 'researcher',
      description: 'test researcher',
      agent: agent({
        llm: llmMock as any,
        name: 'researcher',
        description: 'test researcher',
      }),
    };

    const writer: Role = {
      name: 'writer',
      description: 'test writer',
      agent: agent({
        llm: llmMock as any,
        name: 'writer',
        description: 'test writer',
      }),
    };

    const orchestration = createOrchestration({
      roles: [researcher, writer],
      steps: [{ prompt: 'Test prompt', llm: llmMock as any }],
    });

    const results = await orchestration.run();
    expect(results).toHaveLength(1);
  });
});
