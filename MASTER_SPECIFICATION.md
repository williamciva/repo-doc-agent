# RepoDocAgent — Complete Architecture, Development, and Implementation Specification

## 1. Role and Objective

Act as a Principal Software Engineer, Software Architect, and specialist in AI-assisted software development tools.

Your mission is to design and implement **RepoDocAgent**, an agnostic platform for repository analysis, understanding, documentation, and software knowledge management.

RepoDocAgent must be capable of deeply analyzing any software project, understanding its architecture, identifying components, dependencies, execution flows, integrations, and business rules, generating technical and functional documentation, and keeping this knowledge up to date as the project evolves.

The tool must not depend on a specific AI agent, programming language, or model provider.

The product must work independently as well as integrate with AI-assisted development tools.

The goal is to build persistent knowledge infrastructure for software repositories, allowing different agents and tools to understand a project through a shared, structured, and traceable source of knowledge.

**Core principle: knowledge belongs to the project, not to the AI agent working on it.**

---

# 2. Product Vision

RepoDocAgent must operate as an intelligence and documentation layer over any repository.

Its operation must support three usage modes.

### 2.1. Standalone

Users interact directly with RepoDocAgent through its own CLI.

This mode must support:

- Repository analysis.
- Structure, module, and dependency discovery.
- Documentation generation.
- Existing documentation updates.
- Knowledge retrieval.
- Questions about the project.
- Recording answers and clarifications.
- Analysis history retrieval.
- Project knowledge status inspection.

The CLI must work without an AI provider, offering structural analysis and deterministic capabilities.

When an AI provider is configured, more advanced semantic capabilities must become available.

### 2.2. Agent-assisted

RepoDocAgent must expose an MCP server that allows any compatible agent to access project knowledge and use its capabilities.

External agents must be able to:

- Query project architecture.
- Search implementations.
- Retrieve business rules.
- Identify dependencies and relationships.
- Ask questions about the repository.
- Request specific analyses.
- Register new knowledge.
- Retrieve existing documentation.
- Identify outdated documentation.
- Prepare documentation update proposals.
- Request documentation generation or updates.

MCP must be treated as the primary integration contract between RepoDocAgent and external agents.

### 2.3. Hybrid

Combine the native CLI, MCP server, and AI providers.

In this mode, users can interact with RepoDocAgent directly or through external agents while maintaining the same shared knowledge base and security rules.

All three modes must use the same business logic core.

Do not implement duplicated or independent functionality for each mode.

---

# 3. Architectural Principles

Follow these principles throughout implementation:

1. Language agnosticism: target repositories may use any programming language or technology.
2. AI agnosticism: no specific provider or model must be mandatory.
3. Modularity: each component must have clearly defined responsibilities.
4. Extensibility: new parsers, providers, integrations, and analysis strategies must be easy to add.
5. Persistence: knowledge must survive agent, session, and provider changes.
6. Traceability: information must reference its origins whenever applicable.
7. Incrementality: changes must allow selective reprocessing.
8. Security: no physical modifications without explicit authorization.
9. Configurability: important behaviors must be configurable per project.
10. Reproducibility: analyses and updates must maintain sufficient history and context for auditing.
11. Independence: essential functionality must not depend exclusively on embeddings or AI models.
12. Consistency: CLI, MCP, and external agents must follow the same business rules.

Avoid unnecessary abstractions. Prioritize simple interfaces, explicit contracts, and independent components.

---

# 4. Technology Stack

Prefer the following technologies:

| Area | Technology |
|---|---|
| Primary language | TypeScript |
| Runtime | Node.js |
| Package manager | pnpm |
| Architecture | Modular monorepo |
| Persistence | SQLite |
| Validation | Zod |
| Testing | Vitest |
| Integration protocol | MCP |
| Parsing | Tree-sitter |
| Documentation | Markdown |
| Configuration | YAML and JSON |
| Diagrams | Mermaid |
| Version control | Git |

Use stable dependency versions that are compatible with each other at implementation time.

Enable TypeScript strict mode.

The architecture must allow persistence, parsing, embeddings, and AI providers to be replaced without compromising the product's core.

---

# 5. Overall Architecture

Develop the product as a modular monorepo.

Organize the core into components with independent and clearly defined responsibilities.

## 5.1. Repository Engine

Responsible for repository interaction and discovery.

Capabilities:

- Repository identification.
- Directory structure discovery.
- Relevant file identification.
- Configurable file and directory exclusions.
- Programming language and technology detection.
- Controlled file reading.
- Monorepo detection.
- Module and package discovery.
- Configuration file identification.
- Git integration.
- Local repository support.

