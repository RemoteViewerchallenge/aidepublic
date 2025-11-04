// examples/orchestration-creator-example.ts
import type { Role } from '../src/orchestration-creator.js';
import { createOrchestration } from '../src/orchestration-creator.js';
import type { StepResult } from '../src/volcano-sdk.js';
import { agent } from '../src/volcano-sdk.js';
// import llmOpenAI from the correct location or define it here if needed
// Mock llmOpenAI implementation for example purposes
const llmOpenAI = (config: { apiKey: string; model: string }) => ({
  id: `mock-llm-${config.model}`,
  generate: async (prompt: string) => ({
    output: `Mocked LLM output for prompt: "${prompt}" (model: ${config.model})`,
  }),
  gen: async (prompt: string) =>
    `Mocked gen output for prompt: "${prompt}" (model: ${config.model})`,
  genWithTools: async (prompt: string, tools: any) => ({
    content: `Mocked genWithTools output for prompt: "${prompt}" (model: ${config.model})`,
    toolCalls: [],
    // Reference 'tools' to avoid unused variable error
    usedTools: tools,
  }),
  genStream: async function* (prompt: string) {
    yield `Mocked genStream output for prompt: "${prompt}" (model: ${config.model})`;
  },
  metadata: {
    provider: 'mock',
    model: config.model,
  },
  // Add missing properties for LLMHandle compatibility
  client: {}, // Mock client object
  model: config.model,
});

// Run with: npx tsx examples/orchestration-creator-example.ts

(async () => {
  const llm = llmOpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    model: 'gpt-4o-mini',
  });

  // --- Example 1: Role-Based Orchestration ---
  console.log('=== Running Role-Based Orchestration ===');

  const researcher: Role = {
    name: 'researcher',
    description:
      'Analyzes topics and provides factual, well-researched information.',
    agent: agent({
      llm,
      name: 'researcher',
      description:
        'Analyzes topics and provides factual, well-researched information.',
    }),
  };

  const writer: Role = {
    name: 'writer',
    description:
      'Creates engaging, creative content with excellent storytelling.',
    agent: agent({
      llm,
      name: 'writer',
      description:
        'Creates engaging, creative content with excellent storytelling.',
    }),
  };

  const roleBasedOrchestration = createOrchestration({
    roles: [researcher, writer],
    steps: [
      { prompt: 'Write a short paragraph about the history of the internet.' },
    ],
  });

  const roleResults = await roleBasedOrchestration.run();
  console.log('Role-Based Results:');
  roleResults.forEach((result: StepResult, index: number) => {
    console.log(`  Step ${index + 1}: ${result.llmOutput}`);
  });

  // --- Example 2: Non-Role-Based Orchestration ---
  console.log('\n=== Running Non-Role-Based Orchestration ===');

  const nonRoleBasedOrchestration = createOrchestration({
    steps: [
      { prompt: 'What is the capital of France?' },
      { prompt: 'Summarize the answer in one word.' },
    ],
  });

  const nonRoleResults = await nonRoleBasedOrchestration.run();
  console.log('Non-Role-Based Results:');
  nonRoleResults.forEach((result: StepResult, index: number) => {
    console.log(`  Step ${index + 1}: ${result.llmOutput}`);
  });
})();
