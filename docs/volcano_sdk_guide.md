Volcano.dev AI Agent Development Guide
Overview
Volcano is an orchestration platform for AI agents to discover, authenticate, and execute external tools dynamically. This guide covers core patterns for building agents that leverage Volcano's marketplace.
Setup & Configuration
javascript// Base configuration
const VOLCANO_BASE_URL = 'https://api.volcano.dev';
const AGENT_API_KEY = process.env.VOLCANO_API_KEY;

const headers = {
  'Authorization': `Bearer ${AGENT_API_KEY}`,
  'Content-Type': 'application/json'
};
Tool Discovery
List Available Tools
javascriptasync function discoverTools(filters = {}) {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${VOLCANO_BASE_URL}/tools?${params}`, {
    headers
  });
  return await response.json();
}

// Usage examples
const allTools = await discoverTools();
const dataTools = await discoverTools({ category: 'data-processing' });
const freeTools = await discoverTools({ pricing: 'free' });
Get Tool Details
javascriptasync function getToolDetails(toolId) {
  const response = await fetch(`${VOLCANO_BASE_URL}/tools/${toolId}`, {
    headers
  });
  const tool = await response.json();
  
  return {
    id: tool.id,
    name: tool.name,
    description: tool.description,
    openApiSpec: tool.openapi_spec,
    authType: tool.auth_type,
    pricing: tool.pricing,
    capabilities: tool.capabilities
  };
}
Search Tools by Capability
javascriptasync function findToolsForTask(taskDescription) {
  const response = await fetch(`${VOLCANO_BASE_URL}/tools/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: taskDescription,
      limit: 10
    })
  });
  return await response.json();
}

// Example
const tools = await findToolsForTask("send email notifications");
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