This engine must be language-independent.

Do not assume specific structures such as `src`, `app`, `lib`, `backend`, or `frontend`.

These structures may be recognized as conventions but must never be mandatory requirements.

## 5.2. Analyzer Engine

Responsible for understanding the repository technically.

Combine structural analysis, syntax analysis, and semantic analysis.

Capabilities:

- Class, function, method, and interface identification.
- Module identification.
- Import and export identification.
- Dependency identification.
- Cross-component call identification.
- API endpoint and contract identification.
- Entity and model identification.
- External integration identification.
- Configuration identification.
- Execution flow identification.
- Entry point identification.
- Architectural pattern identification.
- Technology identification.
- Critical component identification.
- Potential business rule identification.

Use Tree-sitter whenever applicable.

Implement an extensible architecture for language-specific parsers and analyzers.

The absence of specialized support for a programming language must not prevent basic project analysis.

When a specialized parser is unavailable, use generic structural and textual analysis strategies.

Clearly distinguish between:

- Information directly found in the source code.
- Information deduced through analysis.
- Information inferred by AI.
- Information confirmed by users.

Never present inferences as confirmed facts.

## 5.3. Knowledge Engine

This is one of the product's core components.

Its responsibility is to build, store, relate, and evolve knowledge about the repository.

Knowledge must not be restricted to Markdown documentation.

Implement a dedicated, persistent, and queryable knowledge structure.

Organize knowledge into categories such as:

- Architecture.
- Modules.
- Components.
- Classes.
- Functions.
- Execution flows.
- Integrations.
- APIs.
- Entities.
- Business rules.
- Technical rules.
- Architectural decisions.
- Configurations.
- Dependencies.
- Processes.
- Conventions.
- Constraints.
- Observations and clarifications.

Whenever applicable, each knowledge item must contain:

- Identifier.
- Category.
- Content.
- Source.
- File references.
- Related symbols.
- Discovery timestamp.
- Last update timestamp.
- Confidence level.
- Provenance.
- Approval status.
- Relationships with other knowledge items.

### Knowledge Provenance

Explicitly distinguish three categories:

**Confirmed**

Information directly found in the source code or explicitly confirmed by the user.

**Inferred**

Information deduced by the analysis engine or AI without explicit confirmation.

**Pending**

Information that requires clarification or validation.

The system must allow users to configure how newly discovered knowledge is approved.

### Knowledge Approval

Provide two project-level modes:

- Manual: newly inferred knowledge remains pending until approved.
- Automatic: knowledge may be logically accepted without requesting individual approval.

Even in automatic mode, preserve the original provenance.

Automatically inferred knowledge must never be represented as information directly confirmed by the source code or the user.

**Important:** logical knowledge approval does not imply authorization to write files.

Internal persistence explicitly authorized as part of normal system operation must follow the configured policies. Any physical modification to user files still requires explicit authorization.

## 5.4. Documentation Engine

Responsible for transforming structured knowledge into documentation.

Documentation must cover two major areas.

### Technical Documentation

- Architecture overview.
- Project structure.
- Module organization.
- Component responsibilities.
- Internal execution flows.
- Dependencies.
- Integrations.
- APIs.
- Models and entities.
- Configurations.
- Execution processes.
- Diagrams.
- Architectural decisions.
- Conventions.
- Development instructions.

### Business Documentation

- System objectives.
- Features.
- Business processes.
- Business rules.
- Validations.
- Constraints.
- States and transitions.
- Operational workflows.
- Relationships between entities.
- Exceptions and specific behaviors.
- Dependencies between processes.

Documentation must be based on structured knowledge and provide traceability back to its sources.

Do not generate superficial documentation based only on directory and file names.

Documentation depth must reflect the actual behavior of the system.

### Configurable Documentation Depth

Allow documentation depth to be configured per project:

- Overview: general system vision and primary concepts.
- Standard: architecture, modules, and main execution flows.
- Detailed: technical and functional details of relevant components.
- Comprehensive: in-depth documentation including relationships, business rules, execution flows, dependencies, exceptions, and architectural decisions.

The implementation must allow these levels to be customized in the future.

### Configurable Documentation Language

Documentation language must be a native, independent configuration for each project.

Users must be able to choose Portuguese, English, or any other desired language.

Do not restrict the system to a fixed language list.

Use standardized language codes whenever applicable, such as:

- `pt-BR`: Brazilian Portuguese.
- `pt-PT`: European Portuguese.
- `en`: English.
- `es`: Spanish.
- `fr`: French.
- `de`: German.

