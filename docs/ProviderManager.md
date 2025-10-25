
ProviderManager Architecture Rules
Core Responsibilities: MANY AI MODELS FROM MULTIPLE PROVIDER CRUCIAL 
ProviderManager owns:

Provider configuration (which providers exist, their capabilities)
Provider health status (available, rate-limited, down)
Model catalog (what models each provider offers)
Usage tracking (tokens consumed, requests made, quota remaining)
Provider selection logic (given requirements, which provider to use)

ProviderManager does NOT:

Execute LLM calls (that's TaskExecutor)
Route work to models (that's ModelRouter)
Decide what work to do (that's TaskManager)
Store task results (that's WorkspaceManager)

Data Ownership
ProviderManager Owns
config/
  providers.json          # Provider definitions (hot-reloadable)
  
data/provider-state/
  openrouter.json         # Current state: health, usage, quota
  gemini.json
  [provider-id].json
  
data/model-cache/
  openrouter-models.json  # Cached model lists
  gemini-models.json
```

### ProviderManager Shares (Read-Only for Others)
- Available models by category
- Provider health status
- Free tier availability
- Current usage stats

### ProviderManager Never Touches
- Task definitions (TaskManager)
- Execution results (WorkspaceManager)
- Routing decisions (ModelRouter)
- MCP servers (ToolManager)

## Provider Adapter Architecture

### Each Provider = One Adapter Class
```
BaseProviderAdapter (abstract)
├── OpenRouterAdapter
├── GeminiAdapter
├── MistralAdapter
└── [Future providers...]
Adapter Interface
typescriptinterface ProviderAdapter {
  // Discovery
  fetchAvailableModels(): Promise<Model[]>;
  
  // Health
  checkHealth(): Promise<boolean>;
  getHealthStatus(): HealthStatus;
  
  // Capabilities
  supportsFeature(feature: string): boolean;
  getQuotaInfo(): QuotaInfo;
  
  // Usage tracking
  recordUsage(tokens: number, cost: number): void;
  getRemainingQuota(): QuotaRemaining;
}
Why Adapters

Add new provider = write new adapter, no core changes
Provider-specific quirks isolated
Testing: mock one adapter without affecting others
Parallel execution: health checks across all providers simultaneously

State Management Architecture
Three-Layer State
Layer 1: Configuration (Persistent, Hot-Reloadable)
typescript// config/providers.json
{
  "providers": [
    {
      "id": "openrouter",
      "type": "openai",
      "baseURL": "...",
      "features": {...}
    }
  ]
}
Layer 2: Runtime State (Persistent, Frequently Updated)
typescript// data/provider-state/openrouter.json
{
  "lastHealthCheck": timestamp,
  "isHealthy": true,
  "usage": {
    "tokensToday": 12000,
    "resetAt": timestamp
  },
  "consecutiveFailures": 0
}
Layer 3: Cache (Ephemeral, Optional)
typescript// In-memory for performance
{
  "openrouter": {
    "models": [...],
    "cachedAt": timestamp,
    "ttl": 3600
  }
}
State Update Patterns
Configuration changes: Trigger adapter reload
Health changes: Update immediately, notify dependent systems
Usage changes: Batch writes (every 10 requests or 1 minute)
Model list changes: Refresh on schedule or on-demand
Selection Logic Architecture
Model Selection is Multi-Stage
Stage 1: Filter - Remove unavailable options

Unhealthy providers excluded
Rate-limited providers excluded
Models without required capabilities excluded

Stage 2: Categorize - Group by fitness
typescript{
  perfect: Model[],      // Meets all requirements, free tier
  good: Model[],         // Meets requirements, low cost
  acceptable: Model[],   // Meets minimum requirements
  lastResort: Model[]    // Paid but functional
}
Stage 3: Prioritize - Within category, order by

Free tier > paid tier
Healthy > recently recovered
Low usage > high usage (spread load)
Fast response time > slow
High reliability score > low

Stage 4: Select - Return top candidate
Why Multi-Stage

Clear logic for autonomous debugging
Easy to add new selection criteria
Can log which stage eliminated which models
Human can override at any stage

Health Check Architecture
Active Health Checks
Run periodically (every 1-5 minutes):
typescript{
  type: 'active',
  method: 'HEAD /models' or 'test inference',
  schedule: '*/5 * * * *',
  timeout: 5000
}
Passive Health Checks
Track actual usage results:
typescript{
  type: 'passive',
  trigger: 'on_request_complete',
  logic: 'mark unhealthy after 3 consecutive failures'
}
```

### Health State Machine
```
HEALTHY → DEGRADED → UNHEALTHY → CIRCUIT_OPEN
   ↑                                    ↓
   ←←←←←←←← (recovery after cooldown) ←←
HEALTHY: All checks passing
DEGRADED: Some failures but functional
UNHEALTHY: Consistent failures, stop routing
CIRCUIT_OPEN: Don't check for N minutes, then retry
Why Both Types

Active: Detect issues before routing work
Passive: Real usage more accurate than synthetic checks
Combined: Fast detection, accurate assessment

Quota Tracking Architecture
Provider-Specific Quota Models
Rate Limit (Requests per Minute)
typescript{
  type: 'rate_limit',
  limit: 100,
  window: 60000,  // 1 minute
  current: 47,
  resetAt: timestamp
}
Token Quota (Tokens per Day/Month)
typescript{
  type: 'token_quota',
  limit: 1000000,
  period: 'daily',
  used: 234567,
  resetAt: timestamp
}
Credit-Based (Dollar Amount)
typescript{
  type: 'credit',
  remaining: 45.67,
  expiresAt: timestamp
}
No Limit (True Free Tier)
typescript{
  type: 'unlimited',
  warning: 'subject to fair use'
}
Quota Enforcement

Soft Limit (80%): Start deprioritizing this provider
Hard Limit (95%): Stop routing to this provider
Over Limit: Mark degraded, retry after reset

Configuration Hot-Reload Architecture
File Watcher Pattern
typescriptwatchConfig() {
  fs.watch('config/providers.json', async (event) => {
    if (event === 'change') {
      await this.reloadConfig();
    }
  });
}
Reload Process

Load new config file
Validate schema
Compare with current config
Identify: added, removed, modified providers
For modified: graceful transition (finish in-flight, switch to new)
For removed: drain (stop new work, wait for completion)
For added: initialize adapter, run health check
Update routing tables
Log changes

Why Hot-Reload

Autonomous system discovers new providers
Human adds provider without restart
Rate limits change, update config immediately
No downtime = continuous operation

Extension Points
Design allows future additions without refactoring:
Multi-Region Support

Add region field to provider config
Route based on geography

Cost Optimization

Track actual spend per provider
Auto-switch when free tier exhausted

Quality Scoring

Track output quality per model
Prefer high-quality models

A/B Testing

Route % of traffic to experimental providers
Compare results automatically

Custom Models

Support fine-tuned models
Same interface as provider models

Caching Layer

Cache identical prompts
Reduce provider calls

Federation

Multiple ProviderManager instances
Share quota across instances


Boundary Rule: If another module wants to know about providers, it asks ProviderManager. If ProviderManager needs to execute work, it delegates to another module. Clean separation.