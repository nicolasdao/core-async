# HappySkills CLI — Command Reference

Exact syntax and usage for every `happyskills` command. Use `--json` on every command (see Constraints in SKILL.md).

---

## Discovery Commands

**Search the registry:**

```bash
npx happyskills search "<query>" --json
npx happyskills search --mine --json                          # browse all your skills
npx happyskills search --personal --json                      # personal workspace only
npx happyskills search "<query>" --workspace acme --json      # specific workspace
npx happyskills search --mine --tags deployment --json        # combined filters
```

Query is optional with `--mine`/`--personal`/`--workspace` (browse mode). Present as table: Skill | Description | Version. Show scope in summary.

**Search for kits only:** Add `--type kit` to any search command (e.g., `npx happyskills search "<query>" --type kit --json`). Combinable with all other flags.

**List installed skills:**

```bash
npx happyskills list --json
# or globally:
npx happyskills list -g --json
```

Present managed skills (from lock file) and external skills (on disk only). Show version, source, status, and enabled/disabled state. The `enabled` field is `true` if the skill has symlinks in agent folders, `false` if it was disabled (symlinks removed).

**Check for updates:**

```bash
npx happyskills check --json
# or check a specific skill:
npx happyskills check owner/name --json
```

Table: Skill | Installed | Latest | Status. Highlight outdated. Show summary counts.

**Refresh skills (check + update in one step):**

```bash
npx happyskills refresh -y --json
# or globally:
npx happyskills refresh -g -y --json
```

Combines `check` and `update --all`. Present results table: checked, outdated, updated.

---

## Installation Commands

**Install a skill:**

```bash
npx happyskills install owner/name -y --json
npx happyskills install owner/name@1.2.0 -y --json            # specific version
npx happyskills install owner/name@latest -y --json            # absolute latest
npx happyskills install owner/name -g -y --json                # globally
npx happyskills install owner/name --force -y --json           # ignore conflicts
npx happyskills install owner/name --fresh -y --json           # ignore lock file
npx happyskills install owner/name --agents claude,cursor -y --json  # target specific agents
```

**Install all dependencies from skill.json or lock file:**

```bash
npx happyskills install -y --json
```

**Uninstall a skill (confirm with AskUserQuestion first):**

```bash
npx happyskills uninstall owner/name -y --json
# or globally:
npx happyskills uninstall owner/name -g -y --json
```

Show what was removed and any orphaned dependencies that were pruned.

**Update skills:**

```bash
# Update a specific skill
npx happyskills update owner/name -y --json

# Update all installed skills
npx happyskills update --all -y --json

# Update globally
npx happyskills update --all -g -y --json
```

Show what was updated (from -> to versions) and what was already up to date.

---

## Enable / Disable Commands

**Disable skills (remove agent symlinks without uninstalling):**

```bash
npx happyskills disable owner/name --json
npx happyskills disable deploy-aws --json                          # short name
npx happyskills disable owner/skill-a owner/skill-b --json         # multiple skills
npx happyskills disable deploy-aws monitoring --json                # multiple short names
npx happyskills disable owner/name -g --json                       # global skills
npx happyskills disable owner/name --agents claude,cursor --json   # target specific agents
```

Disabling a skill removes its symlinks from all agent folders (`.claude/skills/`, `.cursor/skills/`, etc.) but keeps the physical files in `.agents/skills/` and the lock file entry intact. Disabled skills are invisible to agents but can be re-enabled instantly.

**Behavior notes:**
- Disabling an already-disabled skill prints a warning but does not fail (exit 0).
- Disabling a non-HappySkills skill (not in lock file) prints a warning and skips it.
- Disabled skills stay disabled when updated via `install`, `update`, or `refresh` — the CLI remembers the disabled state and does not re-create symlinks.
- Aliases: `off`

**Enable previously disabled skills (restore agent symlinks):**

```bash
npx happyskills enable owner/name --json
npx happyskills enable deploy-aws --json                           # short name
npx happyskills enable owner/skill-a owner/skill-b --json          # multiple skills
npx happyskills enable deploy-aws monitoring --json                 # multiple short names
npx happyskills enable owner/name -g --json                        # global skills
npx happyskills enable owner/name --agents claude,cursor --json    # target specific agents
```

