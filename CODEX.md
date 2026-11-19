# CODEX.md

# Codex — Project Instructions

The shared development contract is defined in `AGENTS.md`.

The authoritative product specification is:

- `MASTER_SPECIFICATION.md`

This file contains additional guidance for Codex and does not replace the shared instructions.

## 1. Task Execution

For every task:

1. Inspect the current repository state.
2. Read the relevant implementation and tests.
3. Identify the smallest appropriate change.
4. Check whether the task requires architectural decisions.
5. Implement only within the explicitly authorized scope.
6. Validate the result.
7. Report the outcome.

Do not assume that a task should be implemented before understanding its context.

## 2. Planning and Approval

For major features, architectural changes, or multi-module implementations:

- Start with a technical assessment.
- Identify affected components and dependencies.
- Present the proposed implementation plan.
- Identify risks and acceptance criteria.
- Wait for approval when required by the shared authorization policy.

For small and unambiguous authorized tasks, proceed without unnecessary planning.

## 3. Repository Operations

- Prefer read-only commands during exploration.
- Inspect `git status` and relevant diffs before proposing modifications.
- Never discard existing user changes.
- Never overwrite unrelated work.
- Never execute destructive Git operations without explicit authorization.
- Never treat test execution or build commands as inherently safe if they may modify persistent state.

## 4. Code Changes

- Follow existing project conventions.
- Keep changes minimal and cohesive.
- Avoid unrelated refactoring.
- Preserve public interfaces unless explicitly requested.
- Add tests for new behavior and relevant regressions.
- Do not weaken tests to hide implementation problems.

## 5. Dependencies and Configuration

Before adding or changing dependencies:

- Check whether the functionality already exists in the project.
- Evaluate maintenance, compatibility, and security implications.
- Explain why the dependency is necessary.
- Obtain authorization before modifying dependency manifests or lockfiles.

## 6. Validation

Run relevant checks only when authorized and safe:

- Type checking.
- Linting.
- Unit tests.
- Integration tests.
- Build validation.

Report commands that were not executed. Never fabricate successful validation.

## 7. Final Response

Keep the final response concise and include:

- Summary.
- Files changed.
- Tests executed.
- Known limitations.
- Follow-up actions, if any.