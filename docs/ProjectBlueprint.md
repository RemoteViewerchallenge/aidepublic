# Project Blueprint: AI Resource Optimizer

This document is the succinct summary of our project's architecture, strategy, and conventions. It serves as the high-level guide for all development.

## 1. Project Profile: The Big Picture

We are building a sophisticated backend engine whose core mission is to enable a future workforce of autonomous AI agents to operate at scale with **zero token cost**.

This system acts as an intelligent gateway that manages and routes requests to a diverse portfolio of free-tier LLM models. It maximizes throughput and quality by being acutely aware of provider health, rate limits, and model capabilities.

### Core Philosophy

Our guiding principle is **"Exhaustive Fallbacks,"** as defined in `code_rules.md`. The system will always attempt to use the best free resource, fall back to the next-best model (first within the same provider, then to other providers), and only fail a task after all free possibilities have been exhausted.

*Implementation Note:* For our initial build with a single provider, this simplifies to intra-provider fallbacks only. The full inter-provider logic will be implemented when a second provider is added.

### Future Vision: Advanced Agentic Workflows

*   **Agentic Delegation:** The long-term plan is to support complex, multi-step tasks where a primary "orchestrator" agent can delegate simpler sub-tasks to cheaper models. For example, a tool-use model could decide to call an external API, but then delegate the task of "summarize this API response" to a non-tool-use model via the **Arbitrage Engine**. This maximizes cost-efficiency by using powerful models only for their unique capabilities.

*   **Structured Model Selection:** The `ModelSelector` will evolve beyond simple keyword matching. It will be designed to accept structured requirements (e.g., `{ "contextWindow": { "gt": 70000 }, "capabilities": ["tool_calling", "reasoning"] }`) to allow for precise, programmatic selection of models based on specific parameters. This will be essential for advanced agents that need to dynamically choose the right tool for a sub-task.

### Major Architectural Choices

*   **Language:** **TypeScript**. Chosen for its strict type system, which is essential for building a robust, safe, and maintainable autonomous system.
*   **Backend Engine:** **The Arbitrage Engine**. We are building our own custom orchestration engine based on the `ProviderManager.md` architecture. This gives us maximum control and transparency.
*   **API Layer:** **tRPC**. Chosen to provide compile-time, end-to-end type safety between our backend and any future clients (web or mobile), eliminating an entire class of API integration bugs.
*   **Resilience Strategy:** **Inspired, Custom Implementation**. We will implement our own `CircuitBreaker` and `retryWithBackoff` utilities, inspired by the professional patterns in `Kong/volcano-sdk`, to avoid dependency risk while leveraging expert design.
*   **Initial Providers:** We will start with two adapters:
    1.  **Google (Direct):** To access the massive free tiers for `Gemma` and `Gemini` models.
    2.  **OpenRouter (Aggregator):** To access a wide variety of free open-source models.

---

## 2. Code Index: Where Everything Belongs

This index maps the system's concepts to their location in the filesystem.

| Concept / Responsibility                      | Location in Code                               |
| --------------------------------------------- | ---------------------------------------------- |
| **The Project's "Constitution"**              | `docs/code_rules.md`                           |
| **The Engine's Blueprint**                    | `docs/ProviderManager.md`                      |
| **The Main Orchestration Engine**             | `src/core/ProviderManager.ts`                  |
| **The "Brain" for Model Selection**           | `src/core/ModelSelector.ts`                    |
| **The Public-Facing API Definition**          | `src/server/router.ts`                         |
| **The Application's Startup File**            | `src/server/index.ts`                          |
| **The "Contract" for All Providers**          | `src/adapters/BaseProviderAdapter.ts`          |
| **Specific Provider Logic (e.g., Google)**    | `src/adapters/GeminiAdapter.ts`                |
| **Specific Provider Logic (e.g., OpenRouter)**| `src/adapters/OpenRouterAdapter.ts`            |
| **Safe File Reading/Writing**                 | `src/state/StateRepository.ts`                 |
| **Resilience (Circuit Breaker)**              | `src/utils/resilience.ts`                      |
| **Resilience (Retries)**                      | `src/utils/async.ts`                           |
| **Centralized Logging Configuration**         | `src/utils/logger.ts`                          |
| **Custom Error Definitions**                  | `src/errors/customErrors.ts`                   |
| **Shared Data Structures (Models, etc.)**     | `src/types/provider.ts`                        |
| **Environment Variable Access**               | `src/utils/env.ts`                             |
| **Static Provider Configuration**             | `config/providers.json`                        |
| **Dynamic Provider Runtime State**            | `data/provider-state/[provider-id].json`       |

