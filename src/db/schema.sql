CREATE TABLE IF NOT EXISTS ai_studio_models (
  id TEXT PRIMARY KEY,
  version TEXT,
  "displayName" TEXT,
  description TEXT,
  "inputTokenLimit" INTEGER,
  "outputTokenLimit" INTEGER,
  "supportedGenerationMethods" TEXT[],
  temperature NUMERIC,
  "topP" NUMERIC,
  "topK" INTEGER,
  "maxTemperature" NUMERIC,
  thinking BOOLEAN
);

CREATE TABLE IF NOT EXISTS openrouter_models (
    id TEXT PRIMARY KEY,
    canonical_slug TEXT,
    hugging_face_id TEXT,
    name TEXT,
    created TIMESTAMP WITH TIME ZONE,
    description TEXT,
    context_length INTEGER,
    architecture JSONB,
    pricing JSONB,
    top_provider JSONB,
    per_request_limits JSONB,
    supported_parameters TEXT[],
    default_parameters JSONB
);

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
    embedding BOOLEAN,
    raw_data JSONB
);

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    base_prompt TEXT,
    model_criteria JSONB,
    workspace_config JSONB,
    tools TEXT[]
);