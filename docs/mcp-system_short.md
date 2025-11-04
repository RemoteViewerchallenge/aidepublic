1 — Purpose and summary (what this repo / MCP system is)
This workspace contains an MC P (Model Context/Tool) adapter and a small orchestration stack that aims to:

Expose model/tooling adapters (Lootbox-style stdio adapter bundled for MCP) and present them via an HTTP proxy (mcp-proxy-master).
Provide a UI to create and manage "roles" and assign tools to roles (roles are parameterized assistant profiles, not models).
Route generation requests to multiple backend LLM providers (Gemini, OpenRouter, AI Studio, others) and implement resiliency: fallback across models/providers, cooldowns for rate-limited providers/models and session pinning of models to roles.
Sync model metadata into a unified models DB table for selection logic.
Main runtime pieces:

Backend (TypeScript / tRPC) — router.ts plus core modules in core.
Model sync scripts — sync-models.ts, sync-aistudio-models.ts.
Provider manager and model selector — ProviderManager.ts, ModelSelector.ts.
Frontend (Next.js app) — workspace pages and components under my-app, including RoleMcpSelector and workspace2 page.
Roles service (small Node service) — server.cjs that persists roles and role->tool assignments in mcp/roles-service/store.json.
Start orchestration scripts — start-servers.sh (now runs model sync by default unless skipped).
2 — Key files and what they do
router.ts — tRPC router. Key procedures:
generateContent — main generation endpoint. It chooses a model via ModelSelector, calls the provider adapter, and uses resilient fallback logic (detects 429/rate-limit, tries alternative providers and alternative models, marks provider cooldowns).
getAvailableModels, getModelsFromDatabase, getBestModelForTask — model discovery and selection helpers.
ProviderManager.ts — manages provider adapters, health checks, model cache, and provider cooldowns. Has new cooldown tracking: markProviderCooldown(id, ms).
ModelSelector.ts — picks models from DB based on criteria. Now accepts excludedModelIds to avoid session-blacklisted models.
sync-models.ts — synchronizes models into the models table. Currently reads AI Studio via API (if key), and OpenRouter from the raw JSON file openrouter-models-raw.json. (We will change raw-file to live API — recommended.)
sync-aistudio-models.ts — duplicate AI Studio sync (can be consolidated).
server.cjs — simple roles persistence API (GET/POST/PUT). Stores roles and assignments in store.json.
page.tsx — new workspace page with:
A role manager UI (create/edit parameters).
RoleMcpSelector UI component (fetches MCP servers, proxy tools, and persists role->tools to roles service).
"Start MCPJungle" button tied to app/api/start-mcp/route.ts (starts start-servers.sh).
Local session model pinning and session blacklist for failing models.
RoleMcpSelector.tsx — UI to pick tools across MCP servers and proxy.
start-servers.sh — starts backend + frontend and (unless SKIP_MODEL_SYNC set) runs sync-models.ts before starting.
3 — How to run the system locally (dev)
Recommended quick flow:

Ensure environment variables are set (API keys):
AI_STUDIO_API_KEY if you want AI Studio models.
OpenRouter key if used by relevant code.
Start servers:
The repo has tasks exposed in the VSCode task list. To start in dev:
Use the "Start Development Server" task (or run the start script). start-servers.sh will run the sync then run the backend and frontend dev servers.
If you want to skip running sync on startup:
Set SKIP_MODEL_SYNC=1 in the shell before running start-servers.sh.
The frontend pages run under my-app (Next.js). Workspace pages like /workspace2 are available when the frontend is up.
Roles service: run node mcp/roles-service/server.cjs (normally runs as a separate process in dev).
Quick command examples (if needed):

Run model sync manually:

# run from repo rootnpx tsx src/scripts/sync-models.ts
Start dev servers (from repo root):