Also support other languages and regional variants.

Example configuration:

```yaml
documentation:
  language: en
```

The configured language must be respected in:

- Technical documentation.
- Business documentation.
- Project overviews.
- Module and component descriptions.
- Documented business rules.
- Diagrams and their textual labels.
- Change summaries.
- Analysis reports.
- Incremental documentation updates.
- AI-generated explanatory content.

The configured language must be independent of the source code language, existing comments, and the language used by the external agent.

Example: a Java project with English identifiers may have all its documentation generated in Brazilian Portuguese.

### Content Preservation Rules

- Never translate class, function, method, variable, table, column, endpoint, or technical identifier names.
- Preserve official technology, library, protocol, and product names.
- Preserve code snippets.
- Preserve file references and paths.
- Never change the meaning of business rules during translation.
- Maintain consistent terminology throughout the documentation.
- Support configurable project glossaries.
- When existing documentation uses another language, allow the system to identify it and propose translation.
- Avoid unnecessary language mixing within the same document.

The configured language must be respected by all AI providers and generation mechanisms.

If no AI provider is available, the tool must continue performing structural analysis normally and respect the configured language in deterministic messages and templates.

The external agent's conversational response language may continue to be determined by the external agent itself, unless the user explicitly requests that the response follow the project's documentation language.

Changing the configured language must not automatically translate or overwrite existing documents without explicit authorization.

## 5.5. Git Intelligence

Responsible for understanding project evolution.

Capabilities:

- Current Git state identification.
- Modified file analysis.
- Version comparison.
- Commit identification.
- Added, modified, and deleted file identification.
- Diff analysis.
- Affected symbol identification.
- Impacted dependency identification.
- Potentially outdated documentation identification.
- Documentation update proposal preparation.

Git must be used as an important source for incremental updates.

No Git operation that modifies repository state may be executed without explicit authorization.

## 5.6. Dependency Graph

Build a graph representing repository relationships.

The graph must represent:

- Files.
- Modules.
- Classes.
- Functions.
- Interfaces.
- Entities.
- Services.
- Endpoints.
- Dependencies.
- Calls.
- Integrations.
- Business flows.
- Relationships between knowledge items.

The purpose is to allow RepoDocAgent to understand the impact of a change.

Example:

A change to an entity may impact:

- Services that use the entity.
- Repositories.
- Controllers.
- APIs.
- Tests.
- Business rules.
- Related documentation.

Use the graph to identify the elements that need to be reanalyzed.

The graph must be persisted and incrementally updated.

## 5.7. Indexer and RAG

Implement an indexing layer to enable efficient queries.

The system must initially support:

- Full-text search.
- Identifier search.
- Path search.
- Structural search.
- Relationship-based search.
- Search by knowledge category.

RAG must be an optional complementary capability.

Allow integration with:

- Embeddings.
- Vector search.
- Hybrid search.
- Reranking.
- Configurable chunking.
- Contextual retrieval.
- Filters by source, category, and provenance.

Embeddings and rerankers must be abstracted.

No embedding provider must be mandatory.

The absence of embeddings must not compromise basic functionality.

## 5.8. AI Provider Engine

Implement an AI provider-independent architecture.

The system must allow different providers and models to be configured.

Consider support for:

- OpenAI.
- Anthropic.
- Google.
- DeepSeek.
- SiliconFlow.
- OpenRouter.
- Ollama.
- OpenAI-compatible endpoints.
- Additional providers introduced in the future.

Keep the following concepts separate:

1. Model provider.
2. Model.
3. External AI client.
4. External agent.
5. Integration tool.

A client such as OpenCode is not a model provider.

OpenCode may use native models or external providers, including SiliconFlow.

RepoDocAgent must be able to use model providers directly when configured, without requiring an external CLI.

Define contracts for:

- Chat completion.
- Structured output.
- Embeddings.
- Reranking.
- Streaming.
- Token usage.
- Error handling.
- Limits and timeouts.

The provider must be replaceable without modifying the business logic core.

## 5.9. Permissions Engine

Implement a centralized permissions mechanism.

All operations that modify state must pass through it.

No module may bypass this mechanism.

## 5.10. Configuration Engine

Centralize global and project-specific configuration.

Implement schema validation, defaults, controlled inheritance, and configuration resolution.

---

# 6. File Organization and Persistence

Clearly separate:

1. Project configuration and instructions.
2. Technical and business documentation.
3. Shared project knowledge state.
4. Personal and machine-specific volatile state.

## 6.1. `.repodoc/` Directory

