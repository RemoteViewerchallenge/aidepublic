Model Selection refinements (requirements, design, implementation plan)
This is the precise spec for how model selection should behave given your needs: safety (avoid accidental billing), manual prioritization, session pinning of models to roles, and graceful fallbacks.

1 — Goals (explicit)
Roles are parameter-only: a Role expresses required capabilities (minContext, toolCalling, vision, embed, reasoning).
Manual operator controls:
Provider priority ordering (operator-managed).
Per-provider allowPaid toggle (defaults to safe values).
Default routing must always prefer free options where the operator disallows paid.
Fallback strategy:
PreferredModelId (session or manual pin) should be tried first (unless blacklisted/cooldowned).
If failure occurs and it’s model-specific (e.g., 429 tied to that model or known model error), try other models on the same provider (same-provider-first).
If all same-provider alternatives fail, move to next provider (by priority) and try models in that provider.
On model-specific failure, add model cooldown and session-blacklist; on provider-wide repeated failures, add provider cooldown (persisted and/or session).
Session pinning: successful model used for a role in a session should be used preferentially until session ends unless blacklisted or fails.
Jobs: future feature — persistent model-to-role binding with fallbacks still applied (manual pin).
Observability: log model-level events to model_events for learning and automatic re-enabling.
Safety: no paid model will be used unless allowPaid true for that provider, or a Job is pinned to a specific paid model and operator explicitly allowed it.
2 — Data model (DB / state)
Add two things:

Provider config (persisted)
Source: state/provider-config/<provider>.json (simple) or DB table provider_config.
Fields:
providerId (string)
name (string)
priority (int, lower = higher priority)
allowPaid (bool)
enabled (bool)
notes (text)
last_updated (timestamp)
Model events (DB)
Table model_events:
id SERIAL
model_id TEXT
provider TEXT
event_type TEXT ('RATE_LIMIT'|'ERROR'|'SUCCESS'|'COOLDOWN')
metadata JSONB (messages, httpStatus, raw provider payload)
created_at TIMESTAMP
models table changes (existing)
Add pricing JSONB, rate_limit_info JSONB, available bool and last_synced_at if not already present.
Session-only storage
Client-side sessionStorage keys:
roleModel:<roleId> — pinned model for role in session
roleBlacklist:<roleId> — array of blacklisted model ids for session
3 — Selection algorithm (pseudocode)
This is the algorithm to implement in generateContent or a helper selection function.

Inputs:

role criteria (capabilities)
session preferredModelId (optional)
session blacklistedModelIds (optional)
ProviderConfig (ordered list by priority)
ProviderManager info (cooldown states)
Model events DB (recent failures)
Algorithm:

Build ordered provider list:
providers = ProviderManager.getProvidersOrderedByPriority()
Remove providers with enabled=false or on cooldown or (if allowPaid==false) remove paid-only providers as needed.
If session.preferredModelId exists:
If not blacklisted and not on cooldown and provider is allowed, attempt it first.
If it succeeds => done (persist session pin).
If it fails with a model-specific error (e.g., 429), add model to session blacklist and add a model cooldown and continue to step 3.
For provider in providers (start with provider of preferredModel if it exists, else top provider):
Gather candidate models for this provider that match the role criteria and are not blacklisted and not on cooldown.
Sort candidates by:
preferred order (free first if operator requires free),
context length,
configured preference (e.g., operator pinned model),
freshness/last_successful.
For each candidate:
Attempt generation using provider adapter.
On success -> return result and session-pin model.
On model-specific error (429 or other provider-specific rate-limit/error) -> log model_events, mark model cooldown, add to session blacklist, continue to next candidate.
On provider-wide error (e.g., provider unreachable) -> mark provider cooldown, break to next provider.
If all providers exhausted -> return error to client summarizing attempts.
Cooldown logic:

Model cooldown: base 60s, exponential backoff if repeated failures. Persist latest cooldown in model_events table or state store.
Provider cooldown: when repeated models fail or adapter reports provider-level rate-limit, mark provider cooldown longer (e.g., 60s–5m) and persist in ProviderManager state.
Blacklists:

