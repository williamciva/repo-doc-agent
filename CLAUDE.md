# CLAUDE.md

@AGENTS.md

# Claude Code — Project Instructions

## 1. Instruction Hierarchy

- Treat `AGENTS.md` as the shared development contract.
- Treat `MASTER_SPECIFICATION.md` as the authoritative product specification.
- Follow explicit user instructions and authorization boundaries.
- Do not create conflicting instructions or duplicate shared policies.

## 2. Exploration Before Implementation

Before implementing a task:

- Inspect the relevant files and their dependencies.
- Read applicable nested `AGENTS.md` and `CLAUDE.md` files.
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
- Preserve existing behavior unless the task explicitly requires changing it.
- Verify changes using relevant tests and validation commands.

## 6. Context Continuity

For long-running tasks:

- Keep track of approved scope and completed work.
- Identify unresolved decisions.
- Preserve relevant implementation context in the project's existing documentation when authorized.
- Reinspect the current repository state when resuming work.
- Never assume that a previous session's authorization covers a new or broader operation.

## 7. Completion Report

At the end of an implementation task, provide a concise report covering:

- Implemented changes.
- Important decisions.
- Tests executed and their results.
- Remaining issues.
- Any action requiring user authorization.