The `.repodoc/` directory must contain only the elements required for RepoDocAgent configuration and operation within the project.

Examples:

- Project configuration.
- General agent instructions.
- Conventions.
- Schemas.
- Templates.
- Policies.
- Documentation configuration.
- Integration configuration.

Do not place all technical and business documentation inside this directory by default.

## 6.2. Documentation Destination

The documentation destination must be independently configurable per project.

Supported possibilities:

- Directory inside the repository.
- External directory.
- Another repository.
- Shared directory.

Example:

```yaml
documentation:
  destination:
    type: local
    path: ./docs/repodoc
```

Allow the destination to be changed without compromising persisted knowledge.

## 6.3. Shared State and Local State

Separate versionable project state from personal machine state.

Shared state must allow different developers and agents to access the same knowledge.

Local state may contain:

- Cache.
- Temporary indexes.
- Sessions.
- Personal preferences.
- Credentials.
- Machine-specific configuration.

## 6.4. Global Configuration

Use a global directory such as:

`~/.repodocagent/`

Respect XDG standards and operating system conventions whenever applicable.

This directory should store:

- Global configurations.
- Providers.
- Credentials.
- Preferences.
- Cache.
- Local indexes.
- Sessions.
- CLI configuration.

Credentials must never be stored in versioned project files.

---

# 7. Project Configuration

Each project must have independent configuration.

Conceptual example:

```yaml
version: 1

project:
  name: example-project

documentation:
  language: en
  depth: detailed

  destination:
    type: local
    path: ./docs/repodoc

  update:
    mode: manual
    incremental: true

knowledge:
  approval:
    mode: manual

analysis:
  include:
    - src/**
    - packages/**

  exclude:
    - node_modules/**
    - dist/**
    - build/**
    - coverage/**
    - .git/**

ai:
  provider: default
  model: default

integrations:
  mcp:
    enabled: true
```

This example is illustrative.

Define robust schemas using Zod, including validation, defaults, and extensibility.

Document all configuration options.

Do not implement duplicated or inconsistent configuration logic across modules.

---

# 8. Incremental Documentation Updates

RepoDocAgent must avoid reanalyzing and regenerating the entire project whenever a small change occurs.

Implement an incremental strategy based on:

1. Git diff.
2. Modified files.
3. Added files.
4. Deleted files.
5. Affected symbols.
6. Dependency graph.
7. Related knowledge.
8. Impacted documents.

Example:

When a service changes, the system must identify:

- Which service changed.
- Which functions were affected.
- Which components depend on it.
- Which business flows use the service.
- Which knowledge items became outdated.
- Which documents need review.

### Update Modes

Allow users to configure:

- Manual: the user explicitly requests the update.
- Automatic: the system identifies changes and prepares updates automatically.

Automatic mode may perform analysis, identify impacts, and prepare proposals.

However, physically writing files always requires explicit authorization.

Updates must support:

- Partial updates.
- Full updates.
- Specific document reviews.
- Comparison between current documentation and proposed changes.
- Change identification.
- Approval before writing.

---

# 9. Iterative Questions and Continuous Learning

RepoDocAgent must not be merely a documentation generator.

It must operate as an agent capable of discussing the project and progressively deepening its understanding.

Examples:

- Why does a particular service use RabbitMQ?
- How does the authentication process work?
- What is the rule for calculating a particular value?
- Which modules depend on this entity?
- What happens when an integration fails?
- What is the complete order creation flow?
- Are there any restrictions on a particular operation?

When the available knowledge is insufficient, the system must:

1. Identify the knowledge gap.
2. Present what is already known.
3. Explain what could not yet be confirmed.
4. Ask objective questions.
5. Record the answers.
6. Relate the answers to existing knowledge.
7. Update the knowledge state.
8. Identify potentially impacted documents.

User-provided answers must be persisted and shared within the project context.

They must not remain restricted to the current session or the agent that asked the question.

Acquired knowledge must be accessible through the CLI, MCP, and other agents.

Allow users to configure knowledge approval using manual and automatic modes.

Preserve the provenance of every information item.

---

# 10. MCP Server

The MCP server must be one of the product's primary interfaces.

Implement clearly defined tools, resources, and prompts.

### Suggested Tools

- `analyze_repository`
- `get_project_overview`
- `search_repository`
- `search_knowledge`
- `get_module_details`
- `get_symbol_details`
- `get_dependencies`
- `get_dependency_impact`
- `get_business_rules`
- `get_documentation`
- `ask_repository`
- `register_knowledge`
- `approve_knowledge`
- `get_pending_knowledge`
- `analyze_git_changes`
- `get_documentation_status`
- `propose_documentation_update`
- `generate_documentation`
- `preview_documentation_changes`
- `get_project_configuration`