Enabling a skill re-creates symlinks in all detected (or specified) agent folders, pointing back to the canonical copy in `.agents/skills/`.

**Behavior notes:**
- Enabling an already-enabled skill prints a warning but does not fail (exit 0).
- Enabling a skill whose files are missing on disk prints a warning and suggests `happyskills install`.
- Aliases: `on`

---

## Merge & Sync Commands

**Check skill status (divergence state):**

```
npx happyskills status --json
npx happyskills status owner/name --json
npx happyskills status -g --json
```

Status values: `clean` (no changes), `modified` (local only), `outdated` (remote only), `diverged` (both changed), `conflicts` (unresolved merge markers), `not_found`.

Present as table: Skill | Status | Local Modified | Remote Updated. Show conflict files if status is `conflicts`.

**Pull remote changes and merge:**

```
npx happyskills pull owner/name --json
npx happyskills pull owner/name --theirs --json
npx happyskills pull owner/name --ours --json
npx happyskills pull owner/name --theirs SKILL.md,skill.json --ours references/foo.md --json
npx happyskills pull owner/name --force --json
npx happyskills pull owner/name -g --json
npx happyskills pull owner/name --json --full-report
npx happyskills pull owner/name --strict --json
```

**Flags:**

| Flag | Description |
|---|---|
| `--theirs [files]` | Take remote version on conflicts. No value = all files. Comma-separated list = only those files. |
| `--ours [files]` | Keep local version on conflicts. Same syntax as `--theirs`. |
| `--force` | Discard ALL local changes, fast-forward to remote |
| `-g`, `--global` | Pull globally installed skill |
| `--strict` | Fail on incompatible dependency ranges instead of warning |
| `--full-report` | Include inline file content and resolution steps in JSON output (requires `--json`). Designed for AI agent semantic review. |

**Pull outcomes:**
- **Up to date** → no changes needed
- **Fast-forward** → no local changes, replaced with remote version
- **Merged** → both sides changed, auto-merged cleanly. Lock stores `merge_parents` for merge commit on next publish.
- **Conflicts** → auto-merge failed for some files. Conflict markers written (`<<<<<<< LOCAL` / `=======` / `>>>>>>> REMOTE`). Lock stores `conflict_files`. No `merge_parents` (rebase semantics on publish).

After pull, present: status (fast_forward/merged/conflicts), files changed, conflict files if any. If conflicts, show which files and suggest resolution options.

**Show differences (diff):**

```
npx happyskills diff owner/name --json
npx happyskills diff owner/name --remote --json
npx happyskills diff owner/name --full --json
npx happyskills diff owner/name -g --json
```

**Modes:**

| Flag | Mode | Shows |
|---|---|---|
| (default) | local | What you changed since install (local vs base) |
| `--remote` | remote | What changed on the registry (base vs remote) |
| `--full` | full | Three-way comparison (local + remote vs base) |

File classifications: `M (local)` modified locally, `M (remote)` modified on remote, `M (both)` modified on both sides, `A (local/remote)` added, `D (local/remote)` deleted.

---

## Authoring Commands

**Scaffold a new skill:**

```bash
npx happyskills init my-skill --json
# or use current directory name:
npx happyskills init --json
```

Show the created files and directory path.

**Scaffold a new kit:** `npx happyskills init my-kit --kit --json` — Creates a kit skeleton (`"type": "kit"` in skill.json, plain markdown SKILL.md). For the guided kit creation experience, see Kit Creation Workflow (Section 7 in SKILL.md).

**Bump version:**

```bash
npx happyskills bump patch my-skill --json                     # patch/minor/major
npx happyskills bump 2.0.0 my-skill --json                    # explicit version
```

Show old version -> new version.

**Publish a skill (requires auth):**

Before running `npx happyskills publish`, run these pre-flight checks in order:

