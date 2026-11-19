# GEMINI.md

@AGENTS.md

# Gemini / Antigravity — Project Instructions

## 1. Instruction Hierarchy

- Treat `AGENTS.md` as the shared development contract.
- Treat `MASTER_SPECIFICATION.md` as the authoritative product specification.
- Follow explicit user instructions and authorization boundaries.
- Do not create conflicting instructions or duplicate shared policies.

## 2. Exploration Before Implementation

Before implementing a task:

- Inspect the relevant files and their dependencies.
- Read applicable nested `AGENTS.md` and `GEMINI.md` files.
- Identify existing patterns before introducing new ones.
- Reuse existing abstractions when appropriate.
- Avoid assuming that an unfamiliar module is unnecessary or obsolete.

## 3. Use of Subagents

Use subagents when work can be meaningfully parallelized, such as:

- Independent architectural reviews.
- Separate research tasks.
- Isolated test analysis.
- Independent module investigations.

Do not delegate simple tasks, single-file changes, or work requiring tightly shared context.

Subagents must follow the same project instructions and authorization restrictions.

Delegation does not grant additional permissions.

## 4. Tool and Command Discipline

- Prefer read-only inspection before proposing changes.
- Explain potentially destructive commands before requesting authorization.
- Do not bypass permission controls.
- Do not use unrestricted execution modes to circumvent project authorization rules.
- Do not assume that an available tool is automatically authorized for every operation.

## 5. Implementation Discipline

- Prefer focused changes over broad rewrites.
- Avoid speculative improvements.
- Do not create unnecessary helper files or abstractions.
- Preserve