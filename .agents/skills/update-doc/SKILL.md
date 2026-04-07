---
name: update-doc
description: Update project documentation after implementing new features, API endpoints, CLI commands, architectural changes, or workflow changes that affect how the project is understood, used, or maintained. Covers docs/ and README.md. Maintains Tables of Contents (up to h4). Handles new doc files by linking them from README.md. NEVER modifies CLAUDE.md, MEMORY.md, specs/, or docs/manual/. Do NOT use for internal refactors, small bug fixes, dependency bumps, test-only changes, or any change that does not affect usage, behavior, APIs, or conceptual understanding.
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
argument-hint: "[optional notes on what to document and how]"
---

# Update Documentation

Update the relevant documentation files based on the recent changes **only if those changes meaningfully impact how the project should be understood, used, or maintained**.

**User notes:** `$ARGUMENTS`

If the user provided notes above, treat them as the **primary guide** for this entire workflow. The notes take precedence over your own analysis — they define what to prioritize, what to emphasize, and how to frame the changes. When no notes are provided, rely on the diff analysis and your own judgment.

---

## When to Use This Skill

### DO update documentation for

- New features or capabilities
- Changes to existing behavior, flags, options, or configuration
- Architectural changes that affect how the system works or is deployed
- Workflow changes (new deployment steps, new environment variables, new scripts)
- New or removed integrations, dependencies, or services
- Changes to data models, schemas, or API contracts

### Do NOT update documentation for

- Internal refactors that do not change external behavior
- Small bug fixes with no user-facing impact
- Dependency bumps or lock-file updates
- Test-only changes (new tests, test refactors)
- Code style or formatting changes
- Changes confined entirely to `specs/`, `docs/manual/`, or `.claude/`

If in doubt, err on the side of **not** updating — unnecessary doc churn is worse than a brief delay.

---

## Phase 1 — Diagnostic (sub-agent)

**Goal**: Audit the current state of all documentation files without consuming the master agent's context window. This phase produces a structured report that drives all subsequent decisions.

### Step 0 — Determine the project root

Run `git rev-parse --show-toplevel` to get the repository root. All file operations use this path as the base. Never use the current working directory.

### Step 1 — Launch diagnostic sub-agent

Spawn an **Explore** sub-agent with this task:

> Read [references/diagnostic-checklist.md](references/diagnostic-checklist.md) and execute every check against the project's documentation files. Scan `<project_root>/README.md` and `<project_root>/docs/*.md` (excluding `docs/manual/`). Return the full diagnostic report as specified in the checklist.

The sub-agent reads all doc files, checks compliance, and returns a structured report. The master agent does **not** read the doc files during this phase — it only receives the report.

### Step 2 — Parse the diagnostic report

From the report, classify every issue into two buckets:

**Deterministic fixes** (no judgment needed — apply unconditionally):

