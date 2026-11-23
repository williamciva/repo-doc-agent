# repo-doc-agent — Project Overview

> Language: `en` | Depth: `detailed` | Generated at: `2026-11-23T14:25:08.432Z`

## Summary

Agnostic platform for repository analysis, software knowledge management, and documentation

- **Repository Type:** Monorepo (pnpm)
- **Total Files:** 139
- **Discovered Symbols:** 381

### Languages Detected

- `typescript`: 109 files (318900 bytes)
- `json`: 30 files (15027 bytes)
<!-- traceability: fb837ee7f9de6434 -->

## Architecture Diagram

```mermaid
flowchart TD
  node_repodoc_ai_provider["@repodoc/ai-provider"]
  node_repodoc_analyzer["@repodoc/analyzer"]
  node_repodoc_core["@repodoc/core"]
  node_repodoc_documentation["@repodoc/documentation"]
  node_repodoc_git_intelligence["@repodoc/git-intelligence"]
  node_repodoc_dependency_graph["@repodoc/dependency-graph"]
  node_repodoc_configuration["@repodoc/configuration"]
  node_repodoc_indexer["@repodoc/indexer"]
  node_repodoc_knowledge["@repodoc/knowledge"]
  node_repodoc_repository["@repodoc/repository"]
  node_repodoc_permissions["@repodoc/permissions"]
  node_repodoc_persistence["@repodoc/persistence"]
  node_repodoc_shared["@repodoc/shared"]
  node_repodoc_cli["@repodoc/cli"]
  node_repodoc_mcp_server["@repodoc/mcp-server"]
```
<!-- traceability: fb837ee7f9de6434 -->

## Traceability

- **Knowledge Item IDs:** `fb837ee7f9de6434`
- **Referenced Source Files:** none
