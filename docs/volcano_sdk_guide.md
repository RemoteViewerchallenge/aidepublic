# 🌋 Volcano.dev Orchestration Guide

## 📋 **Overview**

Volcano.dev is our chosen orchestration platform for AI agents that enables sophisticated workflow patterns including parallel execution, conditional branching, retry logic, and iterative loops. This guide covers implementation patterns for building agents that leverage our integrated volcano-sdk.

## 🏗️ **Current Architecture Integration**

### **ArbitrageEngineAdapter Bridge**

```typescript
// Our custom bridge between volcano-sdk and AI Resource Optimizer
const arbitrageEngineAdapter = new ArbitrageEngineAdapter(
  providerManager,
  modelSelector
);

// Used as LLM provider for volcano workflows
const orchestration = agent({
  llm: arbitrageEngineAdapter,
  name: 'ResourceOptimizer',
  description: 'AI agent using free-tier models',
});
```

### **Complex Orchestration Creator**

```typescript
// Located: volcano-sdk/src/orchestration-creator.ts
import { createComplexOrchestration } from '../volcano-sdk/src/orchestration-creator';

const config = {
  steps: [
    {
      prompt: 'Analyze market trends',
      pattern: 'parallel',
      patternConfig: {
        branches: ['Tech trends', 'Market analysis', 'Competitor research'],
      },
    },
    {
      prompt: 'Synthesize findings',
      pattern: 'retry',
      patternConfig: { maxAttempts: 3 },
    },
  ],
};

const orchestration = createComplexOrchestration(
  config,
  arbitrageEngineAdapter
);
```

---

## 🎯 **Supported Orchestration Patterns**

### **1. 🔄 Sequential (Default)**

```typescript
{
  prompt: "Execute step in order",
  pattern: "sequential"
}
```

### **2. ⚡ Parallel**

```typescript
{
  prompt: "Analyze different aspects",
  pattern: "parallel",
  patternConfig: {
    branches: [
      "Technical analysis",
      "Market research",
      "Competitive analysis"
    ]
  }
}
```

### **3. 🌲 Branch (Conditional)**

```typescript
{
  prompt: "Make decision based on data",
  pattern: "branch",
  patternConfig: {
    condition: "Quality score > 8",
    trueBranch: "Finalize content",
    falseBranch: "Revise and improve"
  }
}
```

### **4. 🔁 Retry Logic**

```typescript
{
  prompt: "Generate creative content",
  pattern: "retry",
  patternConfig: {
    maxAttempts: 3
  }
}
```

### **5. 🔄 While Loop**

```typescript
{
  prompt: "Monitor until completion",
  pattern: "while",
  patternConfig: {
    condition: "Processing not complete",
    maxIterations: 10
  }
}
```

### **6. 📋 For Each**

```typescript
{
  prompt: "Process each data item",
  pattern: "forEach",
  patternConfig: {
    items: ["Dataset A", "Dataset B", "Dataset C"]
  }
}
```

### **7. 🔀 Switch Case**

```typescript
{
  prompt: "Route based on data type",
  pattern: "switch",
  patternConfig: {
    cases: {
      "numerical": "Apply statistical analysis",
      "textual": "Perform NLP processing",
      "mixed": "Apply hybrid analysis",
      "default": "Standard processing"
    }
  }
}
```

---

## 🧪 **Testing Strategy: Step-Only First**

Our current approach prioritizes testing orchestration patterns **without roles** to ensure stability:

### **Phase 1: Pattern Validation (Current)**

```typescript
// Test individual patterns without role complexity
const simpleOrchestration = {
  steps: [
    {
      prompt: 'Hello world test',
      pattern: 'sequential',
    },
  ],
  // No roles defined - direct step execution
};
```

### **Phase 2: Role Integration (Future)**

```typescript
// Once patterns are stable, add role-based execution
const roleBasedOrchestration = {
  roles: [
    {
      name: 'Researcher',
      description: 'Analyzes data and findings',
    },
    {
      name: 'Writer',
      description: 'Creates content from research',
    },
  ],
  steps: [
    { prompt: 'Research topic', pattern: 'parallel' },
    { prompt: 'Write summary', pattern: 'sequential' },
  ],
};
```

---

## 🎮 **Orchestration UI**

### **Access Point**

```
http://localhost:3001/orchestration-ui
```

### **Key Features**

