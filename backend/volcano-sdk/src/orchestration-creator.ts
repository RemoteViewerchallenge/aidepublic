// src/orchestration-creator.ts
import type { AgentBuilder, Step } from './volcano-sdk';
import { agent } from './volcano-sdk';

export type Role = {
  name: string;
  description: string;
  agent: AgentBuilder;
};

export type OrchestrationConfig = {
  roles?: Role[];
  steps: Step[];
};

export type ComplexStep = {
  prompt: string;
  pattern?:
    | 'sequential'
    | 'parallel'
    | 'branch'
    | 'retry'
    | 'while'
    | 'forEach'
    | 'switch';
  patternConfig?: any;
};

export type ComplexOrchestrationConfig = {
  roles?: Role[];
  steps: ComplexStep[];
};

export function createOrchestration(config: OrchestrationConfig): AgentBuilder {
  const mainAgent = agent();

  if (config.roles && config.roles.length > 0) {
    // Role-based execution
    const agents = config.roles.map(role => role.agent);
    mainAgent.then({
      prompt: 'Execute the plan.',
      agents: agents,
    });
  } else {
    // Non-role-based execution
    config.steps.forEach(step => {
      mainAgent.then(step);
    });
  }

  return mainAgent;
}

export function createComplexOrchestration(
  config: ComplexOrchestrationConfig,
  llm: any
): AgentBuilder {
  const mainAgent = agent({ llm });

  // Process each step with its pattern
  config.steps.forEach((step, index) => {
    const pattern = step.pattern || 'sequential';

    switch (pattern) {
      case 'sequential':
        mainAgent.then({
          prompt: step.prompt,
          name: `Step ${index + 1}: ${pattern}`,
        });
        break;

      case 'parallel':
        // Create multiple agents for parallel execution
        if (
          step.patternConfig?.branches &&
          Array.isArray(step.patternConfig.branches)
        ) {
          const parallelAgents = step.patternConfig.branches.map(
            (branch: string) =>
              agent({ llm }).then({
                prompt: `${step.prompt} - Focus on: ${branch}`,
                name: `Parallel Branch: ${branch}`,
              })
          );

          mainAgent.then({
            prompt: `Coordinate parallel execution: ${step.prompt}`,
            agents: parallelAgents,
            name: `Step ${index + 1}: Parallel (${
              step.patternConfig.branches.length
            } branches)`,
          });
        } else {
          mainAgent.then({
            prompt: step.prompt,
            name: `Step ${index + 1}: ${pattern} (no branches configured)`,
          });
        }
        break;

      case 'retry':
        mainAgent.then({
          prompt: `${step.prompt}\n\nNote: This step will be retried up to ${
            step.patternConfig?.maxAttempts || 3
          } times if needed.`,
          name: `Step ${index + 1}: Retry (max ${
            step.patternConfig?.maxAttempts || 3
          } attempts)`,
          retry: {
            retries: step.patternConfig?.maxAttempts || 3,
            backoff: 1.5,
          },
        });
        break;

      case 'branch':
        // Use agents array to simulate branching
        const trueBranchAgent = agent({ llm }).then({
          prompt:
            step.patternConfig?.trueBranch ||
            `${step.prompt} (taking true path)`,
          name: 'True Branch',
        });

        const falseBranchAgent = agent({ llm }).then({
          prompt:
            step.patternConfig?.falseBranch ||
            `${step.prompt} (taking false path)`,
          name: 'False Branch',
        });

        mainAgent.then({
          prompt: `Branch decision for: ${step.prompt}`,
          agents: [trueBranchAgent], // For demo, always take true branch
          name: `Step ${index + 1}: Branch`,
        });
        break;

      case 'while':
        const maxIterations = step.patternConfig?.maxIterations || 5;
        for (let i = 0; i < maxIterations; i++) {
          mainAgent.then({
            prompt: `${step.prompt} (Iteration ${i + 1}/${maxIterations})`,
            name: `Step ${index + 1}: While Loop - Iteration ${i + 1}`,
          });
        }
        break;

      case 'forEach':
        const items = step.patternConfig?.items || [
          'Item 1',
          'Item 2',
          'Item 3',
        ];
        items.forEach((item: any, itemIndex: number) => {
          mainAgent.then({
            prompt: `${step.prompt}\n\nProcessing item: ${item}`,
            name: `Step ${index + 1}: ForEach - Item ${
              itemIndex + 1
            } (${item})`,
          });
        });
        break;

      case 'switch':
        const cases = step.patternConfig?.cases || {
          default: 'Default processing',
        };
        const firstCase = Object.keys(cases)[0];
        const selectedValue =
          cases[firstCase] || cases.default || 'Standard processing';

        mainAgent.then({
          prompt: `${step.prompt}\n\nSwitch case selected: ${firstCase}\nProcessing: ${selectedValue}`,
          name: `Step ${index + 1}: Switch (case: ${firstCase})`,
        });
        break;

      default:
        mainAgent.then({
          prompt: step.prompt,
          name: `Step ${index + 1}: Default`,
        });
    }
  });

  return mainAgent;
}