Tools must have clear schemas and validation.

Do not create tools that execute arbitrary operations.

Write operations must have explicit authorization mechanisms.

### Suggested Resources

- Project overview.
- Architecture.
- Modules.
- Knowledge.
- Business rules.
- Documentation.
- Analysis status.
- Public project configuration.
- Dependency graph.

### Suggested Prompts

- Analyze repository.
- Understand architecture.
- Investigate business rule.
- Explain execution flow.
- Review documentation.
- Identify change impacts.
- Update documentation.

MCP must allow external agents to use RepoDocAgent as a software understanding tool, not merely as a file generator.

---

# 11. Agent and Tool Integrations

Priority integrations must be considered from the first version.

Consider:

- Claude Code.
- OpenAI Codex.
- OpenCode.
- Antigravity.
- Other MCP-compatible clients.

The goal is to provide integrations through generic contracts, avoiding dependencies on specific implementations.

### OpenCode

OpenCode must be explicitly considered in the implementation plan.

It must work with:

- OpenCode native models.
- External providers.
- SiliconFlow.
- Other compatible providers.

Do not confuse OpenCode integration with SiliconFlow integration.

The former is a development client/agent; the latter is a model provider.

### Agent Instructions

Provide general instructions explaining:

- What RepoDocAgent is.
- How to use its tools.
- How to query knowledge.
- How to register new knowledge.
- How to interpret provenance.
- How to respect permissions.
- How to request documentation updates.

Use client-specific instruction files when necessary, but keep MCP as the primary integration contract.

---

# 12. Native CLI

Develop an independent CLI.

Suggested command name:

`repodoc`

Conceptual commands:

```bash
repodoc init
repodoc analyze
repodoc analyze --full
repodoc analyze --incremental

repodoc docs generate
repodoc docs update
repodoc docs preview
repodoc docs status

repodoc ask "How does authentication work?"

repodoc knowledge list
repodoc knowledge pending
repodoc knowledge approve

repodoc graph
repodoc git changes

repodoc config show
repodoc config validate

repodoc mcp start

repodoc providers list
repodoc providers configure
```

These commands are suggested interface examples.

The CLI must provide:

- Help.
- Argument validation.
- Clear messages.
- Consistent exit codes.
- Logging.
- Error handling.
- Interactive mode when useful.
- Human-readable output.
- Structured output for automation, such as JSON.

### Offline Operation

Without an AI provider:

- Identify files.
- Analyze structure.
- Detect programming languages.
- Build structural graphs.
- Index content.
- Search symbols.
- Identify dependencies.
- Query persisted knowledge.
- Generate documentation using deterministic templates.

With an AI provider:

- Semantic analysis.
- Complex execution flow explanations.
- Business rule interpretation.
- Information synthesis.
- Contextual answers.
- Advanced documentation generation.

The absence of AI must never prevent the product from operating.

---

# 13. Diagrams and Visualizations

Use Mermaid to represent:

- Architecture.
- Dependencies.
- Execution flows.
- Sequences.
- Relationships.
- Business processes.
- States.
- Integrations.

Diagrams must be generated from structured knowledge.

Do not produce merely decorative diagrams disconnected from the analysis.

Textual diagram labels must respect the configured documentation language.

Technical identifiers must remain unchanged.

---

# 14. Persistence and Database

Use SQLite as the initial persistence mechanism.

Design schemas capable of storing:

- Projects.
- Configurations.
- Analysis executions.
- Files.
- Symbols.
- Modules.
- Dependencies.
- Relationships.
- Knowledge items.
- Provenance.
- Approvals.
- Documents.
- Documentation references.
- Change history.
- Sessions and interactions.
- Search indexes.

Implement migrations.

Separate persistence repositories from business services.

The database must not be accessed directly by components outside the responsible module.

Allow future implementations using alternative persistence mechanisms.

---

# 15. Security and Authorization

This is a non-negotiable project requirement.

**No physical mutation may occur without explicit user authorization.**

This rule applies to the CLI, MCP, external agents, and all internal mechanisms.

A mutation is any operation that changes files, configurations, history, or repository state.

Examples include:

- Creating files.
- Editing files.
- Deleting files.
- Renaming files.
- Creating directories.
- Changing configurations.
- Writing documentation.
- Overwriting documents.
- Executing `git add`.
- Executing `git rm`.
- Executing `git commit`.
- Executing `git push`.
- Executing `git pull`.
- Executing `git merge`.
- Executing `git switch`.
- Executing `git checkout`.
- Executing `git reset`.
- Executing `git rebase`.
- Executing `git clean`.
- Any operation that changes local or remote repository state.

