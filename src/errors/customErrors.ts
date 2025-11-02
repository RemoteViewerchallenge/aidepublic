import { ProviderId } from '../types/provider';

/**
 * A base error for issues related to a specific provider.
 */
export class ProviderError extends Error {
  public providerId: ProviderId;
  public originalError?: any;

  constructor(message: string, providerId: ProviderId, originalError?: any) {
    super(message);
    this.name = 'ProviderError';
    this.providerId = providerId;
    this.originalError = originalError;
  }
}

/**
 * An error for failed API requests, including HTTP status and body.
 */
export class ApiError extends ProviderError {
  public status: number;
  public body: string;

  constructor(
    message: string,
    providerId: ProviderId,
    status: number,
    body: string
  ) {
    super(message, providerId);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * An error for when reading state from the filesystem fails.
 */
export class StateReadError extends Error {
  public originalError?: any;

  constructor(message: string, originalError?: any) {
    super(message);
    this.name = 'StateReadError';
    this.originalError = originalError;
  }
}
