# Changelog

## [1.24.0] - 2026-04-06

### Added
- Add `enable` and `disable` command routing with trigger phrases (enable, disable, toggle on/off, turn on/off, activate, deactivate, too many skills)
- Add enable/disable to quick syntax table, disambiguation rules, and parameter extraction (supports short names and multiple skills)
- Add enable/disable presentation guidelines and JSON response shapes in `references/json-shapes.md`
- Add full Enable / Disable Commands section in `references/command-reference.md` with syntax, flags, behavior notes, and aliases
- Add Enable / Disable Skills section in `references/multi-agent.md` explaining symlink mechanics, use cases, and disabled-state persistence through updates
- Add `enabled` boolean field documentation to `list` JSON shape

### Changed
- Update `list` presentation to show enabled/disabled status for managed skills
- Update multi-agent commands table to include `enable`/`disable` and note that install/update/refresh respect disabled state
- Update Section 9 (Multi-Agent Support) with cross-reference to enable/disable documentation

## [1.23.1] - 2026-04-06

### Fixed
- Fix validation-fix-swallowing bug in Skill Release Workflow — when validation fails and the agent fixes errors (e.g., refactoring SKILL.md to reduce line count), those fixes are now recognized as additional changes that must be recorded, bump type re-evaluated, documented in CHANGELOG, and re-validated before proceeding to bump and publish
- Fix validation-fix-swallowing bug in publish pre-flight checks — step 3 now warns that validation fixes are new unbumped changes, and step 7's "already bumped" shortcut is explicitly blocked when validation fixes were applied, forcing the Skill Release Workflow to run for proper bump + CHANGELOG before publishing

## [1.23.0] - 2026-04-01

### Added
- Add workspace membership management routing (`people list`, `add`, `remove`, `role`, `search`) with natural-language trigger phrases and parameter extraction rules
- Add workspace group management routing (`groups list`, `create`, `delete`, `show`, `add`, `remove`, `default`) with trigger phrases
- Add group-level skill access routing (`access list`, `grant`, `revoke`, `set`) with dependency-aware grant flow documentation
- Add quick syntax entries, result presentation rules, and JSON response shapes for all 18 new workspace management subcommands
- Add full command reference for people, groups, and access commands in `references/command-reference.md`
- Add disambiguation rules for overloaded verbs ("add", "remove", "search", "audit") between existing and new commands
- Add "audit <skill-name>", "audit my skill", "run an audit on" trigger phrases to Skill Audit Workflow routing

### Changed
- Make `convert` auth optional — routing table shows `No (auth optional)`, Section 2 explains two modes (authenticated auto-resolves workspace, unauthenticated requires `--workspace`)
- Update Section 2 auth list — add `delete` and scoped search variants that were previously missing
- Remove "audit skills" from `list` routing row to prevent ambiguity with Skill Audit Workflow
- Deduplicate forbidden characters table — `happyskills-conventions.md` §9 now references `skill-authoring.md` §3 instead of duplicating the full table
- Update DRY compliance check in audit workflow (`skill-workflows.md`) to distinguish mechanical duplication (must fix) from intentional co-location (acceptable for agent prompts, under-limit SKILL.md, different audiences)
- Add `workspace`, `access-management` keywords to skill.json

## [1.22.0] - 2026-03-30