---

## 3. Naming Conventions

Consistent naming is critical for clarity and for our AI agents to understand and modify the codebase.

### Key Variable Names

These are the standard names for core instances used throughout the application.

| Variable Name       | Type                | Description                                                              |
| ------------------- | ------------------- | ------------------------------------------------------------------------ |
| `providerManager`   | `ProviderManager`   | The singleton instance of our main engine.                               |
| `modelSelector`     | `ModelSelector`     | The singleton instance of our selection logic "brain".                   |
| `stateRepository`   | `StateRepository`   | The singleton instance for handling all file-based state.                |
| `logger`            | `pino.Logger`       | The module-specific logger instance, created via `createModuleLogger()`. |

### Type and Class Naming

### Module Exports and Key Functions

To ensure consistency, the primary exports and functions within each module should follow these naming conventions.

| File Path                             | Primary Export(s)                                       | Key Methods / Properties                               |
| ------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| `src/adapters/BaseProviderAdapter.ts` | `interface ProviderAdapter`                             | `checkHealth()`, `fetchAvailableModels()`, `executeCall()` |
| `src/adapters/GeminiAdapter.ts`       | `class GeminiAdapter`                                   | Implements `ProviderAdapter` interface                 |
| `src/core/ProviderManager.ts`         | `class ProviderManager`                                 | `initialize()`, `getAvailableModels()`                 |
| `src/core/ModelSelector.ts`           | `class ModelSelector`                                   | `selectBestModel()`                                    |
| `src/errors/customErrors.ts`          | `ProviderError`, `ValidationError`, `StateError`        | (Error classes)                                        |
| `src/server/router.ts`                | `appRouter`, `type AppRouter`                           | Procedures like `getBestModelForTask`                  |
| `src/state/StateRepository.ts`        | `class StateRepository`                                 | `writeJson()`, `readJson()`                            |
| `src/types/provider.ts`               | `Model`, `HealthStatus`, `ProviderState`, `QuotaInfo`   | (Interfaces and Types)                                 |
| `src/utils/async.ts`                  | `function retryWithBackoff`                             | -                                                      |
| `src/utils/env.ts`                    | `function getEnv`                                       | -                                                      |
| `src/utils/logger.ts`                 | `default logger`, `function createModuleLogger`         | -                                                      |
| `src/utils/resilience.ts`             | `class CircuitBreaker`, `CircuitBreakerOpenError`       | `call()`                                               |

---

### General Naming Rules

*   **Interfaces:** Use `PascalCase`. While some conventions use an `I` prefix (e.g., `IProviderAdapter`), we will follow the modern TypeScript convention of not using a prefix unless there is a direct name collision with a class.
    *   `interface ProviderAdapter { ... }`
    *   `interface Model { ... }`

*   **Classes:** Use `PascalCase`.
    *   `class ProviderManager { ... }`
    *   `class GeminiAdapter { ... }`
    *   `class CircuitBreaker { ... }`

*   **Type Aliases:** Use `PascalCase`.
    *   `type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';`
    *   `type ProviderId = 'google' | 'openrouter';`

### File Naming

*   **Components & Classes:** Use `PascalCase.ts` (e.g., `ProviderManager.ts`).
*   **Utilities & Plain Objects:** Use `camelCase.ts` (e.g., `customErrors.ts`, `async.ts`).

### Environment Variables

*   Use `SCREAMING_SNAKE_CASE`.
*   The name should clearly identify the service and the secret.
    *   `GEMINI_API_KEY`
    *   `OPENROUTER_API_KEY`

### Logging Convention

*   As defined in `src/utils/logger.ts`, all log objects should include `module` and `method`. Error logs must also include a `reason` code and the `error` object.

```typescript
// Correct Logging Example
logger.error(
  {
    method: 'checkHealth',
    provider: 'google',
    reason: 'PROVIDER_API_ERROR',
    error: caughtError,
  },
  'Health check failed for Google provider.'
);
```
