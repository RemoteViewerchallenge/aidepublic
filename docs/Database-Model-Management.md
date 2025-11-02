# Database-First Model Management

## Overview

The current system uses a **database-first approach** for model management, where AI provider models are synchronized to a local database and accessed directly, bypassing real-time API calls during model selection.

## Architecture Components

### 1. Model Synchronization (`src/scripts/sync-models.ts`)

This is the **primary entry point** for keeping model data up-to-date:

```typescript
// Main sync function
async function syncModels() {
  const client = await pool.connect();
  try {
    await populateProviderTables(client);
    await populateModelsTable(client);
    console.log('Model synchronization completed successfully.');
  } finally {
    client.release();
  }
}
```

**Key Features:**

- Fetches models from AI Studio and OpenRouter APIs
- Transforms provider-specific data to unified format
- Populates both raw provider tables and unified models table
- Handles errors gracefully with proper logging

### 2. Database Schema (`src/db/schema.sql`)

**Three-tier table structure:**

#### Raw Provider Tables:

- `ai_studio_models` - Direct AI Studio API responses
- `openrouter_models` - Direct OpenRouter API responses

#### Unified Models Table:

```sql
CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    name TEXT,
    description TEXT,
    context_length INTEGER,
    parameters BIGINT,
    tool_calling BOOLEAN,
    vision BOOLEAN,
    reasoning BOOLEAN,
    raw_data JSONB
);
```

### 3. Direct Database Access

Applications query the unified `models` table:

```typescript
// Example: Get all models with tool calling capability
const toolCapableModels = await pool.query(`
  SELECT id, name, provider, context_length 
  FROM models 
  WHERE tool_calling = true 
  ORDER BY context_length DESC
`);

// Example: Get free models from specific provider
const freeOpenRouterModels = await pool.query(`
  SELECT * FROM models 
  WHERE provider = 'OpenRouter' 
  AND (raw_data->>'isFree')::boolean = true
`);
```

## Benefits

### Performance

- ❌ **Old:** API call → Provider response → Model selection
- ✅ **New:** Database query → Direct model selection

### Reliability

- ❌ **Old:** Dependent on provider API availability
- ✅ **New:** Works offline with cached model data

### Querying Power

- ❌ **Old:** Limited to provider API filtering
- ✅ **New:** Full SQL querying capabilities

### Data Consistency

- ❌ **Old:** Different data formats per provider
- ✅ **New:** Unified schema across all providers

## Usage Patterns

### For Model Selection:

```typescript
// Complex model filtering
const models = await pool.query(
  `
  SELECT m.*, 
         (raw_data->>'pricing') as pricing_info
  FROM models m
  WHERE context_length > $1 
    AND tool_calling = true
    AND provider = ANY($2)
  ORDER BY 
    CASE WHEN (raw_data->>'isFree')::boolean THEN 0 ELSE 1 END,
    context_length DESC
`,
  [50000, ['OpenRouter', 'AI Studio']]
);
```

### For Model Analytics:

```typescript
// Provider statistics
const stats = await pool.query(`
  SELECT provider, 
         COUNT(*) as total_models,
         COUNT(*) FILTER (WHERE tool_calling = true) as tool_models,
         AVG(context_length) as avg_context_length
  FROM models 
  GROUP BY provider
`);
```

### For Real-time Updates:

```typescript
// Trigger sync when needed
import { exec } from 'child_process';

// Run sync script
exec('npm run sync-models', (error, stdout, stderr) => {
  if (error) {
    console.error('Sync failed:', error);
    return;
  }
  console.log('Models synchronized:', stdout);
});
```

## Migration from ArbitrageEngineAdapter

### Old Pattern:

```typescript
const providerManager = new ProviderManager(adapters, stateRepository);
const modelSelector = new ModelSelector();
const availableModels = await providerManager.getAvailableModels();
const bestModel = modelSelector.selectBestModel(availableModels, prompt);
```

### New Pattern:

```typescript
const models = await pool.query(
  `
  SELECT * FROM models 
  WHERE provider = $1 
  ORDER BY context_length DESC 
  LIMIT 1
`,
  [preferredProvider]
);

const bestModel = models.rows[0];
```

## Maintenance

### Regular Sync Schedule

Consider setting up a cron job or scheduled task:

```bash
# Daily model sync at 2 AM
0 2 * * * cd /path/to/project && npm run sync-models
```

### Monitoring

- Monitor sync script logs for API failures
- Check database for stale data (timestamps)
- Verify model count changes after provider updates

## Future Enhancements

1. **Incremental Sync** - Only update changed models
2. **Provider Health Integration** - Mark unhealthy providers
3. **Usage Analytics** - Track which models are actually used
4. **Automatic Failover** - Dynamic provider switching based on health
