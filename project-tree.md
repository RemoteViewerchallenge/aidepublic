# Project File Tree

```
.dockerignore
.gitignore
jest.config.js
LootboxMcpAdapter.cjs
page.tsx
start-servers.sh
stop-servers.sh
TODO.md
tsconfig.json
.vscode/
config/
docs/
logs/
mcp/
mcp/jungle/.gitignore
mcp/jungle/.golangci.yml
mcp/jungle/.goreleaser.yaml
mcp/jungle/CONTRIBUTION.md
mcp/jungle/DEVELOPMENT.md
mcp/jungle/docker-compose.prod.yaml
mcp/jungle/docker-compose.yaml
mcp/jungle/Dockerfile
mcp/jungle/go.mod
mcp/jungle/go.sum
mcp/jungle/LICENSE
mcp/jungle/lootbox-mcp-config.json
mcp/jungle/LootboxMcpAdapter.cjs
mcp/jungle/main.go
mcp/jungle/mcpjungle_server
mcp/jungle/mcpjungle-cli
mcp/jungle/package-lock.json
mcp/jungle/README.md
mcp/jungle/stdio.Dockerfile
mcp/jungle/cmd/create.go
mcp/jungle/cmd/create_test.go
mcp/jungle/cmd/delete.go
mcp/jungle/cmd/delete_test.go
mcp/jungle/cmd/deregister.go
mcp/jungle/cmd/deregister_test.go
mcp/jungle/cmd/disable.go
mcp/jungle/cmd/disable_test.go
mcp/jungle/cmd/enable.go
mcp/jungle/cmd/enable_test.go
mcp/jungle/cmd/get.go
mcp/jungle/cmd/get_test.go
mcp/jungle/cmd/init_server.go
mcp/jungle/cmd/init_server_test.go
mcp/jungle/cmd/invoke.go
mcp/jungle/cmd/invoke_test.go
mcp/jungle/cmd/list.go
mcp/jungle/cmd/list_test.go
mcp/jungle/cmd/login.go
mcp/jungle/cmd/login_test.go
mcp/jungle/cmd/register.go
mcp/jungle/cmd/register_test.go
mcp/jungle/cmd/root.go
mcp/jungle/cmd/root_test.go
mcp/jungle/cmd/start.go
mcp/jungle/cmd/start_test.go
mcp/jungle/cmd/update.go
mcp/jungle/cmd/usage.go
mcp/jungle/cmd/usage_test.go
mcp/jungle/cmd/version.go
mcp/jungle/cmd/version_test.go
mcp/jungle/cmd/config/config.go
mcp/jungle/cmd/config/config_test.go
mcp/jungle/internal/db/db.go
mcp/jungle/internal/db/db_test.go
mcp/jungle/internal/integration_test.go
mcp/jungle/internal/migrations/migration.go
mcp/jungle/internal/model/mcp_client.go
mcp/jungle/internal/model/mcp_prompt.go
mcp/jungle/internal/model/mcp_server.go
mcp/jungle/internal/model/mcp_tool.go
mcp/jungle/internal/model/server_config.go
mcp/jungle/internal/model/server_config_test.go
mcp/jungle/internal/model/tool_group.go
mcp/jungle/internal/model/tool_group_test.go
mcp/jungle/internal/model/user.go
mcp/jungle/internal/service/config/server_config.go
mcp/jungle/internal/service/config/server_config_test.go
mcp/jungle/internal/service/mcp/mcp.go
mcp/jungle/internal/service/mcp/mcp_test.go
mcp/jungle/internal/service/mcp/prompt.go
mcp/jungle/internal/service/mcp/prompt_test.go
mcp/jungle/internal/service/mcp/proxy.go
mcp/jungle/internal/service/mcp/server.go
mcp/jungle/internal/service/mcp/tool.go
mcp/jungle/internal/service/mcp/tool_test.go
mcp/jungle/internal/service/mcp/util.go
mcp/jungle/internal/service/mcp/util_test.go
mcp/jungle/internal/service/mcpclient/mcp_client.go
mcp/jungle/internal/service/mcpclient/mcp_client_test.go
mcp/jungle/internal/service/toolgroup/toolgroup.go
mcp/jungle/internal/service/toolgroup/toolgroup_test.go
mcp/jungle/internal/service/user/user.go
mcp/jungle/internal/telemetry/metrics.go
mcp/jungle/internal/telemetry/noop_metrics.go
mcp/jungle/internal/telemetry/otel.go
mcp/jungle/internal/telemetry/otel_metrics.go
mcp/jungle/internal/util.go
mcp/jungle/internal/util_test.go
mcp/jungle/manifests/lootbox-manifest.example.json
mcp/jungle/manifests/lootbox-manifest.json
mcp/jungle/scripts/test-mcpjungle.sh
mcp/lootbox-main.zip
mcp/lootbox-main (2)/.gitignore
mcp/lootbox-main (2)/.mcp.json
mcp/lootbox-main (2)/create_test_data.ts
mcp/lootbox-main (2)/deno.json
mcp/lootbox-main (2)/deno.lock
mcp/lootbox-main (2)/install.sh
mcp/lootbox-main (2)/LLM_QUICK_START.md
mcp/lootbox-main (2)/lootbox-mcp-config.json
mcp/lootbox-main (2)/MCPIntegrationProgressSummary.md
mcp/lootbox-main (2)/podmanbuild.md
mcp/lootbox-main (2)/src/lootbox-cli.ts
mcp/lootbox-main (2)/src/version.ts
mcp/lootbox-main (2)/src/lib/client_cache.ts
mcp/lootbox-main (2)/src/lib/db.ts
mcp/lootbox-main (2)/src/lib/execute_llm_script.ts
mcp/lootbox-main (2)/src/lib/get_config.ts
mcp/lootbox-main (2)/src/lib/paths.ts
mcp/lootbox-main (2)/src/lib/script_history.ts
mcp/lootbox-main (2)/src/lib/ui_server.ts
mcp/lootbox-main (2)/src/lib/workflow_log.ts
mcp/lootbox-main (2)/src/lib/external-mcps/create_rpc_client_section.ts
mcp/lootbox-main (2)/src/lib/external-mcps/mcp_client_manager.ts
mcp/lootbox-main (2)/src/lib/external-mcps/mcp_config.ts
mcp/lootbox-main (2)/src/lib/external-mcps/mcp_schema_fetcher.ts
mcp/lootbox-main (2)/src/lib/external-mcps/parse_mcp_schemas.ts
mcp/lootbox-main (2)/src/lib/lootbox-cli/help.ts
mcp/lootbox-main (2)/src/lib/lootbox-cli/init.ts
mcp/lootbox-main (2)/src/lib/lootbox-cli/scripts.ts
mcp/lootbox-main (2)/src/lib/lootbox-cli/server.ts
mcp/lootbox-main (2)/src/lib/lootbox-cli/tools.ts
mcp/lootbox-main (2)/src/lib/lootbox-cli/types.ts
mcp/lootbox-main (2)/src/lib/type_system/client_generator.ts
mcp/lootbox-main (2)/src/lib/type_system/documentation_extractor.ts
mcp/mcp-proxy-master.zip
mcp/registry/data/seed.json
mcp/registry/docker-compose.yml
mcp/registry/go.mod
mcp/registry/go.sum
mcp/registry/deploy/.gitignore
mcp/registry/deploy/go.mod
mcp/registry/deploy/go.sum
mcp/registry/deploy/main.go
mcp/registry/deploy/Makefile
mcp/registry/deploy/Pulumi.gcpProd.yaml
mcp/registry/deploy/Pulumi.gcpStaging.yaml
mcp/registry/deploy/Pulumi.local.yaml
mcp/registry/deploy/Pulumi.yaml
mcp/registry/deploy/README.md
mcp/registry/docs/terms.md
mcp/registry/docs/explanations/design-principles.md
mcp/registry/docs/explanations/dev-summit-2025-05-registry-goals-presentation.pdf
mcp/registry/docs/explanations/dev-summit-2025-10-registry-status-presentation.pdf
mcp/registry/docs/explanations/ecosystem-vision.md
mcp/registry/docs/explanations/namespacing.md
mcp/registry/docs/explanations/roadmap.md
mcp/registry/docs/explanations/tech-architecture.md
mcp/registry/docs/explanations/versioning.md
mcp/registry/docs/reference/faq.md
mcp/registry/docs/reference/README.md
mcp/registry/docs/reference/api/CHANGELOG.md
mcp/registry/docs/reference/api/generic-registry-api.md
mcp/registry/docs/reference/api/official-registry-api.md
mcp/registry/docs/reference/api/openapi.yaml
mcp/registry/docs/reference/cli/commands.md
mcp/registry/docs/reference/server-json/CHANGELOG.md
mcp/registry/docs/reference/server-json/generic-server-json.md
mcp/registry/docs/reference/server-json/official-registry-requirements.md
mcp/registry/docs/reference/server-json/server.schema.json
mcp/registry/internal/api/openapi_compliance_test.go
mcp/registry/internal/api/server.go
mcp/registry/internal/api/server_test.go
mcp/registry/internal/api/handlers/v0/edit.go
mcp/registry/internal/api/handlers/v0/edit_test.go
mcp/registry/internal/api/handlers/v0/health.go
mcp/registry/internal/api/handlers/v0/health_test.go
mcp/registry/internal/api/handlers/v0/ping.go
mcp/registry/internal/api/handlers/v0/ping_test.go
mcp/registry/internal/api/handlers/v0/publish.go
mcp/registry/internal/api/handlers/v0/publish_integration_test.go
mcp/registry/internal/api/handlers/v0/publish_registry_validation_test.go
mcp/registry/internal/api/handlers/v0/publish_test.go
mcp/registry/internal/api/handlers/v0/response.go
mcp/registry/internal/api/handlers/v0/servers.go
mcp/registry/internal/api/handlers/v0/servers_test.go
mcp/registry/internal/api/handlers/v0/telemetry_test.go
mcp/registry/internal/api/handlers/v0/version.go
mcp/registry/internal/api/handlers/v0/version_test.go
mcp/registry/internal/api/handlers/v0/auth/oidc_test.go
mcp/registry/internal/api/router/router.go
mcp/registry/internal/api/router/v0.go
mcp/registry/internal/auth/blocks.go
mcp/registry/internal/auth/jwt.go
mcp/registry/internal/auth/jwt_test.go
mcp/registry/internal/auth/types.go
mcp/registry/internal/config/config.go
mcp/registry/internal/database/database.go
mcp/registry/internal/database/migrate.go
mcp/registry/internal/database/postgres.go
mcp/registry/internal/database/postgres_test.go
mcp/registry/internal/database/testutil.go
mcp/registry/internal/database/migrations/001_initial_schema.sql
mcp/registry/internal/database/migrations/002_add_server_extensions.sql
mcp/registry/internal/database/migrations/003_simplify_to_key_value.sql
mcp/registry/internal/database/migrations/004_update_meta_field_format.sql
mcp/registry/internal/database/migrations/005_add_server_id_rename_version_id.sql
mcp/registry/internal/database/migrations/006_migrate_server_json_camelcase.sql
mcp/registry/internal/database/migrations/007_add_publish_constraints.sql
mcp/registry/internal/database/migrations/008_clean_invalid_data.sql
mcp/registry/internal/database/migrations/009_separate_official_metadata.sql
mcp/registry/internal/database/migrations/010_migrate_canonical_package_refs.sql
mcp/registry/internal/importer/importer.go
mcp/registry/internal/importer/importer_test.go
mcp/registry/internal/service/registry_service.go
mcp/registry/internal/service/registry_service_test.go
mcp/registry/internal/service/service.go
mcp/registry/internal/service/versioning.go
mcp/registry/internal/service/versioning_test.go
mcp/registry/internal/telemetry/metrics.go
mcp/registry/internal/telemetry/metrics_test.go
mcp/registry/internal/validators/constants.go
mcp/registry/internal/validators/package.go
mcp/registry/internal/validators/utils.go
mcp/registry/internal/validators/validators.go
mcp/registry/internal/validators/validators_test.go
mcp/registry/internal/validators/registries/mcpb.go
mcp/registry/internal/validators/registries/mcpb_test.go
mcp/registry/internal/validators/registries/npm.go
mcp/registry/internal/validators/registries/npm_test.go
mcp/registry/internal/validators/registries/nuget.go
mcp/registry/internal/validators/registries/nuget_test.go
mcp/registry/internal/validators/registries/oci.go
mcp/registry/internal/validators/registries/oci_test.go
mcp/registry/internal/validators/registries/pypi.go
mcp/registry/internal/validators/registries/pypi_test.go
mcp/registry/internal/validators/registries/testutils_test.go
mcp/registry/scripts/test_endpoints.sh
mcp/registry/scripts/test_publish.sh
mcp/registry/scripts/mirror_data/.gitignore
mcp/registry/scripts/mirror_data/fetch_production_data.go
mcp/registry/scripts/mirror_data/load_production_data.go
mcp/registry/scripts/mirror_data/README.md
mcp/registry/tests/integration/docker-compose.integration-test.yml
mcp/registry/tests/integration/main.go
mcp/registry/tests/integration/README.md
mcp/registry/tools/validate-examples.sh
mcp/registry/tools/validate-schemas.sh
mcp/registry/tools/admin/auth.sh
mcp/registry/tools/admin/takedown.sh
mcp/registry/tools/extract-server-schema/main.go
mcp/roles-service/README.md
mcp/roles-service/server.cjs
my-app/
my-vscode-extension/
scripts/
src/
src/page-workspace1.tsx
src/page.tsx
src/client/main.ts
src/components/XtermTerminal.css
src/components/XtermTerminal.tsx
src/core/ModelSelector.ts
src/core/provider.ts
src/core/RoleCreator.ts
src/db/index.ts
src/db/init-db.ts
src/db/schema.sql
src/scripts/cleanup-openrouter-models.ts
src/scripts/index.ts
src/scripts/scheduler.ts
src/scripts/sync-aistudio-models.ts
src/scripts/sync-models.ts
src/server/index.ts
src/server/language-server.ts
src/server/router.e2e.test.ts
src/server/router.ts
src/server/server.ts
src/state/StateRepository.test.ts
src/state/StateRepository.ts
src/types/index.ts
src/types/provider.ts
src/types/role.ts
src/types/task.ts
src/utils/async.ts
src/utils/env.ts
src/utils/logger.ts
src/utils/network.ts
src/utils/providers.tsx
src/utils/resilience.ts
src/utils/trpc.ts
state/
tools/
tools/generator.cjs
tools/generator.js
tools/mcp-idle-watcher.js
volcano-sdk/
volcano-sdk/.gitignore
volcano-sdk/CHANGELOG.md
volcano-sdk/package.json
volcano-sdk/tests/agent.hooks.test.ts
volcano-sdk/tests/agent.metrics.agg.test.ts
volcano-sdk/tests/agent.patterns.test.ts
volcano-sdk/tests/agent.streaming.live.test.ts
volcano-sdk/tests/agent.streaming.test.ts
volcano-sdk/tests/agent.subagent.context.test.ts
volcano-sdk/tests/agent.timeout.test.ts
volcano-sdk/tests/agent.token-streaming.e2e.test.ts
volcano-sdk/tests/agent.token-streaming.test.ts
volcano-sdk/tests/agent.tools.loop.unit.test.ts
volcano-sdk/tests/agent.validation.test.ts
volcano-sdk/tests/mcp.agent.auth.test.ts
volcano-sdk/tests/mcp.auth.client.test.ts
volcano-sdk/tests/mcp.auth.test.ts
volcano-sdk/tests/mcp.connection-failure.test.ts
volcano-sdk/tests/mcp.oauth.comprehensive.test.ts
volcano-sdk/tests/mcp.openai-tool-limit.test.ts
volcano-sdk/tests/mcp.tool-name-length.test.ts
volcano-sdk/tests/orchestration-creator.test.ts
volcano-sdk/tests/progress.e2e.test.ts
volcano-sdk/tests/progress.hello-world.e2e.test.ts
volcano-sdk/tests/progress.renderer.test.ts
volcano-sdk/tests/progress.spacing.e2e.test.ts
volcano-sdk/tests/progress.subagent.e2e.test.ts
volcano-sdk/tests/helpers/mock-otel-collector.mjs
volcano-sdk/tests/llms/anthropic.integration.test.ts
volcano-sdk/tests/llms/anthropic.unit.test.ts
volcano-sdk/tests/llms/azure.integration.test.ts
volcano-sdk/tests/llms/azure.unit.test.ts
volcano-sdk/tests/llms/bedrock.integration.test.ts
```