### Added
- Add Skill Update Workflow — new routing entry and 4-phase procedure (pre-flight divergence check, session context analysis, best-practices-compliant changes, validation, optional release) in SKILL.md Section 7 and `references/skill-workflows.md`
- Add Skill Audit Workflow — new routing entry and 4-phase procedure (read all files, run validate, manual quality review including DRY compliance, report with optional fix application) in SKILL.md Section 7 and `references/skill-workflows.md`
- Add "Handling Validate Errors" subsection to SKILL.md Section 5 — instructs LLM to follow `recommendations` from validate response, with fallback procedure for description `max_length` errors (AUDIT → LOSSLESS COMPRESSION → LOSSY COMPRESSION → VERIFY)
- Add `recommendations` array to CLI `validate` command for description `max_length` errors — returns prescriptive 4-step procedure with 3 NEVER rules and exact character deficit
- Add DRY best practice (#13) to `references/skill-authoring.md` Section 9 — defines when to extract, when not to, and exceptions
- Add DRY anti-pattern to `references/skill-authoring.md` Section 10 — "Same procedure or rule copy-pasted across multiple files"
- Add DRY check to authoring workflow (SKILL.md Section 7, step 9) and Skill Update Workflow (Phase 3, step 7)
- Add audit-related trigger phrases to SKILL.md description (audit skill quality, skill health check, review skill for best practices)
- Add update-related trigger phrases to SKILL.md description (update existing skill, improve this skill, apply session learnings)

### Changed
- Extract Common Procedures section in `references/skill-workflows.md` — Optional Fields Prompt, Invocation Model Confirmation, Workspace Resolution, First-Time Publish are each defined once and referenced from all enrichment workflows
- Refactor Post-Init, Post-Convert, and Post-Fork enrichment workflows to reference Common Procedures instead of duplicating ~150 lines of optional fields, license selection, and publish logic
- Expand forbidden characters list in `references/happyskills-conventions.md` Section 9 from semicolon-only to all 10 forbidden characters matching `references/skill-authoring.md`
- Replace inline system dependencies format instructions in enrichment workflows with references to `references/happyskills-conventions.md` § 4
- Replace inline workspace resolution in Skill Release Workflow with reference to Common Procedures
- Update all 9 validate steps across SKILL.md and references to include recommendation-following instructions
- Compress SKILL.md description to stay under 1024 chars while adding new trigger phrases — removed REINFORCING phrases that overlapped with existing UNIQUE triggers

## [1.21.0] - 2026-03-30

### Added
- Add `status`, `pull`, `diff` command routing to Section 1 — three merge safety commands were entirely missing from the skill's knowledge
- Add merge diagnostic intent routing ("why can't I publish", "merge conflict", "diverged", "resolve conflicts") to Section 1
- Add `status`, `pull`, `diff` to Section 3 quick syntax table
- Add Section 10 (Merge & Sync Intelligence) — diagnostic decision tree mapping status values to actions, pull strategies table, merge_parents/merge commit awareness, publish failure recovery workflow, and full-report semantic review guidance
- Add `DIVERGED` error pattern to Section 5 (Error Handling) with recovery guidance (pull → resolve → re-publish)
- Add conflict marker and conflict file error patterns to Section 5
- Add merge-related trigger phrases to SKILL.md frontmatter description (pull, merge, sync, diff, conflict, diverged, publish rejected)
- Add `references/merge-workflows.md` — comprehensive merge playbooks covering status diagnosis, pull workflow (fast-forward/auto-merge/conflicts), conflict resolution guide (markers, strategies, per-file), publish-after-merge flow (merge commits vs rebase semantics), TOCTOU handling, full-report AI review, and 6 common scenario playbooks
- Add Merge & Sync Commands section to `references/command-reference.md` — full syntax for `status` (all flags, status values), `pull` (strategies, per-file syntax, full-report, strict mode), `diff` (three modes, file classifications)
- Add `status`, `pull`, `diff` JSON response shapes to `references/json-shapes.md` — status results with divergence fields, pull with three response variants (up_to_date/fast_forward/merged+conflicts), diff with mode and report
- Add mandatory divergence pre-flight check (step 2) to publish workflow in `references/command-reference.md` — runs `status` before publish and handles outdated/diverged/conflicts states
- Add DIVERGED recovery procedure and merge commit documentation to publish section in `references/command-reference.md`
- Document `report.files[].merge_result` structure in `references/json-shapes.md` — covers text (conflict_count, conflict_regions), json (field-level conflicts), and changelog (has_conflicts, used_fallback) merge types
- Document that both `merge_parents` and `conflict_files` are cleared after successful publish in merge-workflows.md and command-reference.md
- Add merge state preservation note to merge-workflows.md — install, update, and refresh do not modify merge_parents or conflict_files
- Clarify DIVERGED error detection in SKILL.md Section 5 — CLI detects via API error message pattern match, not a structured error code

## [1.20.0] - 2026-03-28

### Added
- Add `config` command routing to Section 1 for "configure", "settings", "set default agents", "show config" intents
- Add `config` and `config agents` to Section 3 quick syntax table
- Add config result formatting guidelines to Section 4
- Add config command instructions to Section 9 (Multi-Agent Support) — `config agents` as the recommended way to set persistent defaults
- Add Config Commands section to `references/command-reference.md` — full syntax for config, config agents, config agents --list, config agents --reset
- Add config JSON response shapes to `references/json-shapes.md` — config view, agents get/set/reset/list
- Add config as recommended persistent method in `references/multi-agent.md` — replaces env var as primary recommendation, adds priority 3 in the resolution chain

## [1.19.0] - 2026-03-27

### Changed
- Move canonical skill location from `.claude/skills/` to `.agents/skills/` — physical files live in an agent-neutral directory, all agents (including Claude Code) receive symlinks
- Update `references/multi-agent.md` — rewritten for `.agents/skills/` canonical location, all agents equal, no primary/secondary distinction
- Update SKILL.md Section 9 — "primary agent directory" replaced with "canonical directory" (`.agents/skills/`)

### Fixed
- Add `type: "skill"` and `ai` canonical keyword slug to skill.json (fixes validation warnings)
- Remove bash language tag from code blocks in `references/multi-agent.md` (fixes executable code warning)

## [1.18.1] - 2026-03-27

### Fixed
- Add `type: "skill"` and `ai` canonical keyword slug to skill.json (fixes validation warnings from v1.18.0)
- Remove bash language tag from code blocks in `references/multi-agent.md` (fixes executable code warning)

## [1.18.0] - 2026-03-27

### Added
- Add Section 9 (Multi-Agent Support) — explains 8 supported agents, symlink-based installation, `--agents` flag, and `HAPPYSKILLS_AGENTS` env var
- Add `references/multi-agent.md` — comprehensive reference with agent table, physical file location clarity, `--agents` flag usage, fallback behavior, and examples
- Add `references/command-reference.md` — full command syntax extracted from SKILL.md for on-demand loading
- Add multi-agent routing entries to Section 1 for agent-related user intents
- Add `--agents` parameter extraction rule for agent targeting in natural language
- Add `linked_agents` field to install result presentation guidelines
- Add multi-agent trigger phrases to SKILL.md frontmatter description

### Changed
- Extract Section 3 (Command Reference) from SKILL.md to `references/command-reference.md` — replaced with compact quick-syntax table and link, reducing SKILL.md from 486 to 280 lines
- Update `references/json-shapes.md` with `linked_agents` field in install response

### Merged from remote (1.16.0–1.17.0)
- Add working directory constraint to Section 6 (from v1.16.1)
- Update authoring workflow step 4 with trigger phrase resilience reference (from v1.17.0)
- Take remote `references/skill-authoring.md` with expanded file structure, progressive disclosure, trigger phrase resilience, anti-patterns, and sources (from v1.16.0–1.17.0)

## [1.17.0] - 2026-03-15

### Added
- Add "Trigger Phrase Resilience" subsection to skill-authoring.md Section 5 (Writing Effective Descriptions) — guides authors to cover multiple phrasing families (past tense, questions, declarations, noun-phrase shorthand, progressive tense) in skill descriptions, with a table of phrasing families, concrete examples for auto-discovery lists and frontmatter descriptions, and a mental-test checklist
- Update SKILL.md authoring workflow step 4 to reference the new Trigger Phrase Resilience guide — reminds authors that users don't always phrase requests as imperative commands

## [1.16.1] - 2026-03-15

### Fixed
- Add working directory constraint to Section 6 — install, uninstall, update, list, check, refresh, and convert commands must run from the project root directory to avoid installing skills in the wrong location

## [1.16.0] - 2026-03-15

### Added
- Expand Section 1 (File Structure) with Agent Skills spec standard directories (`scripts/`, `references/`, `assets/`), purpose table, `templates/` vs `assets/` guidance, and 5-step decision framework for choosing standard vs custom directories — with source citations to agentskills.io spec and Anthropic skills repo
- Expand Section 7 (Supporting Files) into "Supporting Files & Progressive Disclosure" — adds 3-level progressive disclosure model, conditional file reference pattern, file reference depth rule, content type table with reasoning, and good vs bad examples of organizing complex skills with many supporting files — with source citations
- Add 3 new anti-patterns to Section 10 — files dumped at root, custom directories for standard-folder content, deeply nested reference chains
- Add 2 new best practices to Section 9 — organize supporting files by content type, use conditional file references
- Add Section 17 (Sources) — consolidated table of authoritative source URLs (agentskills.io spec, best practices, Claude Code docs, Anthropic skills repo)

## [1.15.0] - 2026-03-12

### Added
- Add `visibility` command routing, Section 3.8 (Visibility) with get/set usage examples, and result formatting guidelines
- Add visibility JSON response shapes to references/json-shapes.md (get, set, not found, forbidden)
- Add `visibility` to auth-required commands list in Section 2

## [1.14.1] - 2026-03-12

### Fixed
- Fix incorrect kit name example in happyskills-conventions.md — changed `"react-fullstack-kit"` to `"_kit-react-fullstack"` to match the enforced `_kit-` prefix convention

## [1.14.0] - 2026-03-12

### Added
- Add search concierge step to Kit Creation Workflow — optionally search the HappySkills cloud registry for additional skills to include in a kit alongside locally installed skills
- Add `_kit-` prefix convention to Kit Creation Workflow — kit name suggestions now start with `_kit-`, and the workflow notes the CLI auto-prepends the prefix

### Changed
- Renumber Kit Creation Workflow steps 2–9 to 3–10 to accommodate the new search concierge step
- Update Kit Creation Workflow description in SKILL.md to mention cloud registry search support
- Update version strategy step to handle cloud-selected skills (use version from search results as base for `^major.minor.0` ranges)

## [1.13.0] - 2026-03-12

### Added
- Add version strategy step to Kit Creation Workflow (step 5) — asks user to choose between pinned (`^major.minor.0`) and always-latest (`*`) dependency ranges with friendly explanations of both options

### Changed
- Renumber Kit Creation Workflow steps 5–8 to 6–9 to accommodate the new version strategy step

## [1.12.0] - 2026-03-12

### Added
- Add guided Kit Creation Workflow — LLM-assisted kit creation that lists installed skills, lets users select which to bundle, infers kit name and description, and iterates until approved before scaffolding
- Add Kit Creation Workflow subsection in Section 7 with cross-reference to skill-workflows.md
- Add full 8-step Kit Creation Workflow procedure in skill-workflows.md (list → select → inspect → infer → review → create → write SKILL.md → streamlined enrichment)

### Changed
- Route "init kit", "create a kit", "scaffold a kit" to Kit Creation Workflow (Section 7) instead of bare `init --kit`
- Condense kit scaffold docs in Section 3.3 to a single line with workflow cross-reference

## [1.11.0] - 2026-03-11

### Added
- Add kit routing intents: "init kit", "search kits", "install kit", "list kits", "publish kit"
- Add `init --kit` subsection under Authoring Commands (Section 3.3) documenting kit scaffolding
- Add `--type kit` search filter documentation under Discovery Commands (Section 3.1)
- Add `[kit]` badge to search and list formatting guidelines (Section 4)
- Add `type` field to init response shape and search/list JSON output in json-shapes.md
- Add kit specification to happyskills-conventions.md — `type` field, no-frontmatter SKILL.md, dependency-driven value

## [1.10.0] - 2026-03-11

### Added
- Add `delete` command routing and Section 3.6 (Registry Deletion) with usage, confirmation requirements, and JSON mode flags
- Add delete JSON response shapes to references/json-shapes.md (success, not found, forbidden, confirmation required)

### Changed
- Extract Section 8 (Happy Skills) content to references/happy-skills.md to free SKILL.md line budget

## [1.9.0] - 2026-03-10

### Added
- Add `validate` command routing, command reference (Section 3.5), and result formatting guidelines
- Add mandatory `validate --json` pre-publish gate in the publish workflow (Section 3.3, step 2)
- Add validate step to authoring workflow (step 9) replacing manual anti-pattern checks
- Add validate as mandatory quality gate in Post-Init Enrichment (step 11), Post-Convert Enrichment (step 10), and Post-Fork Enrichment (step 9)

### Changed
- Replace manual pre-release checklist in Skill Release Workflow (step 4) with deterministic `validate --json` check
- Trim verbose descriptions in Sections 3.1, 3.2, 3.4, and 4 to stay within 500-line SKILL.md limit

## [1.8.1] - 2026-03-10

### Changed
- Require all three platforms (`darwin`, `linux`, `win32`) in systemDependencies install commands across all enrichment workflows — if the install method is unknown or the tool is unsupported on a platform, use a descriptive message instead of omitting the key
- Update systemDependencies examples in happyskills-conventions.md to include `win32` install commands
- Document the three platform keys (`darwin`/`linux`/`win32`) with a reference table and "not supported" fallback pattern

## [1.8.0] - 2026-03-10

### Changed
- Align SKILL.md size limit with official agentskills.io and Claude Code spec — updated from 200 lines to 500 lines across skill-authoring.md (Section 1, Section 9, Section 10, Section 12), SKILL.md (Step 5, Step 9, Core Principles), and size guidelines table
- Clarify executable code rule — all executable code MUST go in `scripts/`, code in markdown is only for documentation, examples, and references to scripts. Previous wording was ambiguous about when embedded code was acceptable
- Refine Post-Init Enrichment embedded code check (step 10) — now extracts executable code to `scripts/` and replaces with `${CLAUDE_SKILL_DIR}/scripts/` references instead of just recommending
- Tighten anti-pattern wording in skill-authoring.md — "Executable code embedded in markdown instead of scripts/" with clear fix guidance

## [1.7.0] - 2026-03-10

### Added
- Add executable code decision point to authoring workflow Step 5 — asks whether the skill needs to execute code and directs authors to use `scripts/` instead of embedding code snippets in markdown
- Add "embedded executable code in markdown" to anti-patterns table in skill-authoring.md with fix guidance
- Add `${CLAUDE_SKILL_DIR}` documentation to skill-authoring.md Section 1 (File Structure) with usage examples for referencing bundled scripts
- Add "Use scripts/ for executable code" principle to Core Principles table in SKILL.md
- Add embedded code check step (step 10) to Post-Init Enrichment workflow — scans SKILL.md and references/ for executable code blocks and recommends extraction to scripts/

### Changed
- Update authoring workflow Step 9 (anti-pattern check) to include "no executable code embedded as snippets in markdown" as a key check
- Enhance scripts/ guidance in skill-authoring.md Section 7 (Supporting Files) to reference `${CLAUDE_SKILL_DIR}/scripts/` and support Python files

## [1.6.1] - 2026-03-10

### Added
- Add LICENSE file generation after license selection in all 3 enrichment workflows — writes the standard license text with copyright holder name (reused from authors step) and current year into a `LICENSE` file in the skill directory

## [1.6.0] - 2026-03-10

### Added
- Add prescriptive two-tier license selection to Post-Init, Post-Convert, and Post-Fork enrichment workflows — tier 1 offers MIT, BSD-3-Clause, Apache-2.0, and "Show me more"; tier 2 displays a full reference table of 12 SPDX licenses across permissive, copyleft, public domain, and proprietary categories, then offers UNLICENSED, GPL-3.0-only, MPL-2.0, and CC0-1.0
- Add git remote auto-detection for the `repository` field — runs `git remote get-url origin` and suggests the detected URL, with fallback to manual entry or skip

### Changed
- Replace vague "Prompt for optional fields" step with explicit sub-steps (a. authors, b. license, c. repository) that must each be asked individually — prevents the LLM from skipping `repository`

## [1.5.0] - 2026-03-10

### Added
- Add mandatory SKILL.md frontmatter validation step (name + description) to Post-Init, Post-Convert, and Post-Fork enrichment workflows — marked as NON-NEGOTIABLE to prevent skills from shipping without the description that drives auto-invocation
- Add "No frontmatter or missing description" as first entry in Common Debugging table in skill-authoring reference

### Changed
- Strengthen authoring workflow steps 4 and 6 with MANDATORY language — frontmatter block with `name` and `description` is now explicitly required, SKILL.md without frontmatter is never acceptable
- Mark `name` and `description` as **Required** in frontmatter field reference table
- Strengthen pre-release validation to check frontmatter name, description, placeholder detection, and forbidden character scanning before allowing bump/publish

## [1.4.0] - 2026-03-08

### Added
- Add `refresh` command routing, trigger phrases, and JSON shape documentation for the new check-and-update-all-in-one-shot CLI command
- Add invocation model confirmation step to Post-Init, Post-Convert, and Post-Fork enrichment workflows — always asks the user via AskUserQuestion before setting `disable-model-invocation: true`

### Changed
- Change `disable-model-invocation: true` to never be set by default — all skill creation, conversion, and fork workflows now require explicit user confirmation with a clear explanation of the consequences before adding this flag

## [1.3.2] - 2026-03-08

### Fixed
- Fix first-publish detection in publish pre-flight — replace unreliable `commit: null` lock file check with `npx happyskills check` registry query, which correctly handles locally developed skills that were already published

## [1.3.1] - 2026-03-08

### Fixed
- Enforce mandatory workspace resolution before every publish command — run `whoami` to get workspaces, check `skills-lock.json` for matching `<slug>/<skill-name>` entry, ask user only when ambiguous. NEVER run publish without `--workspace`
- Fix wrong lock file path references — corrected from `.claude-lock.json` to `skills-lock.json` (project root) across SKILL.md, skill-workflows.md, and happyskills-conventions.md
- Fix stale `happyskillsai/happyskills-cli` references — renamed to `happyskillsai/happyskills` in SKILL.md, json-shapes.md, and docs

## [1.3.0] - 2026-03-08

### Added
- Post-Init Enrichment workflow — authoring workflow (Section 7) now flows directly into HappySkills ecosystem metadata enrichment (description, keywords, dependencies, CHANGELOG) with optional publish, eliminating the need to manually `convert` after `init`

### Fixed
- Fix false dependency warning during publish — replaced broken `resolve_dependencies` call (which checked the unpublished skill itself) with per-dependency `get_repo` existence checks that run in parallel and name specific missing dependencies
- Enforce private-first visibility on first-time publish — AskUserQuestion now prescriptively lists "Private (Recommended)" as the first option in all publish and enrichment workflows

### Changed
- Authoring workflow step 8 now only verifies skill.json `name` and `version` — description, keywords, and dependencies are deferred to Post-Init Enrichment for a cleaner separation between SKILL.md design and ecosystem metadata

## [1.2.1] - 2026-03-07

### Fixed
- Stop re-prompting about visibility (public/private) when publishing a skill update — visibility is now only asked on the first publish and preserved automatically on subsequent publishes

## [1.2.0] - 2026-03-06

### Added
- Add Section 8 (Happy Skills) with status check workflow, conversion workflow, and tone guidelines — natural language support for "are my skills happy?", "make my skills happy", and related intents
- Add publish pre-flight checklist: managed check, CHANGELOG/skill.json read, change review, release workflow integration, and visibility confirmation before running `npx happyskills publish`

### Changed
- Change authentication flow from two-step (`login --json` + `login --browser`) to single command (`login --json --browser`) that handles both already-logged-in and fresh login cases

## [1.1.0] - 2026-03-06

### Changed
- Publish workflows (post-convert enrichment, release workflow, bare publish) now ask whether the skill should be public or private before running — skills are private by default
- Publishing Checklist in `happyskills-conventions.md` documents the `--public` opt-in flag and the private-by-default behavior

### Added
- `--public` flag example in the publish command reference

## [1.0.0] - 2026-03-06

### Added
- Natural language interface to all 16 `npx happyskills` CLI commands: `init`, `install`, `uninstall`, `list`, `search`, `check`, `update`, `bump`, `publish`, `convert`, `fork`, `login`, `logout`, `whoami`, `setup`, `self-update`
- Scoped search support: `--mine`, `--personal`, `--workspace <slug>`, `--tags` filters with browse mode (query optional when scope is provided)
- JSON output parsing for all commands with human-friendly result formatting (tables, summaries, counts)
- Browser-based device login flow with 6-minute timeout; password fallback for headless environments
- Automatic auth pre-flight check before auth-required commands (`publish`, `convert`, `fork`, `whoami`); auto-retry on `AUTH_REQUIRED` error
- Confirmation prompts via `AskUserQuestion` before destructive operations (`uninstall`, `publish`)
- Structured error handling by error code (`INTERACTIVE_REQUIRED`, `AUTH_REQUIRED`, `USAGE_ERROR`, `NETWORK_ERROR`, `API_ERROR`)
- Skill authoring expertise: 9-step workflow for designing Claude Code skills following the Claude Code spec (SKILL.md) and HappySkills conventions (skill.json, keywords, dependencies)
- Post-convert enrichment workflow: enriches `skill.json` metadata after `happyskills convert` succeeds
- Post-fork enrichment workflow: fills metadata for forked skills after `happyskills fork` succeeds
- Skill release workflow: analyzes changes, infers semver bump, updates changelog, validates, and publishes in one end-to-end pipeline
- Reference docs loaded on demand: `references/skill-authoring.md`, `references/happyskills-conventions.md`, `references/skill-workflows.md`, `references/json-shapes.md`