| Issue | Action |
|---|---|
| TOC missing | Add linked TOC immediately after h1, covering headings up to h4 |
| TOC present but plain text (no anchors) | Convert to linked markdown list format with anchor links |
| TOC present but stale (entries don't match headings) | Regenerate TOC from current headings |
| File not linked from README doc index | Add link with one-line summary to README's Documentation section |
| docs/gotchas.md missing | Create it (content populated in Phase 3 if new gotchas are found, otherwise create with a placeholder note to be filled during next major update) |

**Judgment calls** (requires LLM intelligence — decide in Phase 3):

| Issue | Decision criteria |
|---|---|
| File over 750 lines | Split only if multiple concerns can be identified. A single-concern file at 780 lines is acceptable. |
| Numeric claims that may be stale | Verify against current code before changing |
| File references to renamed/deleted files | Confirm the reference is broken before fixing |
| Potential stale content sections | Only update if the diff from Phase 2 confirms the behavior changed |

---

## Phase 2 — Change Analysis

### Step 3 — Analyze the code diff

Run:

```bash
git diff HEAD~1 --name-only
```

If HEAD~1 doesn't capture all session changes (e.g., multiple commits), widen the range or use `git diff --cached --name-only` for staged changes. The goal is a complete list of modified source files.

Classify changes:
- **New files** — new modules, commands, API endpoints, utilities
- **Modified files** — changed behavior, new flags, renamed interfaces
- **Deleted files** — removed features or deprecated code

If the user provided notes, use them to focus: the notes define which changes matter most.

### Step 4 — Filter to relevant documentation files

For each documentation file from the diagnostic report, ask: **could this file be affected by the code changes?**

- Does the file describe a system, component, or workflow that the changes touch?
- Does the file contain counts, lists, or summaries that are now stale?
- Does the file reference files, functions, or concepts that were added, renamed, or removed?

Only include files that pass this impact test. Files with only deterministic compliance fixes (TOC, cross-links) are always included regardless of code impact.

---

## Phase 3 — Plan

### Step 5 — Build the action plan

Merge the diagnostic findings (Phase 1) with the content changes (Phase 2) into a single action plan. For each file, list:

1. **Deterministic fixes** to apply (from Phase 1 Step 2)
2. **Content updates** needed based on the code diff
3. **Structural changes** if the file is over or approaching 750 lines

**Decision rules for structural changes:**

- File is currently over 750 lines → **must split**. Identify sub-concerns that can be extracted into new focused docs/ files.
- File is under 750 lines but the planned content update would push it over → **split before writing**. Extract existing sub-concerns first, then add new content.
- File is under 750 lines and the update keeps it under → **no structural change needed**.

**Decision rules for new file creation:**

- The change introduces an entirely new subsystem, command family, or architectural component not covered by any existing doc → **create** a new `docs/<topic>.md`
- The change adds a section to an existing area (new flag on existing command) → **update** the existing doc
- When unsure → update the existing file

When creating new documentation files, follow these standards:
- Include a linked TOC immediately after the h1, covering headings up to h4
- Cross-link to related docs/ files
- Use concrete examples from the actual codebase, not generic placeholders
- Write for a developer who knows nothing about this project
- Ensure the file stays under 750 lines

---

## Phase 4 — Execute

### Step 6 — Apply all changes

Process files in this order:

1. **Structural splits first** — If any file needs splitting, do it before modifying content. Create the new focused files, move the extracted content, and update cross-links.
2. **Content updates** — Apply content changes to each affected file. Follow these writing standards:
   - Use the project's actual terminology, variable names, and conventions
   - Include concrete examples from the actual codebase when adding new content
   - Remove outdated descriptions when behavior has changed — do not leave stale information alongside new information
3. **TOC fixes** — After all content changes are applied to a file, regenerate or fix its TOC. The TOC must use linked markdown list format with anchor links, covering headings up to h4.
4. **Cross-link fixes** — Add any missing links (README doc index, inter-file cross-references).
5. **docs/gotchas.md** — If the diagnostic flagged it as missing, create it. If the code changes reveal non-obvious behavior, surprising design choices, or pitfalls, add them here. If no new gotchas were discovered, create the file with a brief note explaining its purpose for future updates.

### Step 7 — Handle README doc index

After all file operations are complete, verify the README's Documentation section:

- Every `docs/*.md` file must have a corresponding entry with a one-line summary
- Entries for deleted files must be removed
- For monorepo projects, verify the Project Structure section includes per-sub-project orientation if applicable

---

## Phase 5 — Validate

### Step 8 — Final compliance pass

Run through each modified file and verify:

1. **Size guardrails** — README.md ≤ 750 lines, each docs/ file ≤ 750 lines. If any file exceeds the guardrail after updates, split it now.
2. **TOC correctness** — Every file has a linked TOC after h1, all entries match current headings, no broken anchors.
3. **Cross-links** — Every docs/ file is linked from README. New files are cross-referenced from at least one other doc.
4. **Counts and summaries** — Numeric claims in updated files match the current state.
5. **No stale content** — Updated files do not contain descriptions of old behavior alongside new behavior.
6. **docs/gotchas.md** — Exists.

### Step 9 — Summarize

List what was done:
- Files updated (with brief description of changes)
- Files created (with reason)
- Files split (with what was extracted where)
- Deterministic fixes applied (TOC, cross-links, README index)

---

## Protected Files (NEVER modify)

- **`CLAUDE.md`** — Any `CLAUDE.md` at any level. Project instructions managed exclusively by the user.
- **`MEMORY.md`** — Claude auto-memory file. Do not read, edit, or write any `.md` files in auto-memory directories.
- **`specs/`** — Entire specifications directory at project root.
- **`docs/manual/`** — Entire manual documentation directory.
- **`.claude/`** — Entire `.claude/` directory (skills, commands, memory, settings).

---

## Documentation Standards Reference

These standards apply to all documentation files created or modified by this skill. They align with the init-doc skill that creates the initial documentation.

| Standard | Rule |
|---|---|
| **TOC** | Every file must have a linked markdown TOC (with anchor links) immediately after h1, covering up to h4 |
| **Size** | README.md ≤ 750 lines, docs/*.md ≤ 750 lines (soft guardrails — single-concern coherence is the primary driver) |
| **Cross-links** | All docs must be cross-linked. Every docs/ file linked from README |
| **Gotchas** | docs/gotchas.md must always exist |
| **Examples** | Use concrete examples from the actual codebase, not generic placeholders |
| **Audience** | Write for a developer who knows nothing about this project |
| **Terminology** | Use the project's actual terminology, variable names, and conventions |
| **Single concern** | Each docs/ file focused on one topic. Split rather than let files grow unbounded |
