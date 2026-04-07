# Changelog

## [0.3.0] - 2026-04-05

### Added
- README Documentation section must describe docs/mission.md with two decision-making levels: proactive (interpret requests through mission lens before implementation) and reactive (choose between multiple valid solutions using the mission instead of asking the user)

## [0.2.1] - 2026-04-02

### Added
- Optional init-mission integration: after reconnaissance, offers to create a mission document (docs/mission.md) for business context
- Added docs/mission.md to the Topic Catalog
- Declared dependency on nicolasdao/init-mission

### Changed
- Phase 1 reconnaissance now uses shared reconnaissance.md from init-mission (single source of truth)

## [0.2.0] - 2026-04-02

### Added
- Size guardrails for documentation files (README.md at 750 lines, docs/ files at 750 lines) with rationale anchored in LLM progressive loading and single-concern coherence
- TOC format specification requiring linked markdown list with anchor links for LLM and human navigation
- Phase 3 size estimation step to proactively split oversized files during planning, before writing
- Phase 5 file size validation step to catch guardrail violations after writing
- Monorepo README guidance in Phase 4 with per-sub-project orientation in Project Structure section
- Concrete examples constraint (use actual codebase examples, not generic placeholders or hypothetical snippets)

## [0.1.1] - 2026-03-12

### Fixed
- Trimmed skill.json description to under 200 chars
- Added `devops` canonical keyword for registry discoverability

## [0.1.0] - 2026-03-12

### Added
- Initial release of init-doc skill
- 5-phase process: Reconnaissance, Deep Analysis, Documentation Plan, Writing, Validation
- Language/stack-agnostic project analysis with universal package manifest detection
- Topic catalog for docs/ files (architecture, database, api, cli, deployment, configuration, testing, infrastructure, gotchas)
- Mandatory user approval gate before writing any files (Phase 3)
- Cross-linking strategy compatible with init-context traversal and update-doc maintenance
- Protected files list (CLAUDE.md, MEMORY.md, specs/, docs/manual/, .claude/)