- ✅ **Pattern-Specific Configuration** - UI for each orchestration pattern
- ✅ **Visual Flow Representation** - Color-coded pattern visualization
- ✅ **Template Loading** - Pre-built complex workflow templates
- ✅ **Step-Only Mode** - Role integration toggle (disabled for testing)
- ✅ **Real-time Results** - JSON output display with error handling

### **Available Templates**

1. **🚀 Simple Test** - Basic sequential workflow for validation
2. **⚡ Parallel Test** - Multi-branch parallel execution
3. **📊 Research & Analysis Pipeline** - Complex multi-stage workflow
4. **📝 Multi-Stage Content Creation** - Iterative with quality checks
5. **🔄 Iterative Data Processing** - Conditional logic patterns

---

## 🔧 **Implementation Examples**

### **Simple Orchestration**

```typescript
const result = await trpc.runOrchestration.mutate({
  steps: [
    {
      prompt: 'Introduce yourself as an AI assistant',
      pattern: 'sequential',
    },
  ],
});
```

### **Complex Parallel Processing**

```typescript
const result = await trpc.runOrchestration.mutate({
  steps: [
    {
      prompt: 'Analyze AI technology landscape',
      pattern: 'parallel',
      patternConfig: {
        branches: [
          'Current AI capabilities and limitations',
          'Emerging AI technologies and trends',
          'AI ethics and safety considerations',
        ],
      },
    },
    {
      prompt: 'Synthesize analysis into strategic insights',
      pattern: 'sequential',
    },
  ],
});
```

### **Retry with Fallback**

```typescript
const result = await trpc.runOrchestration.mutate({
  steps: [
    {
      prompt: 'Generate high-quality technical documentation',
      pattern: 'retry',
      patternConfig: {
        maxAttempts: 3,
      },
    },
  ],
});
```

---

## 📊 **Monitoring & Debugging**

### **Console Output**

```
🌋 Running Volcano agent [volcano-sdk v1.0.1]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 Step 1/1: Parallel Tasks (3 branches)
   ✅ Complete | 2.1s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Workflow complete! 1 step in 2.1s
```

### **Error Handling**

```typescript
try {
  const result = await trpc.runOrchestration.mutate(config);
  console.log('✅ Success:', result);
} catch (error) {
  console.error('❌ Orchestration failed:', error.message);
  // Automatic fallback to simpler patterns or alternative providers
}
```

---

## 🚀 **Best Practices**

### **Pattern Selection**

- **Sequential** - For dependent steps that must execute in order
- **Parallel** - For independent tasks that can run simultaneously
- **Branch** - For conditional logic based on data or results
- **Retry** - For operations that may fail due to transient issues
- **While/ForEach** - For iterative processing of data sets
- **Switch** - For routing logic based on data characteristics

### **Configuration Guidelines**

- Keep `maxAttempts` low (2-5) for retry patterns
- Limit `maxIterations` (5-20) for while loops
- Use meaningful branch descriptions for parallel execution
- Test individual patterns before combining in complex workflows

### **Performance Optimization**

- Use parallel patterns for I/O-bound operations
- Implement circuit breakers for external API calls
- Cache results when possible to avoid redundant processing
- Monitor execution times and optimize bottlenecks

---

## 🔗 **Integration Points**

### **Database Integration**

```typescript
// Orchestration results can query database directly
const models = await pool.query('SELECT * FROM models WHERE provider = ?', [
  'OpenRouter',
]);
```

### **MCP Integration**

```typescript
// Orchestration can call MCP tools
const shellResult = await fetch('http://mcp-shell-server:5001/mcp', {
  method: 'POST',
  body: JSON.stringify({ command: 'ls -la' }),
});
```

### **API Integration**

```typescript
// Expose orchestration via tRPC
export const appRouter = t.router({
  runOrchestration: t.procedure
    .input(OrchestrationSchema)
    .mutation(async ({ input }) => {
      const orchestration = createComplexOrchestration(input, llm);
      return await orchestration.run();
    }),
});
```

---

