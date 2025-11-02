# Phase II: Integration Plan

**⚠️ ARCHITECTURAL NOTE:** This document describes the legacy ArbitrageEngineAdapter integration approach. As of November 2025, the system has evolved to use a direct database architecture for improved performance. See `docs/Architecture-Update.md` for current implementation details.

The ArbitrageEngineAdapter remains available for Volcano.dev integration and backward compatibility scenarios.

---

This document provides a detailed, step-by-step guide for integrating the `volcano.dev` orchestration framework with our custom **Arbitrage Engine**. It serves as the primary blueprint for the legacy integration approach.

---

## Step 1: Create the Arbitrage Engine Adapter for Volcano (The "Bridge")

**Goal:** To make our custom `Arbitrage Engine` usable as an `llm` within Volcano workflows. This is the most critical integration point in our new architecture.

**The Plan:**

1.  **Add the Volcano SDK Dependency:**

    - **Action:** Add `"volcano-sdk": "latest"` to the `dependencies` in `package.json`.
    - **Follow-up:** Run `npm install` to download the package.
    - **Purpose:** This gives us access to the interfaces (like `Llm`) and classes we need to build our adapter.

2.  **Build the `ArbitrageEngineAdapter`:**

    - **Action:** Create a new file at `src/core/ArbitrageEngineAdapter.ts`.
    - **Implementation:** This class will implement Volcano's `Llm` interface. Its `execute` method will receive a request from a Volcano workflow and use our entire engine (`ProviderManager` and `ModelSelector`) to fulfill it. It will find the best model, get the correct provider adapter, execute the call, and transform the response into the format Volcano expects.

3.  **Test the Adapter in Isolation:**
    - **Action:** Create a new unit test file at `src/core/ArbitrageEngineAdapter.test.ts`.
    - **Implementation:** This test will use mock versions of `ProviderManager` and `ModelSelector`. It will verify that the `ArbitrageEngineAdapter` correctly calls each part of our engine in the right order and correctly transforms the final response. This proves the adapter's logic without making any real API calls.

---

## Step 2: Implement a Simple Agent Workflow (The "Ignition Test")

**Goal:** To prove that the `volcano.dev` framework can successfully use our custom **Arbitrage Engine** to execute a basic task. This is the first end-to-end test of our entire integrated system.

**The Plan:**

1.  **Composition Root (`src/server/router.ts`):**

    - **Action:** In the "Application Composition Root" section, instantiate our new `ArbitrageEngineAdapter`, passing it the existing `providerManager` and `modelSelector` instances.

2.  **Create a New API Endpoint (`src/server/router.ts`):**

    - **Action:** Create a new tRPC procedure named `runSimpleTask`.
    - **Implementation:** This procedure will create a new Volcano `agent()` and configure it to use our `ArbitrageEngineAdapter` as its default `llm`. The agent's workflow will be a single, simple step: `.then({ prompt: "Confirm you are operational." })`.

3.  **Create an End-to-End Test:**
    - **Action:** Create a new test file, `src/server/router.e2e.test.ts`.
    - **Implementation:** This test will start our actual server and make a real network call to the `runSimpleTask` endpoint. It will assert that the response from the agent workflow is a valid, non-empty string (e.g., "I am operational."). A passing test here is a major milestone.

---

## Step 3: Integrate the Shell MCP (Giving the Agent "Hands")

**Goal:** To give our agent its first tool, allowing it to interact with its environment by running shell commands. This proves our system can use the Modular Capability Provider (MCP) architecture.

**The Plan:**

1.  **Local MCP Server Setup:**

    - **Developer Note:** After significant debugging, we've pivoted to running the `@mkusaka/mcp-shell-server` as a local process for development, managed by helper scripts, as it provides more stability and control than container-based approaches we attempted.
    - **Action:** The `mcp-shell-server` is now defined as a service in `podman-compose.yml` and is started automatically with `podman-compose up`.
    - **Configuration:** The `.env` file must be configured with `SHELL_MCP_URL=http://mcp-shell-server:5001/mcp` to allow the `arbitrage-engine` container to communicate with the `mcp-shell-server` container over the internal container network.
    - **Testing Note:** For local end-to-end tests that run outside of Docker (like with `npm test`), the URL should be `SHELL_MCP_URL=http://localhost:5001/mcp` because the test runner on your host machine accesses the container via its published port. When running the `arbitrage-engine` inside a container that needs to talk to a service on the host, use `SHELL_MCP_URL=http://host.docker.internal:5001/mcp`.

2.  **Update the Agent Workflow (`src/server/router.ts`):**

    - **Action:** Modify the `runSimpleTask` procedure.
    - **Implementation:** The procedure now uses a direct `fetch` call to the `/mcp` endpoint on the shell MCP. The request body is a JSON-RPC 2.0 call to the `run_tool` method, as per `MCP_Contracts.md`.

3.  **Update the End-to-End Test (`src/server/router.e2e.test.ts`):**
    - **Action:** Update the existing end-to-end test.
    - **Implementation:** The test will now need to assert that the final output of the agent's workflow contains the string "Hello from the shell!". A passing test here proves that our agent can not only think but also **act**.