1. **Check if the skill is managed** — Run `npx happyskills list --json` and check whether the skill appears in `data.skills` (managed) or `data.external` (external). If external, tell the user the skill needs to be converted to a HappySkill first, and offer to run the conversion workflow. Do not attempt to publish an unconverted skill.
2. **Check divergence state (MANDATORY)** — Run `npx happyskills status <workspace>/<skill-name> --json`. Check the `status` field:
   - `clean` or `modified` → safe to proceed.
   - `outdated` → remote has advanced. Run `npx happyskills pull <skill> --json` first (fast-forward), then proceed.
   - `diverged` → both local and remote changed. Run `npx happyskills pull <skill> --json` to merge. If conflicts remain, guide the user through resolution (see Section 10 in SKILL.md). Then proceed.
   - `conflicts` → unresolved conflict markers from a prior pull. Show the `conflict_files` from the status response. Guide the user to resolve them (edit files to remove `<<<<<<< LOCAL` / `=======` / `>>>>>>> REMOTE` markers, or re-run `pull` with `--theirs`/`--ours`). Do NOT proceed until conflicts are resolved.
3. **Run validation (MANDATORY)** — Run `npx happyskills validate <skill-name> --json`. If `data.valid` is `false`, present the errors and fix them before proceeding — if an error includes a `recommendations` array, follow those steps in order and exactly as written; otherwise, for description `max_length` errors, apply the fallback procedure from Section 5 of the SKILL.md. Do NOT publish a skill that fails validation. Warnings are advisory — present them but do not block. **If you had to fix validation errors** (modified any skill files), note this — those fixes are new changes that must be versioned and documented before publishing. See step 7.
4. **Resolve the target workspace (MANDATORY)** — Run `npx happyskills whoami --json` and extract the list of workspaces from `data.workspaces`. Then determine which workspace to publish to:
   - If exactly **one** workspace -> use it.
   - If **multiple** workspaces -> read the project's lock file (`skills-lock.json` in the project root directory) and look for an entry whose key matches `<workspace-slug>/<skill-name>` for the skill being published. If exactly **one** workspace matches -> use it. If **zero** match (first publish) or **multiple** match -> ask the user via AskUserQuestion which workspace to publish to.
   Store the resolved workspace slug. You **MUST** pass `--workspace <slug>` in every publish command. NEVER run publish without `--workspace`.
5. **Read `CHANGELOG.md` and `skill.json`** in the skill's directory.
6. **Review the conversation context and recent changes** — have there been modifications to the skill since the last CHANGELOG entry?
7. **If the version has already been bumped and the CHANGELOG already covers the current changes AND no validation fixes were applied in step 3** -> proceed directly to publish (step 9). **If validation fixes were applied in step 3** (you modified skill files to pass validation), those fixes are new unbumped changes — this shortcut does NOT apply, proceed to step 8.
8. **If changes exist that are not yet reflected in the version or CHANGELOG** (including validation fixes from step 3) -> run the Skill Release Workflow (Section 7 in SKILL.md) first. This handles bump, CHANGELOG, and then publishes.
9. **Confirm with AskUserQuestion** before publishing. Show the skill name, version, and target workspace. To detect whether this is a **first publish**, run `npx happyskills check <workspace>/<skill-name> --json`. If the response contains an error (skill not found in the registry), this is a first publish — ask about visibility using AskUserQuestion with exactly these options in this order:
   1. **"Private (Recommended)"** — MUST be the FIRST option. Description: "Only visible to members of your workspace."
   2. **"Public"** — MUST be the SECOND option. Description: "Visible in the public catalog to all users."
   NEVER present "Public" as the first or default option for a first-time publish. NEVER use the lock file `commit` field to detect first publish — locally developed skills always have `commit: null` even after publishing. If `happyskills check` returns version data (skill exists in the registry), do NOT ask about visibility — the existing visibility is preserved automatically by the server.

```bash
# ALWAYS include --workspace in every publish command
npx happyskills publish my-skill --workspace <slug> --json

# Publish as public
npx happyskills publish my-skill --workspace <slug> --public --json

# Auto-bump before publishing
npx happyskills publish my-skill --workspace <slug> --bump patch --json
```

Show the published skill name, version, and ref.

**If publish returns a DIVERGED error** (someone published between your status check and your publish — rare but possible):
1. Run `npx happyskills pull <skill> --json` to merge remote changes
2. If conflicts → guide resolution (see Section 10 in SKILL.md)
3. Re-run `npx happyskills publish <skill> --workspace <slug> --json`

