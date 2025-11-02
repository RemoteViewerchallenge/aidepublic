# Project Blueprint: AI Resource Optimizer

This document is the succinct summary of our project's architecture, strategy, and conventions. It serves as the high-level guide for all development.

## 1. Project Profile: The Big Picture

We are building a sophisticated backend engine whose core mission is to enable a future workforce of autonomous AI agents to operate at scale with **zero token cost**.

This system acts as an intelligent gateway that manages and routes requests to a diverse portfolio of free-tier LLM models. It maximizes throughput and quality by being acutely aware of provider health, rate limits, and model capabilities.

### Core Philosophy

Our guiding principle is **"Exhaustive Fallbacks,"** as defined in `code_rules.md`. The system will always attempt to use the best free resource, fall back to the next-best model (first within the same provider, then to other providers), and only fail a task after all free possibilities have been exhausted.

_Implementation Note:_ For our initial build with a single provider, this simplifies to intra-provider fallbacks only. The full inter-provider logic will be implemented when a second provider is added.

### Future Vision: Advanced Agentic Workflows

- **Agentic Delegation & "Heavy Equipment" Roles:** Our system will treat "Roles" (e.g., `role:code-generator`) as persistent, capability-defining assets, like pieces of heavy machinery. An orchestrator agent will assign a qualified "driver" (an LLM with the right capabilities, like tool-use) to operate the "heavy equipment" (the Role) for a specific task. This allows any capable LLM to perform a standardized role, ensuring consistency and maximizing resource utilization.

- **Structured Model Selection:** The `ModelSelector` will evolve beyond simple keyword matching. It will be designed to accept structured requirements (e.g., `{ "contextWindow": { "gt": 70000 }, "capabilities": ["tool_calling", "reasoning"] }`) to allow for precise, programmatic selection of models based on specific parameters. This will be essential for advanced agents that need to dynamically choose the right tool for a sub-task.

### Major Architectural Choices

- **Language:** **TypeScript**. Chosen for its strict type system, which is essential for building a robust, safe, and maintainable autonomous system.
- **Backend Engine:** **Direct Database Architecture**. As of November 2025, the system uses direct database access for model management, with models synchronized via `src/scripts/sync-models.ts`. The legacy **Arbitrage Engine** remains available for backward compatibility and Volcano.dev integration.
- **Agent Orchestration Framework:** **Volcano.dev**. We will adopt the `volcano.dev` framework for defining and executing multi-step agentic workflows. Its powerful features (branching, loops, sub-agents) provide a ready-made "factory floor" for our agents.
- **Integration Strategy:** We maintain a custom Volcano LLM adapter (ArbitrageEngineAdapter) for legacy support, while new development focuses on direct database model access for improved performance.
- **Model Management:** **Database-First Approach**. Models are synchronized from providers to a unified database table, eliminating real-time API dependencies during model selection. See `docs/Architecture-Update.md` for details.
- **Tool Architecture:** **Modular Capability Providers (MCPs)**. Inspired by `volcano.dev`, we will implement all agent tools (e.g., file system access, shell execution) as independent, external microservices. This decouples our core engine from tool implementation, enhancing security, scalability, and maintainability.
- **API Layer:** **tRPC**. We will use tRPC to expose the high-level tasks that can be initiated via the Volcano agent framework.
- **Containerization:** **Podman & Podman Compose**. We will use Podman for container management and `podman-compose` for orchestrating our main application, as it aligns with modern Linux distributions like Fedora.
- **MCP API Contracts:** The specific request/response formats for our integrated MCPs are documented in **`docs/MCP_Contracts.md`**.

