---
name: init-doc
description: Generate comprehensive project documentation from scratch by analyzing source code. Use when a project has no documentation, incomplete documentation, or legacy documentation that needs to be fully replaced. Creates a README.md hub and docs/ folder with detailed topic files. Works with any language, framework, or stack. This is a full documentation bootstrap — not incremental updates (use update-doc for that).
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
disable-model-invocation: true
argument-hint: "[optional: specific focus or context]"
---

# init-doc

Generate comprehensive project documentation by deeply analyzing source code. Works with any language, framework, or stack.

## Output Standard

Documentation produced by this skill:
1. **README.md** at project root — the documentation hub linking to all docs/ files
2. **docs/** folder — detailed topic files, one per concern
3. **docs/gotchas.md** — always created; captures non-obvious behavior and pitfalls

### Size Guardrails

Each documentation file has a soft line limit. Exceeding it signals the file covers multiple concerns and should be split.

| File | Soft limit | Rationale |
|---|---|---|
| README.md | 750 lines | Hub document — must be self-sufficient as entry point, especially for monorepos |
| docs/*.md | 750 lines | Technical docs need room for code examples, but the single-concern principle must hold |

These limits are guardrails, not hard walls. A 780-line file that is genuinely about one cohesive topic is fine. But a file that keeps growing across maintenance cycles is a file that needs splitting. The primary driver is always **single-concern coherence** — line count is the check-yourself moment.

### Table of Contents

Every documentation file produced — README.md and every docs/ file — **MUST** include a Table of Contents immediately after the h1 heading, granular up to h4. No exceptions.

The TOC must use **linked markdown list format** with anchor links so that both LLMs and humans can navigate to specific sections without reading the full file:

```markdown
## Table of Contents
- [Section Name](#section-name)
  - [Subsection](#subsection)
    - [Detail](#detail)
```

### Cross-Linking

All docs must be cross-linked so `init-context` can recursively traverse the full knowledge graph, and structured so `update-doc` can maintain them going forward.

## Process

### Phase 1: Reconnaissance

Execute the full reconnaissance process documented in [../init-mission/reconnaissance.md](../init-mission/reconnaissance.md). This produces a structured project summary covering project identity, shape, infrastructure, and existing documentation.

#### Optional: Mission Document

After completing reconnaissance, offer the user the option to create a mission document:

> "Before I dive into the codebase, would you like to create a **mission document** (`docs/mission.md`)? It captures your project's vision, values, non-goals, users, and UX compass through a short interview. This gives the documentation a strategic foundation — I can reference it to write docs that reflect what the project is actually trying to achieve, not just what the code does. It's optional and takes about 5 minutes. We can also do this later."

- **If the user accepts**: Invoke `/init-mission` and pass the reconnaissance results as the argument. Wait for init-mission to complete before continuing to Phase 2.
- **If the user declines**: Continue to Phase 2 as normal.

### Phase 2: Deep Analysis

Read source code systematically. Focus on understanding behavior, not exhaustive line-by-line reading.

1. **Start at entry points** — Read main modules to understand the core purpose and execution flow
2. **Trace data flow** — Follow how data enters the system, transforms, and exits
3. **Map APIs and interfaces** — Endpoints, routes, CLI commands, exported functions, event handlers
4. **Understand configuration** — Environment variables (check `.env.example` or equivalent), config files, feature flags
5. **Read tests** — Tests reveal expected behavior, edge cases, and integration points
6. **Identify patterns** — Architecture style, error handling, auth model, logging, naming conventions
7. **Note gotchas** — Non-obvious behavior, surprising design choices, workarounds, known limitations
8. **Check scripts** — Build, test, deploy, and utility scripts in package manifests or Makefiles

### Phase 3: Documentation Plan

**STOP. Do NOT write any files until the user approves this plan.**

1. **Propose the docs/ file list** — Only files relevant to this project. Use the topic catalog below.
2. **Outline each file** — Draft the section headings for README.md and each docs/ file
3. **Estimate sizes** — Include a rough line estimate for each proposed file. If any file is projected to exceed 750 lines, proactively split it in the plan rather than discovering the issue after writing.
4. **Note what will be replaced** — If legacy docs exist, explicitly list what will be removed
5. **Present the plan and wait for user approval**

#### Topic Catalog

Only create docs/ files that are warranted. Common topics:

| File | When to create |
|---|---|
| `docs/architecture.md` | Multi-component systems, non-trivial data flow, service interactions |
| `docs/database.md` | Schemas, migrations, data models, seed scripts |
| `docs/api.md` | REST, GraphQL, gRPC, or WebSocket endpoints |
| `docs/cli.md` | CLI tools with commands, flags, and usage patterns |
| `docs/deployment.md` | Non-trivial deploy process, CI/CD pipelines, environments |
| `docs/configuration.md` | Many env vars, config files, secrets management |
| `docs/testing.md` | Complex test setup, multiple test types, test data |
| `docs/infrastructure.md` | IaC resources, cloud services, networking, scaling |
| `docs/gotchas.md` | **Always created** — pitfalls, edge cases, non-obvious behavior |
| `docs/mission.md` | Created by init-mission — business vision, values, non-goals, users, UX compass |

Create additional topic files if the project demands it (e.g., `docs/auth.md`, `docs/etl.md`). Never create empty shells — every file must have substantive content.

### Phase 4: Writing

After user approves the plan:

1. **Create `docs/` directory** if it doesn't exist
2. **Write docs/ files first** — each topic file with:
   - Clear heading hierarchy (h1 through h4 max)
   - Table of Contents (up to h4) immediately after the h1
   - Cross-links to related docs/ files where relevant
   - Concrete examples from the actual codebase — not generic placeholders
3. **Write README.md last** — the hub document structured as:
   - Project name (h1) and one-line description
   - Table of Contents (up to h4), using linked markdown list format with anchor links
   - **Overview** — what the project does, why it exists, who it's for
   - **Getting Started** — prerequisites, installation, configuration, running
   - **Project Structure** — brief annotated directory layout. For monorepos, include a per-sub-project orientation (one paragraph per sub-project explaining its purpose, stack, and entry point) so readers know which docs/ file to load next.
   - **Documentation** — links to every docs/ file with a one-line summary per link. If `docs/mission.md` exists, its entry must include a brief explanation of how it supports decision-making at two levels:
     - **Proactive (before implementation)** — when a bug fix or feature request comes in, the mission provides the lens through which to interpret and approach it. This context can steer the implementation in a direction that aligns with the project's ultimate goals — a direction that would not emerge without the mission.
     - **Reactive (when facing multiple solutions)** — when multiple valid approaches exist, the mission provides enough context to choose the best path without asking the user. The AI should only escalate to the user when there is a genuine conflict or ambiguity that the mission cannot resolve — this should be the exception, not the rule.
4. **Remove legacy docs** — delete any old README or outdated documentation files that were replaced. Only remove files you are replacing with new equivalents.

### Phase 5: Validation

After writing all documentation:

1. **Verify cross-links** — every docs/ file must be linked from README.md; cross-links between docs/ files must point to real files
2. **Check file sizes** — verify README.md is under 750 lines and each docs/ file is under 750 lines. If any file exceeds the guardrail, split it by extracting sub-concerns into new focused files and linking from the original.
3. **Spot-check accuracy** — re-read 2-3 key source files and verify documentation matches
4. **Summarize** — list what was created and what was removed

## Constraints

- NEVER modify `CLAUDE.md`, `MEMORY.md`, `.claude/`, `specs/`, or `docs/manual/`
- NEVER fabricate information — if something cannot be determined from source code, say so explicitly
- NEVER write documentation for code you haven't read
- NEVER skip Phase 3 — always get user approval before writing any files
- NEVER create empty documentation files
- NEVER omit a Table of Contents — every file (README.md and every docs/ file) must have a linked markdown TOC immediately after its h1, granular up to h4
- NEVER let a file exceed its size guardrail without splitting — README.md at 750 lines, docs/ files at 750 lines
- Write for a developer who knows nothing about this project
- Use the project's actual terminology, variable names, and conventions — not generic placeholders
- Include concrete examples from the actual codebase — not generic placeholders or hypothetical snippets
- Keep each docs/ file focused on a single concern — split rather than merge
