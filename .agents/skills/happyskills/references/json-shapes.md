# HappySkills CLI — JSON Response Shapes

All responses from `npx happyskills <command> --json`.

## Envelopes

**Success**: `{ "data": { ... } }`
**Error**: `{ "error": { "code": "...", "message": "...", "exit_code": N } }`

Error codes: `ERROR` (1), `USAGE_ERROR` (2), `AUTH_REQUIRED` (3), `NETWORK_ERROR` (4), `INTERACTIVE_REQUIRED` (1), `API_ERROR` (1).

---

## login

```json
{ "data": { "status": "already_logged_in", "username": "...", "email": "..." } }
```

Or if not logged in:

```json
{ "error": { "code": "INTERACTIVE_REQUIRED", "message": "Login requires browser interaction...", "exit_code": 1 } }
```

## logout

```json
{ "data": { "status": "logged_out" } }
```

## whoami

```json
{ "data": { "username": "...", "email": "...", "workspaces": [{ "slug": "...", "type": "personal|org" }] } }
```

## search

```json
{ "data": { "query": "...", "scope": "all", "results": [{ "skill": "owner/name", "description": "...", "version": "...", "visibility": "public", "type": "skill" }], "count": 3 } }
```

- `query`: search term or `null` in browse mode
- `scope`: `public`, `mine`, `personal`, or `all`
- `visibility`: `public`, `workspace`, or `private`
- `version`: extracted from `latest_version` (API derives from `default_ref`)
- `type`: `"skill"` or `"kit"`. Filter with `--type kit` to show only kits.

## list

```json
{
  "data": {
    "skills": {
      "owner/name": { "version": "1.0.0", "source": "direct|dep", "status": "installed|missing", "type": "skill|kit", "enabled": true }
    },
    "external": [{ "name": "skill-name", "description": "..." }]
  }
}
```

`source`: "direct" = explicitly installed, "dep" = transitive dependency.
`type`: `"skill"` or `"kit"`. Kits are shown with a `[kit]` badge in the list output.
`enabled`: `true` if the skill has symlinks in agent folders, `false` if disabled. Only applies to managed skills.
`external`: skills found on disk but not in lock file.

## install (with skill argument)

```json
{ "data": { "skill": "owner/name", "version": "1.0.0", "installed": [...], "skipped": [...], "warnings": [...], "forced": [...], "linked_agents": ["cursor", "windsurf"] } }
```

`linked_agents`: array of agent IDs that received symlinks. Empty or absent if no secondary agents were detected. Agent IDs: `claude`, `cursor`, `windsurf`, `codex`, `copilot`, `aider`, `cline`, `roo`.

## install (no argument — from manifest/lock)

```json
{ "data": { "installed": [...], "skipped": [...] } }
```

## uninstall

```json
{ "data": { "skill": "owner/name", "removed": [...], "orphans_pruned": [...] } }
```

## enable

```json
{ "data": { "results": [{ "skill": "owner/name", "status": "enabled|already_enabled|not_found|missing|error" }] } }
```

`status` values:
- `enabled`: symlinks successfully created
- `already_enabled`: skill was already enabled (warning, not an error)
- `not_found`: skill is not in the lock file (not a HappySkills-managed skill)
- `missing`: skill files not found on disk
- `error`: linking failed

## disable

```json
{ "data": { "results": [{ "skill": "owner/name", "status": "disabled|already_disabled|not_found|error" }] } }
```

`status` values:
- `disabled`: symlinks successfully removed
- `already_disabled`: skill was already disabled (warning, not an error)
- `not_found`: skill is not in the lock file (not a HappySkills-managed skill)
- `error`: unlinking failed

## check

```json
{
  "data": {
    "results": [{ "skill": "owner/name", "installed": "1.0.0", "latest": "1.1.0", "status": "up-to-date|outdated|unknown|error" }],
    "outdated_count": 2,
    "up_to_date_count": 3
  }
}
```

## status

```json
{
  "data": {
    "results": [
      {
        "skill": "owner/name",
        "base_version": "1.0.0",
        "base_commit": "abc123",
        "local_modified": true,
        "remote_updated": true,
        "remote_version": "1.1.0",
        "remote_commit": "def456",
        "conflict_files": [],
        "status": "clean|modified|outdated|diverged|conflicts|not_found"
      }
    ]
  }
}
```

- `local_modified`: true if local files differ from base integrity hash
- `remote_updated`: true if remote head commit differs from base_commit
- `conflict_files`: array of file paths with unresolved conflict markers (from a prior pull)
- `status`: derived from local_modified + remote_updated + conflict_files

## pull

**Up to date (no remote changes):**

```json
{ "data": { "status": "up_to_date", "skill": "owner/name" } }
```