Session blacklists stored client-side and shipped as blacklistedModelIds in the request to the server; server respects them and also keeps its own short-lived blacklist via model cooldowns.
4 — Error classification
Model-specific error (only this model should be blacklisted or cooldowned):
429 with provider info that references a model id.
Non-200 responses where provider returns structured error tied to model id.
Provider-level error:
HTTP 502/503/504 or consistent connection issues,
Provider health-check fails,
Provider explicitly returns a message indicating system-wide rate-limit.
If uncertain, prefer listing it as model+provider event but do not mark provider on cooldown unless multiple model failures for that provider occur in short order.
5 — Operator controls & UI
Add a minimal panel in workspace2:

Provider list rows:
Provider name
Count of matching models for current role criteria
Priority (small numeric input or drag handle)
Toggle: Allow paid (on/off)
Toggle: Enabled (on/off)
Badge: cooldown state (if provider is on cooldown)
Button: “Force sync provider”
Model list panel (per provider):
Show top N candidate models for current role criteria
Buttons: “Pin model for role (session)”, “Pin for job” (future persistent), “Blacklist for session”
Admin/Warning:
If operator sets allowPaid=true show a required confirmation modal with a summary of potential costs and the provider’s billing link.
6 — Telemetry and learning
Log every generation attempt to model_events:
success/failure, duration, tokens used (if available), provider response (if error).
Use recent model events to tune:
cooldown durations (exponential backoff),
provider disable decisions (if many models fail in a window).
Add a small scheduler job that checks models under cooldown and rechecks their health after cooldown expires.
7 — Implementation plan & tasks (concrete)
Add DB migrations:
provider_config table OR file-backed JSON store.
model_events table.
models table extras.
Implement per-provider sync (OpenRouter live API) and upsert into models.
Add ProviderConfig persistence API and admin endpoints.
Implement the selection algorithm and replace current generateContent path:
Respect preferredModelId and blacklistedModelIds.
Try same-provider alternatives first, then follow provider priority.
Log model events and set model/provider cooldowns appropriately.
Add UI components:
Provider priority panel in workspace2.
Model candidate list and pin/blacklist actions.
Tests:
Unit tests for selection logic: model success, model 429 -> try next model same provider, provider down -> try next provider, session pin behavior.
Integration test: simulate provider 429 and validate fallback ordering.
8 — Edge cases and behavior handling
If a provider lists inaccurate metadata (e.g., Gemini models missing multimodal flag), enrich heuristically:
Infer from name (e.g., "vision" substring),
At runtime, if an image attempt fails, mark as not multi-modal.
If DB is stale (no models): generateContent should return a clear NOT_FOUND error and the UI should surface a "Sync models" button.
If user pins a paid model for a Job, require explicit operator confirmation UI to allow billing.
9 — Example configuration defaults (suggested)
Default provider priority and allowPaid:
gemini: priority 1, allowPaid=true
copilot (github): priority 2, allowPaid=true
openrouter: priority 3, allowPaid=false (unless you want it enabled by default)
aistudio: priority 4, allowPaid=false (since you have promo only; operator enables when desired)
These defaults avoid unexpected billing while letting generous free-tier providers like Gemini be used.
10 — Example pseudocode for generateContent (condensed)

if preferredModelId and not blacklisted and not modelCooldown:  try chosen model -> success return  catch modelError -> add modelCooldown + blacklistfor provider in providers_ordered:  candidates = getModels(provider, criteria, exclude=blacklist+cooldowns)  for candidate in candidates:    try candidate -> return result    catch modelError -> log event, add candidate cooldown, continue  if provider had repeated failures -> providerCooldown and break to next providerreturn error: no suitable models found
11 — Testing & verification plan
Unit tests for ModelSelector (excludedModelIds applied; preferFree behavior).
Integration test simulating:
Model A returns 429 -> ensure Model B (same provider) is tried before switching provider.
Multiple models failing in provider -> provider cooldown applied and next provider is used.
Smoke test: run sync-models.ts, validate models table has entries and generateContent can call at least one provider.