### Explicit Authorization

Authorization must specify:

- Authorized operation.
- Scope.
- Involved files or directories.
- Type of modification.
- Execution context.

Generic authorizations must never be interpreted as unrestricted permissions.

Approving knowledge does not authorize documentation writing.

Enabling automatic updates does not authorize file writing.

The ability to generate a proposal does not authorize applying it.

### Operation Separation

Clearly distinguish:

1. Reading.
2. Analysis.
3. Proposal preparation.
4. Preview.
5. Authorization.
6. Write execution.

Reading, analysis, and proposal preparation may occur according to configured policies.

Write execution must always verify authorization.

### Additional Security Requirements

Implement protection against:

- Path traversal.
- Writing outside authorized scope.
- Credential exposure.
- Environment variable leakage.
- Arbitrary commands generated by AI.
- Prompt injection in repository files.
- Malicious document content.
- Unauthorized configuration changes.
- Destructive operations.

Never execute arbitrary shell commands suggested by a model.

Prefer controlled internal operations with validated arguments.

Authorization must be enforced by RepoDocAgent's core, not merely by its interface.

---

# 16. Suggested Monorepo Structure

Use pnpm workspaces.

An initial structure may look like:

```text
repodocagent/
├── apps/
│   ├── cli/
│   └── mcp-server/
│
├── packages/
│   ├── core/
│   ├── repository/
│   ├── analyzer/
│   ├── knowledge/
│   ├── documentation/
│   ├── git-intelligence/
│   ├── dependency-graph/
│   ├── indexer/
│   ├── ai-providers/
│   ├── integrations/
│   ├── permissions/
│   ├── configuration/
│   ├── persistence/
│   ├── parsers/
│   ├── shared/
│   └── testing/
│
├── fixtures/
│   ├── typescript/
│   ├── java-spring/
│   ├── python/
│   ├── sql/
│   └── monorepo/
│
├── docs/
├── .repodoc/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
```

This is an architectural reference.

Adjust the organization according to actual needs, avoiding excessive fragmentation.

Each package must have:

- A clearly defined responsibility.
- A public API.
- Explicit types.
- Tests.
- Minimal documentation.
- Controlled dependencies.

Avoid circular dependencies.

---

# 17. Internal Organization and the Skills Concept

Consider the concepts of agent, tool, skill, instruction, and workflow organization used by ecosystems such as Career-Ops as an architectural and operational reference.

The goal is to organize RepoDocAgent into specialized capabilities with well-defined and reusable responsibilities.

Consider creating specialized skills for tasks such as:

- Repository Discovery.
- Architecture Analysis.
- Code Analysis.
- Business Rules Discovery.
- Dependency Mapping.
- Documentation Generation.
- Documentation Review.
- Incremental Analysis.
- Knowledge Management.
- Git Impact Analysis.
- Repository Question Answering.

Each skill must define:

- Objective.
- Required context.
- Inputs.
- Outputs.
- Available tools.
- Constraints.
- Completion criteria.

Skills must not duplicate the product's core logic.

They must orchestrate capabilities exposed by the core.

The product must remain independent of any specific agent framework.

---

# 18. Testing and Validation

Product quality must be validated against projects using different languages and architectures.

Create representative or realistic fixtures.

Consider:

- TypeScript.
- Java with Spring Boot.
- Python.
- SQL and PL/SQL.
- Monorepos.
- Frontend and backend projects.
- Microservice projects.
- Projects with external integrations.

Use Vitest.

Implement the following test categories.

### Unit Tests

For every module and service.

### Integration Tests

Validate:

- Persistence.
- Parsing.
- Indexing.
- Graph construction.
- Knowledge Engine.
- Documentation Engine.
- AI providers.
- Configuration.
- Permissions.
- MCP.

### End-to-End Tests

Validate the complete workflow:

1. Project initialization.
2. Repository discovery.
3. Structural analysis.
4. Semantic analysis, when available.
5. Knowledge persistence.
6. Documentation generation.
7. CLI queries.
8. MCP queries.
9. New knowledge registration.
10. Incremental updates.
11. Change previews.
12. Authorization and controlled execution.

### Language Tests

Validate:

- Brazilian Portuguese.
- English.
- Other languages.
- Technical identifier preservation.
- Terminology consistency.
- Incremental generation in the same language.
- Configured language changes.
- No unintended translation of code or references.

