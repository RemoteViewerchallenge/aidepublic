/**
 * @file Configures our application-wide structured logger.
 *
 * ## Logging Convention
 *
 * To ensure logs are specific, filterable, and actionable, we follow a strict convention:
 *
 * - **`msg`**: A short, human-readable summary of the event.
 * - **`module`**: The name of the module where the log originates (e.g., "GeminiAdapter").
 * - **`method`**: The function or method name within the module.
 * - **`reason`**: (For errors/warnings) A machine-readable code for why an operation failed (e.g., "CIRCUIT_OPEN", "API_KEY_MISSING").
 * - **`provider`**: (For model operations) The name of the provider being used (e.g., "google").
 * - **`modelId`**: (For model operations) The specific ID of the model being used (e.g., "gemma-3").
 * - **`error`**: The full, serialized error object for deep debugging.
 * - **`correlationId`**: A unique ID to trace a single operation through the system.
 *
 * Why It's Necessary:
 * Centralizes logging configuration. All other modules will import and use this
 * same logger instance, ensuring that all log messages across the entire application
 * have a consistent format, level, and destination.
 *
 * Main Parts:
 * - `function createModuleLogger`: The factory function to create context-aware loggers.
 */

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

// Base logger configuration
const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  // Use pretty-printing in development, but structured JSON in production
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

/**
 * Creates a child logger with a specific module context.
 * This is the preferred way to create loggers for different parts of the application.
 *
 * @param moduleName - The name of the module (e.g., 'ProviderManager', 'GeminiAdapter').
 * @returns A pino logger instance with the module name bound as a property.
 *
 * @example
 * import { createModuleLogger } from './logger';
 * const logger = createModuleLogger('MyComponent');
 * logger.info({ method: 'initialize' }, 'Component initialized.');
 */
export const createModuleLogger = (moduleName: string) => {
  return logger.child({ module: moduleName });
};

export default logger;