_This guide reflects our current implementation where step-only orchestration patterns are being tested for stability before role integration._
Authentication Management
Handle Tool Authentication
javascriptclass ToolAuthManager {
constructor() {
this.credentials = new Map();
}

async authenticateTool(toolId, authConfig) {
const toolDetails = await getToolDetails(toolId);

    switch(toolDetails.authType) {
      case 'api_key':
        return await this.handleApiKeyAuth(toolId, authConfig);
      case 'oauth2':
        return await this.handleOAuth2(toolId, authConfig);
      case 'none':
        return { authenticated: true };
      default:
        throw new Error(`Unsupported auth type: ${toolDetails.authType}`);
    }

}

async handleApiKeyAuth(toolId, config) {
// Store API key for tool
this.credentials.set(toolId, {
type: 'api_key',
key: config.apiKey,
expiresAt: null
});

    return { authenticated: true, toolId };

}

async handleOAuth2(toolId, config) {
// Initiate OAuth2 flow
const response = await fetch(`${VOLCANO_BASE_URL}/tools/${toolId}/auth/oauth2/initiate`, {
method: 'POST',
headers,
body: JSON.stringify({
redirect_uri: config.redirectUri,
scopes: config.scopes
})
});

    const { auth_url, state } = await response.json();

    // Return URL for user to authorize
    return {
      authUrl: auth_url,
      state,
      requiresUserAction: true
    };

}

async completeOAuth2(toolId, code, state) {
const response = await fetch(`${VOLCANO_BASE_URL}/tools/${toolId}/auth/oauth2/callback`, {
method: 'POST',
headers,
body: JSON.stringify({ code, state })
});

    const { access_token, refresh_token, expires_in } = await response.json();

    this.credentials.set(toolId, {
      type: 'oauth2',
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + (expires_in * 1000)
    });

    return { authenticated: true };

}

getCredentials(toolId) {
return this.credentials.get(toolId);
}

async refreshTokenIfNeeded(toolId) {
const creds = this.credentials.get(toolId);
if (!creds || creds.type !== 'oauth2') return;

    if (Date.now() >= creds.expiresAt - 60000) {
      const response = await fetch(`${VOLCANO_BASE_URL}/tools/${toolId}/auth/oauth2/refresh`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ refresh_token: creds.refreshToken })
      });

      const { access_token, expires_in } = await response.json();

      creds.accessToken = access_token;
      creds.expiresAt = Date.now() + (expires_in * 1000);
    }

}
}
OpenAPI Spec Parsing
Parse and Understand Tool Capabilities
javascriptclass OpenAPIParser {
constructor(spec) {
this.spec = spec;
this.operations = this.extractOperations();
}

extractOperations() {
const operations = [];

    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          operations.push({
            operationId: operation.operationId,
            method: method.toUpperCase(),
            path,
            summary: operation.summary,
            description: operation.description,
            parameters: operation.parameters || [],
            requestBody: operation.requestBody,
            responses: operation.responses
          });
        }
      }
    }

    return operations;

}

findOperation(operationId) {
return this.operations.find(op => op.operationId === operationId);
}

getRequiredParameters(operationId) {
const operation = this.findOperation(operationId);
if (!operation) return [];

    return operation.parameters
      .filter(param => param.required)
      .map(param => ({
        name: param.name,
        in: param.in,
        type: param.schema?.type,
        description: param.description
      }));

}