**Merge commits:** When the lock entry contains `merge_parents` (set by a prior `pull` that auto-merged without conflicts), `publish` automatically sends them as `parent_shas`. The server creates a merge commit with two parents. This is transparent — no extra flags needed. After successful publish, both `merge_parents` and `conflict_files` are cleared from the lock — the skill is in a clean state.

**Convert an external skill to managed (auth optional):**

```bash
# Authenticated — auto-resolves workspace and checks registry for conflicts
npx happyskills convert skill-name -y --json

# Not authenticated — must provide --workspace (registry check skipped)
npx happyskills convert skill-name --workspace myorg -y --json

# With version override
npx happyskills convert skill-name --workspace myorg --version 1.0.0 -y --json

# Convert a global skill
npx happyskills convert skill-name -g -y --json
```

**Two modes:**
- **Authenticated:** Resolves workspace automatically from user's workspaces. Checks registry for name conflicts before converting. Recommended before publishing.
- **Not authenticated:** Requires `--workspace <slug>`. Skips registry conflict check. The skill is converted locally — login before publishing.

After a successful conversion, always proceed to **Post-Convert Enrichment** (Section 7 in SKILL.md).

**Fork a skill (requires auth):**

```bash
npx happyskills fork owner/name --json

# Fork to a specific workspace
npx happyskills fork owner/name --workspace myorg --json
```

After a successful fork, always proceed to **Post-Fork Enrichment** (Section 7 in SKILL.md).

---

## CLI Self-Management Commands

**Install the `happyskills` skill (no auth required):**

```bash
# Install at project level (default):
happyskills setup --json

# Install globally for all projects:
happyskills setup -g --json
```

Installs the latest `happyskillsai/happyskills`. Default: project-level; `-g` for global. Idempotent — reports "already_up_to_date" if current. If newly installed, tell user: "Restart Claude Code to activate the skill."

**Upgrade the `happyskills` CLI npm package itself (no auth required):**

```bash
happyskills self-update --json
```

Fetches latest from npm and runs `npm install -g happyskills@latest` if needed. Show from -> to versions or "already up to date".

---

## Validation Commands

**Validate a skill against all spec rules:**

```bash
npx happyskills validate my-skill --json
npx happyskills validate my-skill -g --json    # global skill
```

JSON response: `data.valid` (boolean), `data.errors` (array), `data.warnings` (array), `checks_passed`, `checks_failed`, `checks_warned`. Exit 0 = all pass, exit 1 = errors found.

If `data.valid` is `false`, present each error with file/field/message and offer to fix automatically. Warnings are advisory — present but don't block.

---

## Registry Deletion

**Delete a skill from the registry (requires auth, irreversible):**

```bash
npx happyskills delete owner/name --json -y
```

Confirm with AskUserQuestion before running. Show "Deleted owner/name from the registry."

---

## Visibility

**Check or set visibility (requires auth):**

```bash
npx happyskills visibility owner/name --json                  # get current
npx happyskills visibility owner/name public --json            # set to public/private/workspace
```

Show "Visibility for owner/name is public" (get) or "Visibility for owner/name set to public" (set).

---

## Auth Commands

**Login:**

See Section 2 in SKILL.md for the full auth flow. Do NOT run `npx happyskills login --password` — it exposes credentials in the terminal which the LLM can see.

**Logout:**

```bash
npx happyskills logout --json
```

Confirm logout was successful.

**Who am I (requires auth):**

```bash
npx happyskills whoami --json
```

Show username, email, and list of workspaces with their types.

---

## Config Commands

**View all config:**

```
npx happyskills config --json
```

Shows all config key-value pairs and the config file path.

**View current default agents:**

```
npx happyskills config agents --json
```

**Set default agents:**

```
npx happyskills config agents claude,cursor --json
npx happyskills config agents claude --json                   # only Claude
npx happyskills config agents claude,cursor,windsurf --json   # multiple agents
```

Validates agent IDs against the registry. Persists to `~/.config/happyskills/config.json`.

**List all supported agents with status:**