- **Frontend Framework:** **Next.js with React**. Chosen for its seamless integration with tRPC, component-based architecture, and rich ecosystem, which will accelerate the development of our CMDE.
- **Frontend IDE Components:**
  - **Shared Workspace:** We will use the **Monaco Editor** (the engine of VS Code) to provide a professional-grade, collaborative code editing experience.
  - **Integrated Terminal:** We will use **Xterm.js** to provide an in-browser terminal, connected to a secure `ShellMCP` on the backend.
  - **UI Layout:** We will use a component library like **Shadcn/UI** to build the resizable panel layout of the IDE.
- **Client-Side Adapters:** To solve provider-specific authentication issues (like with Gemini), we will implement certain adapters (e.g., a `GeminiClientAdapter`) to run directly in the browser, bypassing the backend engine for those specific calls.
- **Automated Tool Creation:** We will build a **ToolForge** component, an agent responsible for generating the code and deployment configuration for new MCPs from a high-level description. This is a key step towards a self-improving system.
- **Initial Providers:** We will start with two adapters:
  1.  **Google (Direct):** To access the massive free tiers for `Gemma` and `Gemini` models.
  2.  **OpenRouter (Aggregator):** To access a wide variety of free open-source models.

---

## 2. Code Index: Where Everything Belongs

This index maps the system's concepts to their location in the filesystem.

| Concept / Responsibility                       | Location in Code                         |
| ---------------------------------------------- | ---------------------------------------- |
| **The Project's "Constitution"**               | `docs/code_rules.md`                     |
| **Architecture Update Documentation**          | `docs/Architecture-Update.md`            |
| **The Engine's Blueprint**                     | `docs/ProviderManager.md`                |
| **Model Synchronization (Primary)**            | `src/scripts/sync-models.ts`             |
| **Database Schema**                            | `src/db/schema.sql`                      |
| **The Main Orchestration Engine (Legacy)**     | `src/core/ProviderManager.ts`            |
| **The "Brain" for Model Selection (Legacy)**   | `src/core/ModelSelector.ts`              |
| **Volcano.dev Integration (Legacy)**           | `src/core/ArbitrageEngineAdapter.ts`     |
| **The Public-Facing API Definition**           | `src/server/router.ts`                   |
| **The Application's Startup File**             | `src/server/index.ts`                    |
| **The "Tool Factory" for creating MCPs**       | `src/core/ToolForge.ts`                  |
| **The "Operations Manager" for Tasks**         | `src/core/TaskManager.ts`                |
| **The Agent's "Workspace" for files/data**     | `src/workspace/WorkspaceManager.ts`      |
| **The "Contract" for All Providers**           | `src/adapters/BaseProviderAdapter.ts`    |
| **Specific Provider Logic (e.g., Google)**     | `src/adapters/GeminiAdapter.ts`          |
| **Specific Provider Logic (e.g., OpenRouter)** | `src/adapters/OpenRouterAdapter.ts`      |
| **Safe File Reading/Writing**                  | `src/state/StateRepository.ts`           |
| **Resilience (Circuit Breaker)**               | `src/utils/resilience.ts`                |
| **Resilience (Retries)**                       | `src/utils/async.ts`                     |
| **Centralized Logging Configuration**          | `src/utils/logger.ts`                    |
| **Custom Error Definitions**                   | `src/errors/customErrors.ts`             |
| **Shared Data Structures (Tasks, etc.)**       | `src/types/task.ts`                      |
| **Shared Data Structures (Models, etc.)**      | `src/types/provider.ts`                  |
| **Environment Variable Access**                | `src/utils/env.ts`                       |
| **Static Provider Configuration**              | `config/providers.json`                  |
| **Dynamic Provider Runtime State**             | `data/provider-state/[provider-id].json` |

---

## 3. Naming Conventions

Consistent naming is critical for clarity and for our AI agents to understand and modify the codebase.

### Key Variable Names

These are the standard names for core instances used throughout the application.

