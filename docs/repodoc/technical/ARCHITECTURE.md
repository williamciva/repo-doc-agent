# repo-doc-agent — System Architecture

> Language: `en` | Depth: `detailed` | Generated at: `2026-11-23T12:51:46.804Z`

## Modules & Packages

No verified entries available for this section yet.

## External Dependencies

No verified entries available for this section yet.

## Internal Module Dependencies

```mermaid
graph LR
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_configuration_src_index_ts["C:\Users\Administrador\Documents\github\William Civa\repo-doc-agent\packages\configuration\src\index.ts"]
  node_schemas_project_js["./schemas/project.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_configuration_src_index_ts --> node_schemas_project_js
  node_schemas_global_js["./schemas/global.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_configuration_src_index_ts --> node_schemas_global_js
  node_loader_js["./loader.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_configuration_src_index_ts --> node_loader_js
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_configuration_src_loader_ts["C:\Users\Administrador\Documents\github\William Civa\repo-doc-agent\packages\configuration\src\loader.ts"]
  node_node_fs_promises["node:fs/promises"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_configuration_src_loader_ts --> node_node_fs_promises
  node_node_path["node:path"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_configuration_src_loader_ts --> node_node_path
  node_yaml["yaml"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_configuration_src_loader_ts --> node_yaml
  node_repodoc_shared["@repodoc/shared"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_configuration_src_loader_ts --> node_repodoc_shared
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_configuration_src_loader_ts --> node_schemas_project_js
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_configuration_test_config_test_ts["C:\Users\Administrador\Documents\github\William Civa\repo-doc-agent\packages\configuration\test\config.test.ts"]
  node_vitest["vitest"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_configuration_test_config_test_ts --> node_vitest
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_configuration_test_config_test_ts --> node_node_path
  node_src_schemas_project_js["../src/schemas/project.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_configuration_test_config_test_ts --> node_src_schemas_project_js
  node_src_loader_js["../src/loader.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_configuration_test_config_test_ts --> node_src_loader_js
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_engine_ts["C:\Users\Administrador\Documents\github\William Civa\repo-doc-agent\packages\ai-provider\src\engine.ts"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_engine_ts --> node_repodoc_shared
  node_repodoc_indexer["@repodoc/indexer"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_engine_ts --> node_repodoc_indexer
  node_types_js["./types.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_engine_ts --> node_types_js
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_index_ts["C:\Users\Administrador\Documents\github\William Civa\repo-doc-agent\packages\ai-provider\src\index.ts"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_index_ts --> node_types_js
  node_providers_base_http_provider_js["./providers/base-http-provider.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_index_ts --> node_providers_base_http_provider_js
  node_providers_openai_compatible_js["./providers/openai-compatible.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_index_ts --> node_providers_openai_compatible_js
  node_providers_anthropic_js["./providers/anthropic.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_index_ts --> node_providers_anthropic_js
  node_providers_google_js["./providers/google.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_index_ts --> node_providers_google_js
  node_providers_ollama_js["./providers/ollama.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_index_ts --> node_providers_ollama_js
  node_registry_js["./registry.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_index_ts --> node_registry_js
  node_engine_js["./engine.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_index_ts --> node_engine_js
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_registry_ts["C:\Users\Administrador\Documents\github\William Civa\repo-doc-agent\packages\ai-provider\src\registry.ts"]
  node_repodoc_configuration["@repodoc/configuration"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_registry_ts --> node_repodoc_configuration
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_registry_ts --> node_types_js
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_registry_ts --> node_providers_openai_compatible_js
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_registry_ts --> node_providers_anthropic_js
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_registry_ts --> node_providers_google_js
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_registry_ts --> node_providers_ollama_js
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_types_ts["C:\Users\Administrador\Documents\github\William Civa\repo-doc-agent\packages\ai-provider\src\types.ts"]
  node_zod["zod"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_types_ts --> node_zod
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_src_types_ts --> node_repodoc_shared
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_test_ai_provider_test_ts["C:\Users\Administrador\Documents\github\William Civa\repo-doc-agent\packages\ai-provider\test\ai-provider.test.ts"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_test_ai_provider_test_ts --> node_vitest
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_test_ai_provider_test_ts --> node_zod
  node_src_providers_openai_compatible_js["../src/providers/openai-compatible.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_test_ai_provider_test_ts --> node_src_providers_openai_compatible_js
  node_src_providers_anthropic_js["../src/providers/anthropic.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_test_ai_provider_test_ts --> node_src_providers_anthropic_js
  node_src_providers_google_js["../src/providers/google.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_test_ai_provider_test_ts --> node_src_providers_google_js
  node_src_providers_ollama_js["../src/providers/ollama.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_test_ai_provider_test_ts --> node_src_providers_ollama_js
  node_src_registry_js["../src/registry.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_test_ai_provider_test_ts --> node_src_registry_js
  node_src_engine_js["../src/engine.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_test_ai_provider_test_ts --> node_src_engine_js
  node_src_types_js["../src/types.js"]
  node_C__Users_Administrador_Documents_github_William_Civa_repo_doc_agent_packages_ai_provider_test_ai_provider_test_ts --> node_src_types_js
```

## Architectural Decisions

No verified entries available for this section yet.

## Configurations & Enums

No verified entries available for this section yet.

## Traceability

- **Knowledge Item IDs:** none
- **Referenced Source Files:** `packages/ai-provider/package.json`, `packages/analyzer/package.json`, `packages/dependency-graph/package.json`, `packages/core/package.json`, `packages/documentation/package.json`, `packages/configuration/package.json`, `packages/git-intelligence/package.json`, `packages/indexer/package.json`, `packages/knowledge/package.json`, `packages/permissions/package.json`, `packages/shared/package.json`, `packages/repository/package.json`, `packages/persistence/package.json`, `apps/cli/package.json`, `apps/mcp-server/package.json`