### Security Tests

Validate:

- Write prevention without authorization.
- Prevention of changes outside authorized scope.
- Path traversal protection.
- Arbitrary command execution prevention.
- Credential protection.
- Prompt injection handling.
- Separation between logical approval and physical authorization.

---

# 19. Mandatory Architectural Planning Before Implementation

Before starting implementation, inspect the existing context and produce a structured technical plan.

This step is mandatory.

Do not start creating files and implementing features before understanding the scope and defining the architecture.

The planning phase must include:

1. Inspection of the existing repository structure.
2. Identification of technologies and dependencies.
3. Definition of the overall architecture.
4. Definition of module responsibilities.
5. Definition of contracts, interfaces, and schemas.
6. Definition of communication mechanisms.
7. Identification of module dependencies.
8. Definition of persistence strategy.
9. Definition of security and authorization strategy.
10. Definition of testing strategy.
11. Identification of technical risks.
12. Identification of relevant architectural decisions.
13. Creation of an incremental implementation roadmap.

The roadmap must be divided into phases containing:

- Objective.
- Scope.
- Involved modules.
- Dependencies.
- Deliverables.
- Required tests.
- Completion criteria.

Present the technical plan before starting implementation.

Do not attempt to develop all modules in a single step.

Implement progressively, respecting architectural dependencies and validating each phase before proceeding.

Planning must not become bureaucratic. Prioritize practical, justified decisions that fit the product scope.

If the repository already contains an implementation, inspect what exists before proposing replacements or restructuring.

Do not discard existing functionality without technical justification.

---

# 20. Self-Documentation: RepoDocAgent Must Document Itself

The RepoDocAgent repository must be used as the first real-world application and validation case for the product.

Self-documentation must not be treated merely as a future demonstration.

As soon as the analysis and documentation mechanisms are sufficiently functional, use RepoDocAgent itself to analyze and document its own source code.

Objectives:

- Validate analysis of a modular TypeScript application.
- Validate monorepo understanding.
- Identify modules and their responsibilities.
- Identify contracts and dependencies.
- Understand internal execution flows.
- Document architectural decisions.
- Identify business rules and behaviors.
- Evaluate generated documentation quality.
- Validate traceability between documentation and source code.
- Test incremental documentation updates.
- Test questions and clarifications about the codebase itself.
- Identify limitations and opportunities for improvement.

RepoDocAgent documentation must evolve alongside the software.

Whenever new modules, features, or contracts are implemented, the tool must be used to identify impacts and propose documentation updates.

Whenever possible, use this process to discover problems in the product itself and feed those findings back into development.

The documentation language of RepoDocAgent itself must be defined by its project configuration, just like any other repository.

**Principle: RepoDocAgent must be able to understand, explain, and document its own architecture before being considered sufficiently validated for analyzing external projects.**

---

# 21. Implementation Phases

Organize development into phases.

The complete architecture must be planned from the beginning, but implementation must proceed incrementally.

## Phase 1 — Foundation

- Monorepo setup.
- TypeScript strict mode.
- pnpm workspaces.
- Package structure.
- Shared schemas and types.
- Configuration Engine.
- SQLite persistence.
- Migrations.
- Logging.
- Error handling.
- Basic tests.

## Phase 2 — Repository Engine

- Project discovery.
- Directory analysis.
- Language identification.
- File reading.
- Exclusions.
- Monorepo detection.
- Initial Git integration.

## Phase 3 — Analyzer Engine

- Parsing.
- Symbol identification.
- Structural analysis.
- Dependency identification.
- Metadata extraction.
- Initial specialized parsers.

## Phase 4 — Knowledge Engine

- Knowledge model.
- Provenance.
- Approval.
- Persistence.
- Relationships.
- Questions and answers.
- Interaction history.

## Phase 5 — Documentation Engine

- Templates.
- Markdown.
- Configurable language.
- Configurable depth.
- Technical documentation.
- Business documentation.
- Mermaid diagrams.
- Traceability.
- Change previews.

## Phase 6 — Git Intelligence and Dependency Graph

- Diff analysis.
- Impact identification.
- Dependency graph.
- Incremental updates.
- Outdated documentation detection.

## Phase 7 — Indexer and RAG

- Full-text search.
- Structural search.
- Indexing.
- Contextual retrieval.
- Optional embeddings.
- Hybrid search.
- Optional reranking.

## Phase 8 — AI Provider Engine

- Provider contracts.
- Initial integrations.
- Structured output.
- Streaming.
- Embeddings.
- Model configuration.
- Fallback strategies.