**Fast-forward (no local changes, remote advanced):**

```json
{ "data": { "status": "fast_forward", "skill": "owner/name", "version": "1.1.0" } }
```

**Merged or conflicts (both sides changed):**

```json
{
  "data": {
    "status": "merged|conflicts",
    "report": {
      "files": [{ "path": "SKILL.md", "classification": "both_modified", "conflict_written": false, "merge_result": {} }],
      "summary": { "auto_merged": 2, "conflicts": 0 }
    },
    "conflict_files": ["SKILL.md"],
    "json_conflicts": [{ "field": "description", "suggestion": "..." }],
    "resolution_steps": []
  }
}
```

- `status`: `merged` = all files auto-merged cleanly, `conflicts` = some files have conflict markers
- `report.files[].classification`: file change type (e.g., `both_modified`, `remote_only_modified`, `local_only_added`)
- `report.files[].conflict_written`: boolean — true if conflict markers were written to this file
- `report.files[].merge_result`: object with merge details. Shape depends on file type:
  - Text files: `{ type: "text", conflict_count: N, conflict_regions: [...] }`
  - skill.json: `{ type: "json", conflicts: [...] }` (field-level suggestions)
  - CHANGELOG.md: `{ type: "changelog", has_conflicts: bool, used_fallback: bool }`
- `conflict_files`: array of file paths that have unresolved conflict markers (empty if status is `merged`)
- `json_conflicts`: array of skill.json field-level merge suggestions (review, not errors)
- `resolution_steps`: only present with `--full-report`. Array of action-typed steps: `resolve_conflict_markers`, `review_json_suggestions`, `semantic_review`, `verify`

**Full report mode** (`--json --full-report`): Each file entry in `report.files` is enriched with `base_content`, `local_content`, `remote_content`, `merged_content` (inline text) so the LLM can reason about the merge without extra file reads.

## diff

```json
{
  "data": {
    "mode": "local|remote|full",
    "report": {
      "files": [{ "path": "SKILL.md", "classification": "both_modified|local_modified|remote_modified|local_added|remote_added|local_deleted|remote_deleted" }],
      "summary": {}
    }
  }
}
```

- `mode`: `local` (default, local vs base), `remote` (base vs remote), `full` (three-way)
- `report.files`: array of file entries with path and classification

## update

```json
{
  "data": {
    "updated": [{ "skill": "owner/name", "from": "1.0.0", "to": "1.1.0" }],
    "already_up_to_date": [{ "skill": "owner/name", "version": "1.0.0" }],
    "count": 1
  }
}
```

## init

```json
{ "data": { "name": "skill-name", "type": "skill", "files_created": ["skill.json", "SKILL.md"], "directory": "/absolute/path" } }
```

`type`: `"skill"` (default) or `"kit"` (when `--kit` flag is used).

## bump

```json
{ "data": { "skill": "skill-name", "old_version": "1.0.0", "new_version": "1.1.0", "bump_type": "patch|minor|major|explicit" } }
```

## publish

```json
{ "data": { "skill": "owner/name", "version": "1.0.0", "ref": "refs/tags/v1.0.0", "bumped_from": "0.9.0"|null } }
```

## convert

```json
{ "data": { "skill": "owner/name", "version": "1.0.0", "workspace": "workspace-slug", "description": "..." } }
```

## fork

```json
{ "data": { "skill": "owner/name", "forked_version": "1.2.0", "new_version": "0.1.0", "workspace": "workspace-slug", "directory": "/absolute/path" } }
```

## setup

Installs `happyskillsai/happyskills` globally (`~/.claude/skills/`). Always installs the latest version.

```json
{ "data": { "skill": "happyskillsai/happyskills", "version": "1.2.0", "status": "installed" } }
```

Or if already current:

```json
{ "data": { "skill": "happyskillsai/happyskills", "version": "1.2.0", "status": "already_up_to_date" } }
```

`status`: "installed" = skill was freshly installed or upgraded, "already_up_to_date" = no change needed.

## self-update

Upgrades the `happyskills` CLI npm package itself to the latest version.

```json
{ "data": { "status": "already_up_to_date", "version": "0.2.0" } }
```

Or if an upgrade was applied:

```json
{ "data": { "status": "updated", "from": "0.2.0", "to": "0.3.0" } }
```

`status`: "already_up_to_date" = CLI is current, "updated" = CLI was upgraded. In non-json mode, npm install output streams directly to the terminal.

## delete

```json
{ "data": { "deleted": true, "skill": "owner/name" } }
```

Error — not found:

```json
{ "error": { "code": "NOT_FOUND", "message": "...", "exit_code": 1 } }
```

Error — forbidden:

```json
{ "error": { "code": "FORBIDDEN", "message": "...", "exit_code": 1 } }
```

