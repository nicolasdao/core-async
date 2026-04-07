# Changelog

## [1.2.0] - 2026-04-02

### Added
- 5-phase workflow (Diagnostic, Change Analysis, Plan, Execute, Validate) replacing flat 6-section structure for more robust orchestration
- Sub-agent diagnostic phase — spawns an Explore agent to audit all doc files against init-doc standards without consuming master context window
- Deterministic compliance layer — TOC, cross-links, size guardrails, and gotchas.md existence are fixed unconditionally, separate from LLM judgment calls
- Size guardrails aligned with init-doc (README.md at 750 lines, docs/ files at 750 lines) with split-before-writing rule
- TOC enforcement — adds linked markdown TOC (with anchor links) if missing, converts plain-text TOC to linked format, regenerates stale TOCs
- docs/gotchas.md awareness — diagnostic checks for existence, creates if missing, populates with non-obvious behavior discovered during updates
- Documentation Standards Reference table — codifies writing quality standards (audience, examples, terminology, single-concern) aligned with init-doc
- Diagnostic checklist reference file (references/diagnostic-checklist.md) for structured sub-agent audits

### Changed
- File creation threshold now uses size guardrails instead of arbitrary 50-line heuristic — files over 750 lines must split, files approaching the limit split before writing
- Cross-link checking expanded from new-files-only to all documentation files via diagnostic audit
- Structural splits now happen before content writes to prevent post-hoc reorganization

## [1.1.0] - 2026-04-02

### Added
- Add optional argument support — pass notes to steer what gets documented and how (e.g., `/update-doc focus on the new CLI workspace commands`)
- Add diff analysis step — runs `git diff` before discovery to build a concrete picture of what changed instead of relying on conversation memory
- Add new doc file creation rule — creates a new `docs/<topic>.md` when changes introduce an entirely new subsystem or component
- Add completeness check — verifies README doc index covers all files, numeric claims are accurate, and new docs are cross-referenced

### Changed
- Broaden filtering criteria from "content overlaps" to "could be affected by" — catches stale counts, summaries, and references to changed files
- Shorten skill.json description to under 200 chars (registry best practice)

### Fixed
- Remove forbidden asterisk character from SKILL.md frontmatter description
- Add missing `type` field to skill.json

## [1.0.4] - 2026-03-03

### Fixed
- Re-published to fix a platform bug where `keywords` in `skill.json` were not being synced to the HappySkills registry on push

## [1.0.3] - 2026-03-02

### Added
- Added `keywords` to `skill.json`: `devops`, `documentation`, `docs`

## [1.0.2] - 2026-03-02

### Fixed
- Re-published to include CHANGELOG.md in the package

## [1.0.1] - 2026-03-02

### Fixed
- Replaced hardcoded absolute paths with dynamic project root resolution via `git rev-parse --show-toplevel`
- Skill now works on any machine (macOS, Linux, Windows) regardless of user or directory structure
- Added `Bash` to allowed tools to support the git command
- Protected files section no longer references user-specific paths