| Variable Name      | Type               | Description                                                              |
| ------------------ | ------------------ | ------------------------------------------------------------------------ |
| `providerManager`  | `ProviderManager`  | The singleton instance of our main engine.                               |
| `modelSelector`    | `ModelSelector`    | The singleton instance of our selection logic "brain".                   |
| `stateRepository`  | `StateRepository`  | The singleton instance for handling all file-based state.                |
| `taskManager`      | `TaskManager`      | The instance that creates and assigns tasks.                             |
| `toolForge`        | `ToolForge`        | The instance that builds new tools.                                      |
| `workspaceManager` | `WorkspaceManager` | The instance that manages agent workspaces.                              |
| `logger`           | `pino.Logger`      | The module-specific logger instance, created via `createModuleLogger()`. |

### Type and Class Naming

### Module Exports and Key Functions

To ensure consistency, the primary exports and functions within each module should follow these naming conventions.

| File Path                             | Primary Export(s)                                     | Key Methods / Properties                                   |
| ------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| `src/adapters/BaseProviderAdapter.ts` | `interface ProviderAdapter`                           | `checkHealth()`, `fetchAvailableModels()`, `executeCall()` |
| `src/adapters/GeminiAdapter.ts`       | `class GeminiAdapter`                                 | Implements `ProviderAdapter` interface                     |
| `src/core/ProviderManager.ts`         | `class ProviderManager`                               | `initialize()`, `getAvailableModels()`                     |
| `src/core/ToolForge.ts`               | `class ToolForge`                                     | `buildTool()`                                              |
| `src/core/TaskManager.ts`             | `class TaskManager`                                   | `createTask()`, `assignTask()`                             |
| `src/core/ModelSelector.ts`           | `class ModelSelector`                                 | `selectBestModel()`                                        |
| `src/errors/customErrors.ts`          | `ProviderError`, `ValidationError`, `StateError`      | (Error classes)                                            |
| `src/server/router.ts`                | `appRouter`, `type AppRouter`                         | Procedures like `getBestModelForTask`                      |
| `src/state/StateRepository.ts`        | `class StateRepository`                               | `writeJson()`, `readJson()`                                |
| `src/types/provider.ts`               | `Model`, `HealthStatus`, `ProviderState`, `QuotaInfo` | (Interfaces and Types)                                     |
| `src/utils/async.ts`                  | `function retryWithBackoff`                           | -                                                          |
| `src/utils/env.ts`                    | `function getEnv`                                     | -                                                          |
| `src/workspace/WorkspaceManager.ts`   | `class WorkspaceManager`                              | `createWorkspace()`, `writeFile()`                         |
| `src/utils/logger.ts`                 | `default logger`, `function createModuleLogger`       | -                                                          |
| `src/utils/resilience.ts`             | `class CircuitBreaker`, `CircuitBreakerOpenError`     | `call()`                                                   |

---

### General Naming Rules

- **Interfaces:** Use `PascalCase`. While some conventions use an `I` prefix (e.g., `IProviderAdapter`), we will follow the modern TypeScript convention of not using a prefix unless there is a direct name collision with a class.

  - `interface ProviderAdapter { ... }`
  - `interface Model { ... }`

- **Classes:** Use `PascalCase`.

  - `class ProviderManager { ... }`
  - `class GeminiAdapter { ... }`
  - `class CircuitBreaker { ... }`

- **Type Aliases:** Use `PascalCase`.
  - `type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';`
  - `type ProviderId = 'google' | 'openrouter';`

### File Naming

- **Components & Classes:** Use `PascalCase.ts` (e.g., `ProviderManager.ts`).
- **Utilities & Plain Objects:** Use `camelCase.ts` (e.g., `customErrors.ts`, `async.ts`).

### Environment Variables

- Use `SCREAMING_SNAKE_CASE`.
- The name should clearly identify the service and the secret.
  - `GEMINI_API_KEY`
  - `OPENROUTER_API_KEY`

### Logging Convention

- As defined in `src/utils/logger.ts`, all log objects should include `module` and `method`. Error logs must also include a `reason` code and the `error` object.

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