Error — confirmation required (JSON mode without -y):

```json
{ "error": { "code": "CONFIRMATION_REQUIRED", "message": "...", "exit_code": 1 } }
```

## visibility

**Get current visibility:**

```json
{ "data": { "skill": "owner/name", "visibility": "public" } }
```

**Set visibility:**

```json
{ "data": { "skill": "owner/name", "visibility": "private" } }
```

**Error — not found:**

```json
{ "error": { "code": "NOT_FOUND", "message": "...", "exit_code": 1 } }
```

**Error — forbidden:**

```json
{ "error": { "code": "FORBIDDEN", "message": "...", "exit_code": 1 } }
```

## refresh

```json
{ "data": { "results": [{ "skill": "owner/name", "installed": "1.0.0", "latest": "1.1.0", "status": "outdated" }], "outdated_count": 1, "up_to_date_count": 2, "updated": [{ "skill": "owner/name", "from": "1.0.0", "to": "1.1.0" }], "already_up_to_date": [{ "skill": "owner/name2", "version": "2.0.0" }], "errors": [] } }
```

Combines `check` and `update --all`. `results` is the full check table. `updated` lists skills that were upgraded. `errors` lists skills that could not be checked or updated.

## config (no arguments)

```json
{ "data": { "config": { "agents": "claude,cursor" }, "path": "~/.config/happyskills/config.json" } }
```

`config`: all key-value pairs. `path`: location of the config file.

## config agents

**Get:**

```json
{ "data": { "key": "agents", "value": "claude,cursor", "source": "config" } }
```

`source`: `"config"` if set, `"auto-detect"` if not.

**Set:**

```json
{ "data": { "key": "agents", "value": "claude,cursor", "agents": ["claude", "cursor"] } }
```

**Reset:**

```json
{ "data": { "key": "agents", "status": "reset", "source": "auto-detect" } }
```

## config agents --list

```json
{ "data": { "agents": [{ "id": "claude", "display_name": "Claude Code", "skills_dir": ".claude/skills", "detected": true, "default": true }], "source": "config" } }
```

`detected`: agent's config folder exists on the system. `default`: agent is in the configured default list (or detected, if no config set). `source`: `"config"` or `"auto-detect"`.

## people list

```json
{ "data": [{ "username": "alice", "email": "alice@company.com", "name": "Alice Smith", "role": "admin", "created_at": "2026-01-15T..." }] }
```

## people add

```json
{ "data": { "username": "alice", "role": "member", "workspace": "acme" } }
```

## people remove

```json
{ "data": { "username": "alice", "workspace": "acme" } }
```

## people role

```json
{ "data": { "username": "alice", "role": "admin", "workspace": "acme" } }
```

## people search

```json
{ "data": [{ "username": "alice", "email": "alice@company.com", "name": "Alice Smith" }] }
```

## groups list

```json
{ "data": [{ "name": "engineering", "description": "Core team", "member_count": 5, "is_default": true }] }
```

## groups create

```json
{ "data": { "name": "engineering", "description": "Core team", "is_default": false } }
```

## groups delete

```json
{ "data": { "name": "engineering" } }
```

## groups show

```json
{ "data": { "name": "engineering", "description": "Core team", "is_default": true, "members": [{ "username": "alice", "email": "alice@company.com" }] } }
```

## groups add (member to group)

```json
{ "data": { "username": "alice", "group": "engineering" } }
```

## groups remove (member from group)

```json
{ "data": { "username": "alice", "group": "engineering" } }
```

## groups default

```json
{ "data": { "name": "engineering", "is_default": true } }
```

## access list (group mode)

```json
{ "data": [{ "skill": "acme/deploy-aws", "owner": "acme", "name": "deploy-aws", "permission": "read", "is_direct": true }] }
```

`is_direct`: true if the grant is directly on this skill, false if inherited via dependency.

## access list (skill mode)

```json
{ "data": [{ "group_name": "engineering", "id": "uuid", "group_id": "uuid", "permission": "read", "is_direct": true }] }
```

## access grant

**Normal success:**

```json
{ "data": { "group_name": "engineering", "permission": "read", "dependency_grants": [{ "owner": "acme", "name": "utils" }] } }
```

**Requires confirmation (private dependencies detected):**

```json
{ "data": { "requires_confirmation": true, "dependencies": [{ "owner": "acme", "name": "private-lib" }] } }
```

When this is returned, re-run with `--confirm` to proceed.

## access revoke

```json
{ "data": { "group_name": "engineering", "dependencies_revoked": 2 } }
```

`dependencies_revoked`: number of cascaded dependency grants also removed (0 if `--keep-deps` was used).

## access set

```json
{ "data": { "group_name": "engineering", "permission": "write" } }
```
