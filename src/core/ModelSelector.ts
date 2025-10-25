/**
 * @file This is the 'brain' of the operation, implementing our core business logic.
 *
 * Main Values Passed:
 * It takes a `list of available models` and a `task description`. It returns a
 * `single chosen model` that is the best fit for the job.
 *
 * Why It's Necessary:
 * This module executes our "Free Tier Arbitrage" strategy. It ensures we always
 * use the most cost-effective model that can still do the job, preserving our
 * more powerful, rate-limited models for when they are truly needed.
 * 
 * Future Vision: This selector will evolve beyond simple keyword matching.
 * A future version will accept structured requirements (e.g., `{ "contextWindow": { "gt": 70000 }, "capabilities": ["tool_calling", "reasoning"] }`)
 * to allow for precise, programmatic selection of models. This will be essential for
 * advanced agents that need to dynamically choose the right tool for a sub-task.
 *
 * Main Parts:
 * - `class ModelSelector`: The main class containing the selection logic.
 *
 * Key Methods:
 * - `selectBestModel(availableModels, taskDescription)`: Selects the best model from a list based on the task and internal heuristics.
 */

import { Model } from '../types/provider';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('ModelSelector');

// Keywords that suggest a task requires tool-use capabilities.
const TOOL_USE_KEYWORDS = ['api', 'call', 'fetch', 'run', 'execute', 'database'];
// Keywords that suggest a task involves a long document.
const LONG_DOCUMENT_KEYWORDS = ['summarize', 'document', 'long text', 'article', 'report'];

export class ModelSelector {
  /**
   * Selects the best model from a list based on the task and internal heuristics.
   * @param availableModels - The list of healthy and available models.
   * @param taskDescription - A description of the task to be performed.
   * @returns The best model, or null if no suitable model is found.
   */
  public selectBestModel(availableModels: Model[], taskDescription: string): Model | null {
    if (availableModels.length === 0) {
      logger.warn({ method: 'selectBestModel', taskDescription }, 'No available models to select from.');
      return null;
    }

    const requiresToolUse = TOOL_USE_KEYWORDS.some(keyword => taskDescription.toLowerCase().includes(keyword));
    const isLongDocument = LONG_DOCUMENT_KEYWORDS.some(keyword => taskDescription.toLowerCase().includes(keyword));

    const scoredModels = availableModels.map(model => {
      let score = 0;
      // Prioritize models that support tool use if the task requires it.
      if (requiresToolUse && model.supportsToolUse) {
        score += 100;
      }
      // Add points for larger context windows, especially for long document tasks.
      if (model.contextWindow) {
        score += model.contextWindow / 1000; // Add a point per 1000 tokens
        if (isLongDocument) {
          score += model.contextWindow / 500; // Double the bonus for long doc tasks
        }
      }
      return { model, score };
    });

    // Sort by score in descending order
    scoredModels.sort((a, b) => b.score - a.score);

    const selectedModel = scoredModels[0].model;

    logger.info(
      { method: 'selectBestModel', selectedModelId: selectedModel.id, taskDescription },
      'Selected best model for task.'
    );
    return selectedModel;
  }
}