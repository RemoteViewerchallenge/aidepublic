/**
 * @file Implements a CircuitBreaker pattern to prevent repeated calls to a failing service.
 *
 * Main Values Passed:
 * The `CircuitBreaker` class has a `call` method that takes a `function to execute`.
 * It returns the function's result, but will throw a `CircuitBreakerOpenError` if
 * the function has failed too many times recently, preventing further calls.
 *
 * Why It's Necessary:
 * This prevents a "thundering herd" problem where our application repeatedly hammers
 * a service that is down or struggling. It gives the failing service time to recover,
 * making our entire system more stable and resilient. It's a critical pattern for
 * any distributed system. 
 *
 * Main Parts:
 * - `class CircuitBreaker`: The main class implementing the state machine.
 * - `class CircuitBreakerOpenError`: The custom error thrown when the circuit is open.
 */

type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Custom error thrown when an operation is attempted while the circuit is open.
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

export interface CircuitBreakerOptions {
  /** Number of failures required to open the circuit. */
  failureThreshold: number;
  /** Number of successes in HALF_OPEN state to close the circuit. */
  successThreshold: number;
  /** Time in milliseconds to wait in the OPEN state before moving to HALF_OPEN. */
  cooldownPeriod: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  successThreshold: 2,
  cooldownPeriod: 60000, // 1 minute
};

/**
 * A CircuitBreaker class that wraps an asynchronous function to prevent repeated
 * calls to a service that is consistently failing.
 *
 * @example
 * const breaker = new CircuitBreaker();
 * try {
 *   const result = await breaker.call(() => fetch('https://api.example.com'));
 * } catch (error) {
 *   if (error instanceof CircuitBreakerOpenError) {
 *     // Circuit is open, handle fallback
 *   } else {
 *     // The original operation failed
 *   }
 * }
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private readonly options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  public async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.options.cooldownPeriod) {
        this.state = 'HALF_OPEN';
        this.successes = 0;
      } else {
        throw new CircuitBreakerOpenError('Circuit is open. Call blocked.');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.reset();
      }
    } else {
      this.reset();
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN' || this.failures >= this.options.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  private reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
  }
}