```
npx happyskills config agents --list --json
```

Shows each agent's ID, display name, skills directory, whether it's detected on the system, and whether it's configured as a default.

**Reset to auto-detect:**

```
npx happyskills config agents --reset --json
```

Removes the agents key from config. Installs will auto-detect agents based on home directory scanning.

---

## People Commands (Workspace Membership)

All `people` subcommands require auth. All except `search` require `-w <workspace>`.

**List workspace members:**

```bash
npx happyskills people list -w acme --json
```

Table: Username | Email | Role | Joined.

**Add a member to the workspace:**

```bash
npx happyskills people add -w acme alice --json
npx happyskills people add -w acme alice --role admin --json     # with specific role
```

Roles: `owner`, `admin`, `member` (default), `viewer`.

**Remove a member (confirm with AskUserQuestion first):**

```bash
npx happyskills people remove -w acme alice -y --json
```

**Change a member's role:**

```bash
npx happyskills people role -w acme alice admin --json
```

Positional args: `<username> <role>`. Valid roles: `owner`, `admin`, `member`, `viewer`.

**Search for users:**

```bash
npx happyskills people search "alice" --json
npx happyskills people search "alice" --limit 5 --json
```

Does NOT require `-w` — searches across all users. Default limit: 10.

---

## Groups Commands (Workspace Groups)

All `groups` subcommands require auth and `-w <workspace>`. Alias: `grp`.

**List groups:**

```bash
npx happyskills groups list -w acme --json
```

Table: Name | Description | Members | Default.

**Create a group:**

```bash
npx happyskills groups create -w acme engineering --json
npx happyskills groups create -w acme engineering --description "Core team" --default --json
```

**Delete a group (confirm with AskUserQuestion first):**

```bash
npx happyskills groups delete -w acme engineering -y --json
```

Deleting a group also removes all its skill access grants.

**Show group detail + members:**

```bash
npx happyskills groups show -w acme engineering --json
```

Returns group metadata and full member list.

**Add a person to a group:**

```bash
npx happyskills groups add -w acme engineering alice --json
```

Positional args: `<group> <username>`.

**Remove a person from a group:**

```bash
npx happyskills groups remove -w acme engineering alice --json
```

Positional args: `<group> <username>`.

**Toggle default group status:**

```bash
npx happyskills groups default -w acme engineering --on --json
npx happyskills groups default -w acme engineering --off --json
```

Default groups auto-assign new workspace members. Exactly one of `--on` or `--off` is required.

---

## Access Commands (Group Skill Permissions)

All `access` subcommands require auth. These manage which groups can access which skills and at what permission level.

**List access — by group (what skills can this group access):**

```bash
npx happyskills access list -w acme --group engineering --json
```

Requires `-w` and `--group`. Table: Skill | Permission | Direct.

**List access — by skill (which groups have access to this skill):**

```bash
npx happyskills access list --skill acme/deploy-aws --json
```

Requires `--skill`. Table: Group | Permission | Direct.

**Grant a group access to a skill:**

```bash
npx happyskills access grant --skill acme/deploy-aws --group engineering --permission read --json
```

Required flags: `--skill`, `--group`, `--permission` (`read`, `write`, or `admin`).

**Dependency-aware grant flow:**
1. If the skill has private dependencies, the API may return `requires_confirmation` with a dependency list.
2. In JSON mode, present the dependency list to the user and ask for confirmation.
3. Re-run with `--confirm` to proceed:

```bash
npx happyskills access grant --skill acme/deploy-aws --group engineering --permission read --confirm --json
```

Optional: `--dep-permission <read|write>` sets the permission level for dependency grants.

**Revoke a group's access (confirm with AskUserQuestion first):**

```bash
npx happyskills access revoke --skill acme/deploy-aws --group engineering --json
```

By default, cascaded dependency grants are also revoked. Use `--keep-deps` to preserve them:

```bash
npx happyskills access revoke --skill acme/deploy-aws --group engineering --keep-deps --json
```

**Change a group's permission level on a skill:**

```bash
npx happyskills access set --skill acme/deploy-aws --group engineering --permission write --json
```

Required flags: `--skill`, `--group`, `--permission`.