./start-servers.sh
4 — Current behavior notes important for safety & billing
Provider selection defaults prioritize "free" models via ModelSelector.
Recent changes added:
Rate-limit detection (heuristic search for 429/status 429/rate-limited strings) in generateContent.
Provider cooldown marking in ProviderManager (temporary avoidance for a provider after rate-limit).
A server-side fallback flow: when a 429 is detected, the backend first tries alternative providers (current code), then tries other models on the same provider. You requested the reverse (same-provider-first) — that change is pending (I can swap).
Session-level behavior:
When a generation succeeds, the chosen modelId is stored in sessionStorage as a session-only pin for the role (roleModel:<roleId>). That means repeated calls for the same role will try that model for the session.
When a generation fails, the UI attempts to add the failed model/provider to a session blacklist (roleBlacklist:<roleId>), and sends blacklistedModelIds to the server so the server avoids those models on next attempts.
Roles are persisted to the roles service (mcp/roles-service/store.json); they are parameter-only (no model binding). Session pins are separate.
The sync script currently TRUNCATES the models table and reinserts; this means if we want to preserve learned flags (like model cooldowns, rate-limit history) we should change to upsert rather than truncate.
5 — Known issues and TODOs (short list)
OpenRouter sync uses openrouter-models-raw.json file rather than calling the OpenRouter API live. This must be changed to a live API sync that inserts only free models.
scheduler.ts runs npm run sync-models but package.json currently has no sync-models script; add "sync-models": "tsx [sync-models.ts](http://_vscodecontentref_/48)".
The fallback order you asked for (try other models in same provider first, then switch provider) is not yet implemented — current code tries other providers first. We changed ProviderManager to support cooldowns; we should swap fallback ordering.
We need an explicit ProviderConfig persistence (priority, allowPaid, enabled) and UI to manage these settings.
Model sync should upsert instead of truncate to keep learned fields, plus add model*events table to store runtime failures and learning telemetry.
Add per-provider / per-model event logging in DB so selection can learn (cooldown durations, repeated failures, last_successful_at).
Add a small admin UI to set provider priorities and allowPaid booleans to prevent accidental billing.
6 — Suggested short-term plan (practical next steps)
Change sync-models.ts:
Replace OpenRouter raw-file import with a live API call to OpenRouter (filter free models).
Upsert models instead of TRUNCATE so we preserve model_events or other learned fields.
Add package.json script "sync-models": "tsx [sync-models.ts](http://\_vscodecontentref*/51)" so scheduler.ts works.
Swap the fallback order in generateContent so same-provider alternatives are tried before switching providers.
Add ProviderConfig persistence (simple JSON in state or DB table) with fields: priority, allowPaid, enabled, notes.
Add an admin endpoint and small UI control in workspace pages to change provider priority and allowPaid.
Create model_events DB table and log rate-limit / failure events; use these events to calculate cooldown periods.
7 — Data & schema suggestions
Unified models table (suggested richer fields; adjust to your DB):

id (text) — provider model id (unique per provider)
provider (text) — provider id string (e.g., "openrouter", "aistudio", "gemini")
name (text)
description (text)
context_length (int)
tool_calling (bool)
vision (bool)
reasoning (bool)
embedding (bool)
pricing (jsonb) — raw pricing info (nullable)
rate_limit_info (jsonb) — last rate-limit timestamps / counters (nullable)
tags (text[]) or jsonb
raw_data (jsonb) — full provider response
last_synced_at (timestamp)
available (boolean)
created_at/updated_at (timestamps)
Telemetry table model_events (suggestion):

id (serial)
model_id (text)
provider (text)
event_type (enum: RATE_LIMIT | ERROR | SUCCESS | COOLDOWN_ADDED)
details (jsonb)
created_at (timestamp)
Provider config persistence:

File-backed: state/provider-config/<provider>.json or DB table provider*config with (providerId, priority, allowPaid, enabled, notes, last_updated).
8 — Implementation checklist (concrete files to change)
Update sync-models.ts:
Replace raw-file OpenRouter flow with live OpenRouter API calls (with key if present).
Upsert logic instead of TRUNCATE.
Add scripts/sync-openrouter.ts (optional) to keep per-provider sync logic modular.
Add package.json script "sync-models": "tsx [sync-models.ts](http://\_vscodecontentref*/60)".
Update ModelSelector.ts and router.ts:
Ensure selectModel can be passed excludedModelIds (done).
Swap fallback order in generation to prefer same-provider model alternatives first.
Update ProviderManager to return providers ordered by saved priority and honor allowPaid config.
Add small admin API:
POST /api/provider-config to set provider priority/allowPaid.
GET /api/provider-config to read configs.
UI:
Add ProviderPriority component to page.tsx.
Display counts per provider and allow toggles (persist to API).
9 — Safety checks (to avoid surprise billing)
Default allowPaid=false for providers that might charge unless operator enables them.
Show UI warnings when a provider is paid and allowPaid is enabled (require operator confirmation).
Log and surface estimated cost metrics for a model call (if provider returns pricing per token, show expected cost for the model and a button to proceed).
Add budget thresholds per provider and a hard check in the request pipeline that prevents outbound calls if thresholds crossed.
10 — Where to start if you want me to implement code changes now
I can implement the short-term checklist (OpenRouter live sync + upsert + add sync-models npm script + swap fallback order + small ProviderConfig persistence). That is the minimal set to make the system safer and make model metadata accurate.

If you'd like I can:

Implement the OpenRouter live sync + upsert and run the build.
Add the sync-models package script and update scheduler.ts if needed.
Swap fallback order in generateContent to same-provider-first.
Tell me which of the above to implement first and I will do it and validate with a build.
