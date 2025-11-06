
import { ProviderAdapter } from './BaseProviderAdapter';
import { Model, ChatCompletionRequest, ChatCompletionResponse, ProviderId } from '../types/provider';
import { getEnv } from '../utils/env';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('CopilotAdapter');

export class CopilotAdapter implements ProviderAdapter {
  readonly id: ProviderId = 'copilot';
  public isEnabled: boolean;
  private apiKey?: string;

  constructor() {
    this.apiKey = getEnv('COPILOT_API_KEY');
    if (!this.apiKey) {
      this.isEnabled = false;
      logger.warn(
        { method: 'constructor', reason: 'API_KEY_MISSING' },
        'COPILOT_API_KEY not found. The Copilot provider will be disabled.'
      );
    } else {
      this.isEnabled = true;
      logger.info(
        { method: 'constructor' },
        'Copilot provider initialized.'
      );
    }
  }

  async checkHealth(): Promise<boolean> {
    if (!this.isEnabled) return false;
    // TODO: Implement health check
    return Promise.resolve(false);
  }

  async fetchAvailableModels(): Promise<Model[]> {
    if (!this.isEnabled) return [];
    // TODO: Implement model fetching
    return Promise.resolve([]);
  }

  async executeChatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    if (!this.isEnabled) {
      throw new Error('Copilot adapter is not enabled.');
    }
    // TODO: Implement chat completion
    throw new Error('Method not implemented.');
  }
}