validateParameters(operationId, params) {
const required = this.getRequiredParameters(operationId);
const missing = required.filter(req => !(req.name in params));

    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.map(m => m.name).join(', ')}`);
    }

    return true;

}

buildRequest(operationId, params) {
const operation = this.findOperation(operationId);
if (!operation) throw new Error(`Operation ${operationId} not found`);

    this.validateParameters(operationId, params);

    let path = operation.path;
    const queryParams = {};
    const headers = {};
    let body = null;

    // Handle path parameters
    operation.parameters.forEach(param => {
      if (param.in === 'path' && params[param.name]) {
        path = path.replace(`{${param.name}}`, params[param.name]);
      } else if (param.in === 'query' && params[param.name]) {
        queryParams[param.name] = params[param.name];
      } else if (param.in === 'header' && params[param.name]) {
        headers[param.name] = params[param.name];
      }
    });

    // Handle request body
    if (operation.requestBody && params.body) {
      body = params.body;
    }

    return {
      method: operation.method,
      path,
      queryParams,
      headers,
      body
    };

}
}
Tool Execution
Execute Tool Operations
javascriptclass ToolExecutor {
constructor(authManager) {
this.authManager = authManager;
this.specCache = new Map();
}

async getToolSpec(toolId) {
if (this.specCache.has(toolId)) {
return this.specCache.get(toolId);
}

    const toolDetails = await getToolDetails(toolId);
    const parser = new OpenAPIParser(toolDetails.openApiSpec);
    this.specCache.set(toolId, parser);
    return parser;

}

async executeTool(toolId, operationId, params) {
// Ensure authentication is valid
await this.authManager.refreshTokenIfNeeded(toolId);
const creds = this.authManager.getCredentials(toolId);

    // Parse operation from OpenAPI spec
    const parser = await this.getToolSpec(toolId);
    const request = parser.buildRequest(operationId, params);

    // Build full URL
    const queryString = new URLSearchParams(request.queryParams).toString();
    const url = `${VOLCANO_BASE_URL}/tools/${toolId}/execute${request.path}${queryString ? '?' + queryString : ''}`;

    // Add authentication headers
    const execHeaders = { ...headers, ...request.headers };
    if (creds) {
      if (creds.type === 'api_key') {
        execHeaders['X-Tool-API-Key'] = creds.key;
      } else if (creds.type === 'oauth2') {
        execHeaders['X-Tool-Access-Token'] = creds.accessToken;
      }
    }

    // Execute request
    const response = await fetch(url, {
      method: request.method,
      headers: execHeaders,
      body: request.body ? JSON.stringify(request.body) : null
    });

    if (!response.ok) {
      throw new Error(`Tool execution failed: ${response.status} ${await response.text()}`);
    }

    return await response.json();

}

async executeWithRetry(toolId, operationId, params, maxRetries = 3) {
let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.executeTool(toolId, operationId, params);
      } catch (error) {
        lastError = error;

        // Don't retry on client errors
        if (error.message.includes('400') || error.message.includes('401')) {
          throw error;
        }

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError;

}
}
Agent Orchestration
Core Agent Logic
javascriptclass VolcanoAgent {
constructor() {
this.authManager = new ToolAuthManager();
this.executor = new ToolExecutor(this.authManager);
this.toolRegistry = new Map();
}

async initialize() {
// Discover and cache available tools
const tools = await discoverTools();
tools.forEach(tool => {
this.toolRegistry.set(tool.id, tool);
});
console.log(`Initialized with ${tools.length} tools`);
}

async selectToolForTask(taskDescription, constraints = {}) {
// Search for relevant tools
const candidates = await findToolsForTask(taskDescription);

    // Filter by constraints
    let filtered = candidates.filter(tool => {
      if (constraints.maxCost && tool.pricing?.cost > constraints.maxCost) {
        return false;
      }
      if (constraints.requiresFree && tool.pricing?.tier !== 'free') {
        return false;
      }
      return true;
    });

    // Rank by relevance and cost
    filtered.sort((a, b) => {
      const scoreA = a.relevance_score - (a.pricing?.cost || 0) * 0.1;
      const scoreB = b.relevance_score - (b.pricing?.cost || 0) * 0.1;
      return scoreB - scoreA;
    });

    return filtered[0];

}

async executeTask(taskDescription, taskParams, constraints = {}) {
// Step 1: Find appropriate tool
const tool = await this.selectToolForTask(taskDescription, constraints);
if (!tool) {
throw new Error('No suitable tool found for task');
}

    console.log(`Selected tool: ${tool.name} (${tool.id})`);

    // Step 2: Authenticate if needed
    if (tool.auth_type !== 'none' && !this.authManager.getCredentials(tool.id)) {
      console.log(`Tool requires authentication: ${tool.auth_type}`);
      // In real scenario, would handle auth flow
      throw new Error('Tool requires authentication - not yet configured');
    }

    // Step 3: Determine operation to use
    const parser = await this.executor.getToolSpec(tool.id);
    const operations = parser.operations;

    // Simple heuristic: use first POST operation or first operation
    const operation = operations.find(op => op.method === 'POST') || operations[0];

    if (!operation) {
      throw new Error('No suitable operation found in tool');
    }

    console.log(`Using operation: ${operation.operationId}`);

    // Step 4: Execute
    const result = await this.executor.executeWithRetry(
      tool.id,
      operation.operationId,
      taskParams
    );

    return {
      tool: tool.name,
      operation: operation.operationId,
      result
    };

}

async executeWorkflow(workflow) {
const results = [];

    for (const step of workflow.steps) {
      console.log(`Executing step: ${step.description}`);

      const result = await this.executeTask(
        step.description,
        step.params,
        step.constraints
      );

      results.push({
        step: step.description,
        ...result
      });

      // Allow step results to feed into next step
      if (step.outputVar) {
        workflow.context = workflow.context || {};
        workflow.context[step.outputVar] = result.result;
      }
    }

    return results;

}
}
Error Handling & Resilience
Comprehensive Error Management
javascriptclass VolcanoErrorHandler {
static async handleToolError(error, context) {
const errorType = this.classifyError(error);

    switch(errorType) {
      case 'AUTH_EXPIRED':
        console.log('Authentication expired, refreshing...');
        await context.authManager.refreshTokenIfNeeded(context.toolId);
        return { retry: true };

      case 'RATE_LIMIT':
        const retryAfter = this.extractRetryAfter(error);
        console.log(`Rate limited, waiting ${retryAfter}ms`);
        await new Promise(resolve => setTimeout(resolve, retryAfter));
        return { retry: true };

      case 'INVALID_PARAMS':
        console.error('Invalid parameters provided:', error);
        return { retry: false, fallback: true };

      case 'TOOL_UNAVAILABLE':
        console.warn('Tool unavailable, finding alternative');
        return { retry: false, fallback: true };

      default:
        console.error('Unexpected error:', error);
        return { retry: false, fallback: false };
    }

}

static classifyError(error) {
const msg = error.message.toLowerCase();

    if (msg.includes('401') || msg.includes('expired')) return 'AUTH_EXPIRED';
    if (msg.includes('429') || msg.includes('rate limit')) return 'RATE_LIMIT';
    if (msg.includes('400') || msg.includes('invalid')) return 'INVALID_PARAMS';
    if (msg.includes('503') || msg.includes('unavailable')) return 'TOOL_UNAVAILABLE';

    return 'UNKNOWN';

}

static extractRetryAfter(error) {
// Parse Retry-After header or default to exponential backoff
return 5000; // 5 seconds default
}
}
Usage Examples
Example 1: Simple Task Execution
javascriptconst agent = new VolcanoAgent();
await agent.initialize();

const result = await agent.executeTask(
"send email notification",
{
body: {
to: "user@example.com",
subject: "Test",
content: "Hello from Volcano"
}
},
{ maxCost: 0.01 }
);

console.log(result);
Example 2: Multi-Step Workflow
javascriptconst workflow = {
steps: [
{
description: "fetch data from API",
params: { query: { endpoint: "/users" } },
outputVar: "userData"
},
{
description: "process and transform data",
params: { body: { data: "{{userData}}" } },
outputVar: "processedData"
},
{
description: "store results in database",
params: { body: { records: "{{processedData}}" } }
}
]
};

const results = await agent.executeWorkflow(workflow);
Example 3: Tool Authentication Setup
javascriptconst authManager = new ToolAuthManager();

// API Key auth
await authManager.authenticateTool('tool-123', {
apiKey: 'sk_live_abc123'
});

// OAuth2 auth (requires user interaction)
const authResult = await authManager.authenticateTool('tool-456', {
redirectUri: 'https://myagent.com/callback',
scopes: ['read', 'write']
});

if (authResult.requiresUserAction) {
console.log('Please authorize at:', authResult.authUrl);
// After user authorizes and returns with code
await authManager.completeOAuth2('tool-456', code, authResult.state);
}
Best Practices
Caching Strategy
javascriptclass ToolCache {
constructor(ttl = 3600000) { // 1 hour default
this.cache = new Map();
this.ttl = ttl;
}

set(key, value) {
this.cache.set(key, {
value,
expiresAt: Date.now() + this.ttl
});
}

get(key) {
const entry = this.cache.get(key);
if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;

}
}
Parallel Execution
javascriptasync function executeToolsInParallel(agent, tasks) {
const promises = tasks.map(task =>
agent.executeTask(task.description, task.params)
.catch(error => ({ error: error.message, task }))
);

return await Promise.all(promises);
}
Cost Tracking
javascriptclass CostTracker {
constructor(budget) {
this.budget = budget;
this.spent = 0;
this.operations = [];
}

canAfford(cost) {
return (this.spent + cost) <= this.budget;
}

recordOperation(toolId, operationId, cost) {
this.spent += cost;
this.operations.push({
toolId,
operationId,
cost,
timestamp: Date.now()
});
}

getReport() {
return {
budget: this.budget,
spent: this.spent,
remaining: this.budget - this.spent,
operations: this.operations
};
}
}
Key Patterns

Dynamic Discovery: Always query available tools, never hardcode
Lazy Authentication: Authenticate only when executing, cache credentials
Graceful Degradation: Have fallback tools for critical capabilities
Idempotency: Design workflows to handle retries safely
Observability: Log all tool selections and executions for debugging
Cost Awareness: Check pricing before execution, track budget
Spec Caching: Cache OpenAPI specs to reduce API calls
Async Operations: Use async/await consistently, handle long-running tasks

This guide provides the foundation for building AI agents that leverage Volcano's tool marketplace effectively.