## Phase 9 — CLI and MCP

- Functional CLI.
- MCP server.
- Tools.
- Resources.
- Prompts.
- Agent instructions.
- Priority integrations.

## Phase 10 — Validation and Self-Documentation

- Complete test suite.
- Security tests.
- Tests against projects using different languages.
- RepoDocAgent self-documentation.
- Limitation analysis.
- Identified improvements.
- Installation documentation.
- Usage documentation.
- Integration examples.

Phases may be reorganized when technically justified, but their dependencies must be respected.

---

# 22. Product Documentation

RepoDocAgent itself must have development and usage documentation.

Create documentation for:

- Overview.
- Architecture.
- Monorepo structure.
- Module responsibilities.
- Configuration.
- Installation.
- CLI.
- MCP.
- Providers.
- Integrations.
- Persistence.
- Security.
- Permissions.
- Skills.
- Testing.
- Development.
- Contribution guidelines.

The main README should initially be written in Portuguese, with the possibility of providing an English version as well.

Installation and integration instructions must cover:

- OpenCode.
- Claude Code.
- Codex.
- Antigravity.
- Compatible MCP clients.

Product documentation must be maintained with the assistance of RepoDocAgent itself, subject to explicit write authorization.

---

# 23. Acceptance Criteria

The product will be considered functional when it satisfies the following requirements.

### Architecture

- Organized monorepo.
- Core independent of interfaces.
- Modules with clear responsibilities.
- Well-defined contracts.
- No circular dependencies.

### Analysis

- Project structure identification.
- Multiple programming language support.
- Symbol identification.
- Dependency identification.
- Offline structural analysis.

### Knowledge

- Persistence independent of sessions.
- Provenance.
- Configurable approval.
- Iterative questions.
- Shared access between CLI and MCP.

### Documentation

- Technical documentation.
- Business documentation.
- Configurable depth.
- Configurable language.
- Configurable destination.
- Diagrams.
- Traceability.
- Incremental updates.

### AI

- Interchangeable providers.
- No mandatory model.
- Optional RAG.
- Operation without AI.

### Integrations

- Native CLI.
- MCP server.
- Integration with MCP clients.
- Planned support for priority tools.

### Security

- No writes without authorization.
- No Git mutations without authorization.
- Separation between logical approval and physical authorization.
- Credential and file protection.

### Self-Documentation

- Ability to analyze its own repository.
- Documentation of its own architecture.
- Incremental documentation updates.
- Identification of limitations through real-world usage.

---

# 24. Execution Guidelines for the Development Agent

When executing this project:

1. Read this entire specification.
2. Inspect the repository and available context.
3. Identify the current project state.
4. Present the architectural plan.
5. Define module organization and contracts.
6. Present implementation phases.
7. Wait for plan validation when relevant decisions require user input.
8. Implement progressively.
9. Run tests continuously.
10. Do not proceed with broken or unvalidated features.
11. Record important architectural decisions.
12. Keep contracts and types consistent.
13. Avoid abstractions without concrete justification.
14. Do not duplicate business rules between CLI, MCP, and other components.
15. Keep security enforcement centralized.
16. Strictly respect write authorization.
17. Use RepoDocAgent itself to document its repository as soon as sufficient functionality exists.
18. Use the configured language for all generated documentation.
19. Update product documentation as the software evolves, subject to explicit authorization.
20. At the end of each phase, report what was implemented, which tests were executed, their results, and what remains.

Do not consider a feature complete merely because its code has been written.

It must be integrated, validated, and covered by tests appropriate to its responsibility.

If a technical decision requires user input, present the alternatives and their consequences, then request only the necessary information.

Do not reopen decisions that have already been explicitly defined in this specification.

---

# 25. Expected Outcome

RepoDocAgent must ultimately become an independent software understanding and documentation platform capable of:

- Analyzing different programming languages and architectures.
- Understanding complex projects.
- Building a persistent knowledge base.
- Documenting technical aspects and business rules.
- Generating documentation in any configured language.
- Answering questions about repositories.
- Learning from user-provided clarifications.
- Identifying changes and their impacts.
- Updating documentation incrementally.
- Operating offline for structural capabilities.
- Using different AI providers.
- Integrating with different agents through MCP.
- Providing its own CLI.
- Preserving knowledge across sessions and agents.
- Enforcing explicit authorization for every physical mutation.
- Understanding and documenting itself.

**Final vision: RepoDocAgent is not merely a documentation generator. It is a persistent intelligence layer over software, transforming source code, history, decisions, and human knowledge into a structured, queryable, and continuously evolving representation of a project.**