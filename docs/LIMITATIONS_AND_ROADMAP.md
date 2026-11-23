# RepoDocAgent — Known Limitations & Roadmap

> Language: `en` | Scope: Phase 10 Validation & Self-Documentation

## Current Limitations

1. **Non-TypeScript Parsing Depth (`@repodoc/analyzer`):**
   - TypeScript and JavaScript files are parsed with full AST fidelity via the TypeScript Compiler API.
   - Other languages (Python, Go, Java, Rust, etc.) currently rely on `GenericRegexParser`, which extracts top-level declarations reliably for common patterns but does not resolve complex nested scopes or cross-file type inference.
   - **Planned improvement:** Add optional Tree-sitter WASM grammars behind the existing `LanguageParser` contract.

2. **Knowledge Approval & Self-Documentation (`@repodoc/knowledge`, `@repodoc/documentation`):**
   - In `manual` approval mode (default), newly inferred symbol knowledge items remain `pending` until reviewed and approved by the user, so `COMPONENTS.md` lists only approved items unless `includeUnapproved: true` is passed.
   - **Planned improvement:** Add batch approval filters by category/confidence in the CLI and MCP tools.

3. **Semantic Vector Search (`@repodoc/indexer`):**
   - When an `EmbeddingProvider` is configured, cosine similarity is computed over chunks loaded from SQLite. This scales well for small-to-medium repositories but is not yet backed by a native vector index extension (e.g., `sqlite-vec`).
   - **Planned improvement:** Introduce an optional vector index backend behind `SearchIndexRepository`.

4. **Streaming in AI Providers (`@repodoc/ai-provider`):**
   - `AIProviderEngine.stream()` currently delegates to `provider.stream()` if implemented, falling back to a single chunk from `complete()`. Native SSE streaming adapters for OpenAI/Anthropic/Google are not yet implemented.
   - **Planned improvement:** Add SSE line parsers to the HTTP provider adapters.

## Verified Capabilities (Phases 1–10)

- End-to-end offline operation across repository discovery, AST/regex analysis, SQLite FTS5 indexing, dependency graph impact analysis, Mermaid diagram generation, CLI (`repodoc`), and MCP stdio server (`repodoc-mcp`).
- Strict enforcement of explicit write authorization (`PermissionsEngine`) and path traversal protection (`assertSafePath`) across all physical write paths.
- Multi-provider AI abstraction (`openai`, `anthropic`, `google`, `deepseek`, `siliconflow`, `openrouter`, `ollama`) with Zod structured output and automatic fallback.
