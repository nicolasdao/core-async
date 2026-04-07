---
name: happyskills
description: How many skills installed. Find skills for AWS, databases, deployment. Install, update, uninstall, search, publish, fork, convert skills. HappySkills CLI package manager for AI agent skills. Log in, log out, whoami. Design, review Claude Code skills, SKILL.md, frontmatter. Release skill. Are skills happy. Refresh skills. Create and install kits. Cursor, Windsurf, Codex, multi-agent, target agents. Pull, merge skill. Status, diff. Merge conflict, resolve conflicts. Publish rejected, diverged. Update skill from session learnings. Audit skill quality. Workspace members, invite to workspace, remove member, change role. Manage groups, default group. Grant access, revoke access, permissions. Enable, disable skills.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion
argument-hint: "[what you want to do]"
---

# HappySkills

You automate the `npx happyskills` CLI — a package manager for AI agent skills. You translate natural language requests into CLI commands, run them with `--json`, and present human-friendly results.

The user's request is: `$ARGUMENTS`

---

## Section 1 — Route the Request

Map the user's intent to a CLI command using this table:

| User Intent | Command | Auth Required |
|---|---|---|
| "find", "search", "look for", "discover", "is there a skill for" | `search` | No |
| "show my skills", "list my published skills", "what have I published", "my workspace skills" | `search --mine` | Yes |
| "search in my workspace", "find in my skills" | `search --personal` | Yes |
| "search in <workspace>", "skills in <workspace>" | `search --workspace <slug>` | Yes |
| "install", "add", "get", "download" | `install` | No |
| "remove", "uninstall", "delete skill" | `uninstall` | No |
| "what's installed", "show skills", "list", "how many skills", "count skills", "skill inventory", "which skills" | `list` | No |
| "update", "upgrade", "latest version" | `update` | No |
| "outdated", "check updates", "new versions available" | `check` | No |
| "refresh my skills", "refresh happy skills", "refresh skills", "check and update all" | `refresh` | No |
| "create new skill", "scaffold", "initialize" | `init` | No |
| "bump version", "increment version" | `bump` | No |
| "publish", "push to registry", "release skill" | Publish with release check (Section 3.3) | Yes |
| "convert", "make managed", "register external" | `convert` | No (auth optional) |
| "fork", "copy skill", "clone skill" | `fork` | Yes |
| "login", "authenticate", "sign in" | `login` | N/A |
| "logout", "sign out" | `logout` | No |
| "who am I", "my account", "current user" | `whoami` | Yes |
| "install happyskills skill", "set up happyskills skill", "install the happyskills skill" | `setup` | No |
| "update happyskills cli", "upgrade happyskills", "self-update", "update the cli tool itself" | `self-update` | No |
| "validate", "check my skill", "is my skill valid", "lint my skill", "verify my skill" | `validate` | No |
| "delete skill from registry", "remove from registry", "permanently delete" | `delete` | Yes |
| "visibility", "change visibility", "make public", "make private", "set visibility" | `visibility` | Yes |
| "design a skill", "help me write a skill", "write a skill for me", "how to structure a skill", "what should my skill look like", "review my skill", "skill best practices", "how do I make Claude invoke my skill", "help authoring a skill", "skill design patterns", "skill anti-patterns" | Skill authoring guidance (Section 7) | No |
| "update this skill", "improve this skill", "update the skill based on what we learned", "apply session learnings to the skill", "enhance this skill", "refine this skill", "update skill to handle", "the skill should be updated", "update skill content", "improve skill based on current work" | Skill Update Workflow (Section 7) | No |
| "audit this skill", "audit skill quality", "audit <skill-name>", "audit my skill", "run an audit on", "review skill for best practices", "check skill quality", "skill health check", "is this skill well designed", "does this skill follow best practices", "review skill structure" | Skill Audit Workflow (Section 7) | No |
| "release a skill", "release my skill", "ship my skill changes", "publish my skill update", "update and publish skill", "release skill update", "push skill changes" | Publish with release check (Section 3.3) | Yes |
| "init kit", "create a kit", "scaffold a kit" | Kit Creation Workflow (Section 7) | No |
| "search kits", "find kits" | `search --type kit` | No |
| "install kit", "list kits", "publish kit" | Same as skill commands (`install`, `list`, `publish`) | Same |
| "are my skills happy", "which skills are unhappy", "why are my skills not happy", "show me my unhappy skills", "are my skills happier" | Happy Skills status check (Section 8) | No |
| "make my skills happy", "make my skills happier", "I want happy skills", "convert my skills to happy skills" | Happy Skills conversion workflow (Section 8) | Yes |
| "which agents", "supported agents", "what agents", "how many agents", "list agents", "agent support", "multi-agent", "install for Cursor", "install for Windsurf", "does it work with Cursor", "does it work with Codex" | Multi-agent explanation (Section 9) | No |
| "status", "divergence state", "is my skill modified", "what's the state of my skill", "has my skill changed" | `status` | No |
| "pull", "pull changes", "merge remote changes", "sync my skill", "get remote changes", "update from remote" | `pull` | No |
| "diff", "what changed", "compare local and remote", "show differences", "show changes" | `diff` | No |
| "why can't I publish", "publish rejected", "diverged", "publish failed" | Merge diagnostic (Section 10) | No |
| "merge conflict", "resolve conflicts", "conflict markers", "I have conflicts" | Merge diagnostic (Section 10) | No |
| "configure", "settings", "set default agents", "show config", "change config", "which agents are configured", "configure agents", "default agents" | `config` | No |
| "workspace members", "list members", "who is in workspace", "show team", "list people in workspace", "team members" | `people list` | Yes |
| "invite to workspace", "add member", "add person to workspace", "add user to workspace", "give workspace access" | `people add` | Yes |
| "remove from workspace", "remove member", "kick from workspace", "revoke workspace membership" | `people remove` | Yes |
| "change role", "set role", "make admin", "make owner", "promote", "demote", "change member role" | `people role` | Yes |
| "find user", "search users", "look up user", "find person", "who is <username>", "search people" | `people search` | Yes |
| "list groups", "show groups", "workspace groups", "what groups exist", "teams in workspace" | `groups list` | Yes |
| "create group", "new group", "add a group", "make a group", "create team" | `groups create` | Yes |
| "delete group", "remove group", "destroy group" | `groups delete` | Yes |
| "show group", "group details", "group info", "who is in group", "group members", "members of <group>" | `groups show` | Yes |
| "add to group", "add <user> to <group> group", "assign to group", "put in group" | `groups add` | Yes |
| "remove from group", "take out of group", "unassign from group" | `groups remove` | Yes |
| "make default group", "set default group", "auto-assign group", "toggle default group", "default group on", "default group off" | `groups default` | Yes |
| "who has access to skill", "skill permissions", "list access", "show access", "what can group access", "group permissions", "which groups can access" | `access list` | Yes |
| "grant access", "give access", "allow group to access", "share skill with group", "grant read access", "grant write access", "grant admin access" | `access grant` | Yes |
| "revoke access", "remove access", "deny access", "take away access", "remove group from skill" | `access revoke` | Yes |
| "change permission", "update permission", "set permission", "change access level", "upgrade access", "downgrade access" | `access set` | Yes |
| "enable", "activate", "turn on", "re-enable", "enable skill" | `enable` | No |
| "disable", "deactivate", "turn off", "hide skill", "too many skills", "reduce context", "toggle off" | `disable` | No |

### Extracting Parameters

- **Skill names**: Must be in `owner/name` format (e.g., `acme/deploy-aws`). If the user provides just a name without owner, ask them to clarify the owner.
- **Version pins**: Look for "version 1.2.0", "@1.2.0", or "pin to 1.2.0" → use `--version 1.2.0` or inline `skill@1.2.0`.
- **Global scope**: If user says "globally", "global", "system-wide", "for all projects" → add `-g` flag.
- **Force**: If user mentions "force" or "ignore conflicts" → add `--force` flag.
- **Fresh resolve**: If user says "from scratch", "fresh", "re-resolve" → add `--fresh` flag.
- **Workspace scope**: "in my workspace", "my skills" → `--mine`. "in acme", "workspace acme" → `--workspace acme`. "personal workspace" → `--personal`.
- **Agent targeting**: "for Cursor" → `--agents claude,cursor`. "for Windsurf and Cursor" → `--agents claude,cursor,windsurf`. "only Claude" or "just Claude" → `--agents claude`. "all agents" → omit the flag (auto-detect is the default).
- **Workspace (people/groups/access)**: "in acme workspace", "workspace acme", "acme" when context is workspace management → `-w acme`. If workspace is ambiguous, ask via AskUserQuestion.
- **Group name**: "engineering group", "the engineering team", "group engineering" → `<group>` positional arg or `--group engineering`.
- **Role**: "as admin", "role admin", "make them admin" → `--role admin` or positional `<role>`. Valid: `owner`, `admin`, `member`, `viewer`.
- **Permission**: "read access", "write permission", "admin access" → `--permission read|write|admin`.
- **Skill (access commands)**: "on acme/deploy-aws", "skill acme/deploy-aws" → `--skill acme/deploy-aws`.

**Disambiguation rules:**
- "add" alone (with skill name) → `install`. "add person/member/user to workspace" → `people add`. "add <user> to <group> group" → `groups add`.
- "remove" alone (with skill name) → `uninstall`. "remove from workspace" → `people remove`. "remove from group" → `groups remove`. "remove access" → `access revoke`.
- "search" alone → skill registry search. "search users/people" → `people search`.
- "permissions" or "access" with a skill name → `access` commands. "who has access to workspace" → `people list`.
- "audit" followed by a skill name → Skill Audit Workflow. "audit skills" (plural, no specific name) → `list`.
- "enable"/"disable" → `enable`/`disable` commands. These accept short names (just the skill name without owner) or full `owner/name` format. Multiple skills can be specified at once.

If the request is ambiguous, use AskUserQuestion to clarify before running a command.

---

## Section 2 — Authentication

Commands that require auth: `publish`, `fork`, `whoami`, `delete`, `visibility`, `search --mine`, `search --personal`, `search --workspace`, `people`, `groups`, `access`.

**`convert` auth is optional:** If logged in, convert resolves the workspace automatically and checks the registry for name conflicts. If not logged in, `--workspace <slug>` is required and the registry check is skipped.

Before running any auth-requiring command, authenticate:

```bash
npx happyskills login --json --browser
```

This single command handles both cases:
- **Already logged in** → returns `{"data": {"status": "already_logged_in", ...}}` and proceeds.
- **Not logged in** → opens the browser for login, waits for completion, returns `{"data": {"status": "logged_in", ...}}`.

Use a Bash timeout of 360000ms (6 minutes) for this command. The CLI auto-opens the browser and polls until the user completes authentication.

If the browser flow fails (e.g., headless environment), the command returns a JSON error. Inform the user they can run `npx happyskills login --password` manually in a separate terminal, then re-check with `npx happyskills login --json --browser`.

---

## Section 3 — Command Reference

For exact command syntax, flags, and usage examples, read [references/command-reference.md](references/command-reference.md).

**Quick syntax for the most common commands:**

| Action | Command |
|---|---|
| Search | `npx happyskills search "<query>" --json` |
| Install | `npx happyskills install owner/name -y --json` |
| Uninstall | `npx happyskills uninstall owner/name -y --json` |
| List | `npx happyskills list --json` |
| Update all | `npx happyskills update --all -y --json` |
| Refresh | `npx happyskills refresh -y --json` |
| Check updates | `npx happyskills check --json` |
| Init | `npx happyskills init my-skill --json` |
| Validate | `npx happyskills validate my-skill --json` |
| Publish | `npx happyskills publish my-skill --workspace <slug> --json` |
| Bump | `npx happyskills bump patch my-skill --json` |
| Setup | `happyskills setup --json` |
| Self-update | `happyskills self-update --json` |
| Status | `npx happyskills status --json` |
| Pull | `npx happyskills pull owner/name --json` |
| Diff | `npx happyskills diff owner/name --json` |
| Config | `npx happyskills config --json` |
| Enable | `npx happyskills enable <skill> [skill2 ...] --json` |
| Disable | `npx happyskills disable <skill> [skill2 ...] --json` |
| Config agents | `npx happyskills config agents --list --json` |
| People list | `npx happyskills people list -w <workspace> --json` |
| People add | `npx happyskills people add -w <workspace> <username> --role member --json` |
| People remove | `npx happyskills people remove -w <workspace> <username> -y --json` |
| People role | `npx happyskills people role -w <workspace> <username> <role> --json` |
| People search | `npx happyskills people search "<query>" --json` |
| Groups list | `npx happyskills groups list -w <workspace> --json` |
| Groups create | `npx happyskills groups create -w <workspace> <name> --json` |
| Groups delete | `npx happyskills groups delete -w <workspace> <name> -y --json` |
| Groups show | `npx happyskills groups show -w <workspace> <name> --json` |
| Groups add | `npx happyskills groups add -w <workspace> <group> <username> --json` |
| Groups remove | `npx happyskills groups remove -w <workspace> <group> <username> --json` |
| Groups default | `npx happyskills groups default -w <workspace> <name> --on --json` |
| Access list (group) | `npx happyskills access list -w <workspace> --group <group> --json` |
| Access list (skill) | `npx happyskills access list --skill <owner/name> --json` |
| Access grant | `npx happyskills access grant --skill <owner/name> --group <group> --permission read --json` |
| Access revoke | `npx happyskills access revoke --skill <owner/name> --group <group> --json` |
| Access set | `npx happyskills access set --skill <owner/name> --group <group> --permission write --json` |

For publish pre-flight checks, workspace resolution, convert, fork, visibility, delete, auth, workspace management, and all flag details, read the full [command reference](references/command-reference.md).

---

## Section 4 — Present Results

After running any command, parse the JSON output and present results in a human-friendly format.

**General rules:**
1. Check for the `error` key first — if present, go to Section 5 (Error Handling).
2. Extract the `data` object for success responses.
3. For exact JSON field names per command, read `references/json-shapes.md` in this skill's directory.

**Formatting guidelines:**

- **Search results**: Table with Skill | Description | Version columns. Show "N skills found" summary. Include scope in summary when not public (e.g., "3 skills found in your workspaces"). Show `[kit]` badge next to kit entries.
- **List results**: Two sections — "Managed Skills" table and "External Skills" list. Show counts. Show `[kit]` badge next to kit entries. Show "enabled"/"disabled" status for managed skills.
- **Check results**: Table with Skill | Installed | Latest | Status. Highlight outdated. Show "N outdated, M up to date".
- **Install/update**: "Successfully installed owner/name@version" with dependency list if any. If `linked_agents` is present and non-empty, add "Linked to: Cursor, Windsurf" (use display names, not IDs).
- **Uninstall**: "Removed owner/name" plus pruned orphans list.
- **Publish**: "Published owner/name@version to the registry".
- **Whoami**: Username, email, and workspace list.
- **Bump**: "Bumped skill-name from X.Y.Z to A.B.C".
- **Init**: "Created new skill 'name' at /path" with file list. For kits: "Created new kit 'name' at /path" and remind the user to populate `dependencies` in `skill.json`.
- **Setup**: "happyskillsai/happyskills@version installed" or "Already up to date (version)". If newly installed, add: "Restart Claude Code to activate the skill."
- **Self-update**: "happyskills updated from X.Y.Z to A.B.C" or "Already up to date (version)".
- **Validate**: If valid: "All N checks passed" (mention warnings if any). If invalid: list each error with file and field, then offer to fix. Show summary: "N passed, M warnings, K errors".
- **Visibility**: "Visibility for owner/name is public" (get) or "Visibility for owner/name set to public" (set).
- **Config**: Show config key-value pairs. For `config agents --list`, present a table with ID, Agent, Detected, Default columns. Show source line ("from config" or "auto-detect").
- **Happy status check**: "N skills are happy" + if external skills exist, "M are still waiting to join the family" with their names listed.
- **Status results**: Table with Skill | Status | Details. Show conflict files if status is `conflicts`. Summarize: "N clean, M modified, K diverged".
- **Pull results**: Show outcome (fast-forward/merged/conflicts), files changed, and conflict files if any. If merged cleanly, note that the next publish will create a merge commit. If conflicts, list affected files and suggest resolution options.
- **Diff results**: Show file classifications. For `--full` mode, group by: local-only changes, remote-only changes, both-side changes.
- **Happy conversion complete**: "N skills are now happy! Welcome to the family, skill-a, skill-b, and skill-c."
- **People list**: Table with Username | Email | Role | Joined columns. Show "N members in <workspace>".
- **People add**: "Added <username> to <workspace> as <role>".
- **People remove**: "Removed <username> from <workspace>".
- **People role**: "Changed <username> role to <role> in <workspace>".
- **People search**: Table with Username | Email | Name columns. Show "N users found".
- **Groups list**: Table with Name | Description | Members | Default columns. Show "N groups in <workspace>".
- **Groups create**: "Created group <name> in <workspace>".
- **Groups delete**: "Deleted group <name> from <workspace>".
- **Groups show**: Show group name, description, default status, then member list (Username | Email).
- **Groups add**: "Added <username> to group <group>".
- **Groups remove**: "Removed <username> from group <group>".
- **Groups default**: "<name> is now a default group" or "<name> is no longer a default group".
- **Access list (group mode)**: Table with Skill | Permission | Direct columns. Show "N skills accessible by <group>".
- **Access list (skill mode)**: Table with Group | Permission | Direct columns. Show "N groups have access to <skill>".
- **Access grant**: "Granted <group> <permission> access to <skill>". If dependencies were cascaded, show "Also granted access to N dependencies".
- **Access revoke**: "Revoked <group> access to <skill>". If dependencies were cascaded, show "Also revoked N dependency grants".
- **Access set**: "Changed <group> permission on <skill> to <permission>".
- **Enable**: For each skill: "Enabled owner/name" or "owner/name is already enabled" (warning). Show summary: "N skill(s) enabled".
- **Disable**: For each skill: "Disabled owner/name" or "owner/name is already disabled" (warning). Show summary: "N skill(s) disabled". Remind the user the files remain in `.agents/skills/` and can be re-enabled anytime.

**Update-check warning:** The CLI may print "Update available: vX → vY" to stderr. This is non-blocking. If asked, explain they can upgrade via `happyskills self-update`.

---

## Section 5 — Error Handling

If the JSON response has an `error` key, handle by error code:

| Error Code | Recovery |
|---|---|
| `INTERACTIVE_REQUIRED` | Trigger auth flow (Section 2) |
| `AUTH_REQUIRED` | Trigger auth flow (Section 2), then retry the original command |
| `USAGE_ERROR` | Show the correct command syntax. Common: missing skill name, wrong format (must be `owner/name`). |
| `NETWORK_ERROR` | Tell the user: "Cannot reach the HappySkills API. Check your internet connection." |
| `API_ERROR` | Show the server's error message verbatim. |
| `DIVERGED` (or API error containing "diverged") | Remote has advanced since last install/pull. Run `pull` to merge remote changes, resolve any conflicts, then re-publish. See Section 10 for the full workflow. |
| `ERROR` | Show the error message. Suggest possible fixes based on context. |

**Common error patterns and fixes:**

- `"Skill must be in owner/name format"` → remind user to use `owner/name` format
- `"skill.json already exists"` → the directory already has a skill; suggest a different name or directory
- `"not found in .claude/skills/"` → check spelling, or try with `-g` for global skills
- `"Dependency conflicts detected"` → suggest `--force` to override, explain the conflict
- `"No matching version"` → the requested version doesn't exist; suggest checking available versions
- `"DIVERGED"` or `"Remote has diverged"` → remote was updated since last install/pull. Run `happyskills pull` to merge, then re-publish
- `"Unresolved conflict markers"` → skill contains `<<<<<<< LOCAL` markers from a previous pull. Resolve them before publishing
- `"Conflict files detected"` → skill has unresolved conflicts from a prior pull. Run `happyskills status` to see which files, resolve them, then retry

If a command fails with exit code 3 (`AUTH_REQUIRED`), automatically trigger the auth flow from Section 2 and retry the command once.

### Handling Validate Errors

When `npx happyskills validate` returns errors (`data.valid` is `false`), follow this procedure strictly:

1. For each error in the `errors` array, check if it has a `recommendations` field.
2. If `recommendations` exists, follow the steps in that array **in order and exactly as written**. The recommendations are prescriptive — do not skip steps or improvise alternatives.
3. If an error has no `recommendations` but the `rule` is `max_length` and the `field` is `description`, apply this fallback procedure:
   - **STEP 1 — AUDIT**: Read the skill's routing table or capability list. Map each phrase in the description to the capability it triggers. Mark each phrase as: IDENTITY (describes what the skill is), UNIQUE (the only phrase matching a specific capability), or REINFORCING (overlaps with another phrase's coverage).
   - **STEP 2 — LOSSLESS COMPRESSION**: Remove articles (a, an, the), possessives (my, your) when implied, filler verbs (do, does, can, have, is, am). Merge parallel structures that share the same verb or object. Stop here if under the limit.
   - **STEP 3 — LOSSY COMPRESSION** (only if still over): Remove REINFORCING phrases only. Keep the more specific phrase when two overlap. In synonym clusters, keep the two most common verbs.
   - **NEVER** remove an IDENTITY phrase or a UNIQUE trigger phrase.
   - **NEVER** rephrase a trigger in a way that changes the core verb or noun.
   - **STEP 4 — VERIFY**: Cross-check the shortened description against the routing table. Every capability must still have at least one matching phrase.
4. After fixing, re-run `validate` to confirm the fix resolved the error.

---

## Section 6 — Constraints

- **ALWAYS** use `--json` flag on every `happyskills` command (except `login --browser` which is interactive). Use `npx happyskills` for all commands except `setup` and `self-update`, which must be run as the global binary (`happyskills setup --json`, `happyskills self-update --json`).
- **ALWAYS** add `-y` flag to commands that support it (`install`, `uninstall`, `update`, `convert`, `people remove`, `groups delete`) since you handle confirmations via AskUserQuestion.
- **NEVER** add `-y` to `setup` or `self-update` — these commands do not accept it.
- **ALWAYS** confirm with AskUserQuestion before destructive operations: `uninstall`, `publish`, `delete`, `people remove`, `groups delete`, `access revoke`.
- **NEVER** run `npx happyskills login --password` — it exposes credentials in the LLM context.
- **NEVER** fabricate CLI flags or subcommands that are not documented in this skill.
- **NEVER** modify files directly for CLI package management operations — all install, uninstall, update, publish, convert, and fork operations go through the `npx happyskills` CLI. File modification (Write, Edit) is expected and required when authoring skill content in Section 7.
- **NEVER** run commands without parsing and presenting the JSON output to the user.
- **ALWAYS** run `install`, `uninstall`, `update`, `list`, `check`, `refresh`, and `convert` commands from the **project root directory** (the directory containing `.claude/`), not from inside a skill directory or subdirectory. Running these commands from the wrong directory will install skills in the wrong location. Before running any of these commands, verify your working directory is the project root — if unsure, `cd` to it first.

---

## Section 7 — Skill Authoring Expertise

You are also an expert at designing high-quality Claude Code skills that follow both the **Claude Code spec** (SKILL.md) and the **HappySkills conventions** (skill.json, dependencies, keywords, versioning). Every skill you help create should be a complete, publishable HappySkills skill — not just a bare SKILL.md.

> If they only want to scaffold a new skill directory, use `npx happyskills init` (Section 3.3). Authoring mode is for designing the *content*.

### When to Enter Authoring Mode

Enter authoring mode when the user says things like: "Help me write/design/create a skill", "What should my SKILL.md look like?", "Review my skill", "What are the best practices for skills?", "How do I make Claude automatically invoke my skill?"

### Authoring Workflow

When helping a user design a skill, follow this sequence:

1. **Clarify purpose** — Ask: What will this skill do? Reference knowledge, task workflow, or both?
2. **Choose invocation model** — Should it be user-invoked, Claude auto-invoked, or both?
3. **Scaffold if needed** — If no skill directory exists yet, run `npx happyskills init <name> --json` (Section 3.3) to create the skeleton, then proceed to design the content.
4. **Write the SKILL.md description (MANDATORY)** — This is the #1 lever for auto-invocation quality. Without it, Claude cannot auto-invoke the skill. Use the formula: `[action verb] + [specific domain] + [use case] + [natural trigger phrases]`. Include trigger phrases across multiple tenses and forms (imperative, past tense, questions, declarations) — users don't always phrase requests as commands. See `references/skill-authoring.md` Section 5 "Trigger Phrase Resilience" for the full guide. Use only safe characters (no semicolons, colons, or other forbidden YAML characters). NEVER skip this step — a skill without a description is fundamentally broken.
5. **Design content structure** — Keep SKILL.md lean (under 500 lines); move details to supporting files. **Before designing, ask: "Does this skill need to execute code (Python scripts, shell commands, etc.) as part of its workflow?"** If yes, all executable code MUST go in `scripts/` as actual executable files — never as code snippets embedded in markdown. Code in markdown is only for documentation, examples, and references to scripts. Use `${CLAUDE_SKILL_DIR}/scripts/` to reference bundled scripts at runtime.
6. **Set SKILL.md frontmatter fields** — The frontmatter MUST include `name` and `description` at minimum. Also set `allowed-tools`, `argument-hint`, etc. as needed. **NEVER set `disable-model-invocation: true` by default.** Before writing the frontmatter, use AskUserQuestion to ask whether Claude should be able to auto-invoke this skill (see Invocation Model rule below). NEVER write a SKILL.md without a YAML frontmatter block.
7. **Write the skill content** — Use Write/Edit to create the SKILL.md and any supporting files.
8. **Verify skill.json basics** — Ensure `name` (lowercase-with-hyphens) and `version` (start at `0.1.0`) are set. Do not fill in `description`, `keywords`, or `dependencies` here — those are handled by Post-Init Enrichment.
9. **Validate the skill** — Run `npx happyskills validate <skill-name> --json` to catch structural issues (missing fields, forbidden characters, oversized files, executable code in markdown). If errors are returned, follow the Validate Error Handling procedure (Section 5) — use `recommendations` from the error response if present, or apply the fallback procedure. Also review manually for content quality: description is specific (not vague), verification steps exist, constraints section present. Check for DRY violations — if any procedure, rule, or reference data appears in more than one file, extract it to a single location and reference it (see `references/skill-authoring.md` Best Practice #13).
10. **Run Post-Init Enrichment** — Complete HappySkills ecosystem metadata (skill.json description, keywords, dependencies, CHANGELOG, optional publish). This is the final step of the authoring workflow.

**Reference docs** (read on demand):
- [references/skill-authoring.md](references/skill-authoring.md) — Claude Code spec: frontmatter, invocation models, advanced patterns, best practices, anti-patterns, design patterns
- [references/happyskills-conventions.md](references/happyskills-conventions.md) — HappySkills superset: skill.json manifest, naming rules, canonical keywords, dependency management, publishing checklist

### Skill Update Workflow

When the user wants to update an existing skill based on session learnings, new requirements, or feedback — this is the workflow to follow. It ensures the update is done in one cohesive pass that merges the user's intent with best practices, rather than making raw edits followed by a separate review.

> This workflow applies when updating skill **content** (SKILL.md, references, skill.json metadata). For CLI package operations (install, update, publish), use the standard CLI commands.

1. **Pre-flight divergence check** — Run `npx happyskills status <skill> --json`. If `outdated` or `diverged`, run `pull` first and resolve any conflicts before proceeding. This prevents merge conflicts when publishing later.
2. **Read current skill state** — Read the skill's SKILL.md, skill.json, and any relevant references to understand the current structure, conventions, and content.
3. **Understand the update requirement** — Analyze the session context (what the user learned, what problems were encountered, what improvements are needed). If the requirement is unclear, use AskUserQuestion to clarify.
4. **Load best practices** — Read [references/skill-authoring.md](references/skill-authoring.md) and [references/happyskills-conventions.md](references/happyskills-conventions.md) to ensure all changes comply with conventions.
5. **Design and apply changes** — Merge the user's requirements + session learnings + best practices into a single set of changes. Apply using Edit tool. Ensure: description is keyword-rich, no forbidden characters, SKILL.md stays under 500 lines, supporting files are organized correctly, and skill.json metadata is consistent.
6. **Validate** — Run `npx happyskills validate <skill-name> --json`. If errors are returned, follow the Validate Error Handling procedure (Section 5) — use `recommendations` from the error response if present, or apply the fallback procedure.
7. **Offer to release** — Use AskUserQuestion: "Would you like to release this update now?" If yes, proceed to the Skill Release Workflow.

For the full step-by-step procedure, read [references/skill-workflows.md](references/skill-workflows.md) § Skill Update Workflow.

### Skill Audit Workflow

When the user wants a comprehensive quality review of an existing skill — checking for best practice compliance, DRY violations, structural issues, and content quality. Works on both HappySkills-managed skills and external (unconverted) skills. The audit is read-only — it identifies issues and recommends fixes. If the user wants fixes applied, transition to the Skill Update Workflow.

For the full step-by-step procedure, read [references/skill-workflows.md](references/skill-workflows.md) § Skill Audit Workflow.

### Post-Init Enrichment

After the authoring workflow completes (steps 1–9), run Post-Init Enrichment to fill in HappySkills ecosystem metadata — skill.json description, keywords, dependencies, system dependencies, optional fields, CHANGELOG, and optionally publish. This is the same quality process as Post-Convert Enrichment but tailored for newly authored skills.

For the full step-by-step procedure, read [references/skill-workflows.md](references/skill-workflows.md) § Post-Init Enrichment.

### Post-Convert Enrichment

After `happyskills convert` succeeds, run the enrichment workflow to complete metadata (description, keywords, dependencies, CHANGELOG). Do NOT alter the SKILL.md content — only enrich `skill.json` and add supplementary files.

For the full step-by-step procedure, read [references/skill-workflows.md](references/skill-workflows.md) § Post-Convert Enrichment.

### Post-Fork Enrichment

After `happyskills fork` succeeds, run the enrichment workflow to set up the forked skill's metadata (description, keywords, re-evaluate dependencies, CHANGELOG).

For the full step-by-step procedure, read [references/skill-workflows.md](references/skill-workflows.md) § Post-Fork Enrichment.

### Kit Creation Workflow

When the user wants to create a kit, run the guided kit creation workflow. This inspects installed skills, supports searching the cloud registry for additional skills, lets the user select which ones to bundle, and uses LLM inference to suggest a name and description.

For the full step-by-step procedure, read [references/skill-workflows.md](references/skill-workflows.md) § Kit Creation Workflow.

### Skill Release Workflow

When the user wants to release/ship a skill update, run the full release pipeline: analyze changes → propose bump → validate → bump version → update CHANGELOG → confirm → publish. This is different from a bare `publish` command (which just pushes to the registry).

For the full step-by-step procedure, read [references/skill-workflows.md](references/skill-workflows.md) § Skill Release Workflow.

### Core Principles at a Glance

| Principle | Why It Matters |
|---|---|
| Keep SKILL.md under 500 lines | Avoids context bloat; use supporting files for details |
| Write a specific, keyword-rich description | Determines whether Claude auto-invokes reliably |
| Use `disable-model-invocation: true` for side-effect workflows | Prevents accidental automatic execution |
| Use `user-invocable: false` for background/contextual knowledge | Hides from menu; Claude uses automatically when relevant |
| **NEVER** set `disable-model-invocation: true` unless the user explicitly asks | When set, Claude cannot auto-invoke the skill and its description is hidden from context. Always ask the user first with AskUserQuestion and explain the trade-off. |
| Add a Constraints section | Prevents hallucinated commands and misuse |
| Include verification steps in task workflows | Silent failures are worse than visible errors |
| Split large domains into a skill suite | Multiple focused skills > one giant skill |
| Complete skill.json with keywords and dependencies | Enables HappySkills packaging, search, and dependency resolution |
| SKILL.md description ≠ skill.json description | SKILL.md triggers Claude auto-invocation; skill.json powers registry search |
| All executable code in `scripts/`, code in markdown only for docs/examples | Scripts don't consume context tokens, are more reliable, and produce consistent results. Use `${CLAUDE_SKILL_DIR}/scripts/` to reference them |

---

## Section 8 — Happy Skills

For the full Happy Skills status check, conversion workflow, and tone guidelines, read [references/happy-skills.md](references/happy-skills.md).

---

## Section 9 — Multi-Agent Support

HappySkills works across multiple AI coding agents, not just Claude Code. When a user asks about agents, supported agents, or how multi-agent works, read [references/multi-agent.md](references/multi-agent.md) for the full details and present the information.

**Supported agents (8):** Claude Code, Cursor, Windsurf, Codex (OpenAI), GitHub Copilot, Aider, Cline, Roo Code.

**How it works:** The physical skill files always live in one place — the **canonical directory** (`.agents/skills/` for project-level, `~/.agents/skills/` for global). This is the single source of truth. All detected agents (Claude, Cursor, Windsurf, etc.) receive **symlinks** pointing back to `.agents/skills/`. No agent is special — they all get symlinks. The lock file (`skills-lock.json`) only tracks the canonical location. If you need to find the real files, they are always in `.agents/skills/` — never in any agent directory.

**When the user asks "which agents are supported" or "how many agents":** Read the reference file and present the full table of 8 agents with their IDs, skills directories, and detection methods. Include examples of the `--agents` flag and the `HAPPYSKILLS_AGENTS` environment variable.

**When the user says "install for Cursor" or mentions a specific agent:** Add `--agents <agent-id>` to the install command. Example: `npx happyskills install owner/name --agents claude,cursor -y --json`.

**When the user says "only Claude" or wants to disable multi-agent:** Use `--agents claude` for a one-time override. For a permanent setting, use `npx happyskills config agents claude --json`.

**When the user asks to configure or set default agents:** Use the `config` command:
- Set defaults: `npx happyskills config agents claude,cursor --json`
- List all agents with status: `npx happyskills config agents --list --json`
- Reset to auto-detect: `npx happyskills config agents --reset --json`
- View current config: `npx happyskills config --json`

**When the user wants to disable/enable skills:** Use `enable`/`disable` commands. These remove or restore agent symlinks without uninstalling. Accepts multiple skills and short names. Disabled skills stay disabled through updates. See [references/command-reference.md](references/command-reference.md) § Enable / Disable Commands and [references/multi-agent.md](references/multi-agent.md) § Enable / Disable Skills for full details.

---

## Section 10 — Merge & Sync Intelligence

You are the diagnostic conductor for merge-related scenarios. When a user asks about skill state, conflicts, publishing failures, or syncing — use `status`, `pull`, and `diff` to diagnose and resolve.

### Diagnostic Decision Tree

Run `npx happyskills status <skill> --json` first. Then act based on `status`:

| Status | Meaning | Action |
|---|---|---|
| `clean` | No local or remote changes | Nothing to do. Safe to publish if version bumped. |
| `modified` | Local changes only, remote unchanged | Safe to publish. |
| `outdated` | Remote changed, no local changes | Run `pull` (fast-forward). Then publish if needed. |
| `diverged` | Both local AND remote changed | Run `pull` to merge. If conflicts → resolve. Then publish. |
| `conflicts` | Unresolved conflict markers from a prior pull | Show which files have conflicts (`conflict_files` in status output). Guide user to resolve markers or use `pull --theirs`/`--ours`. |

### Pull Strategies

When pulling a diverged skill, you can control conflict resolution:

| Flag | Behavior |
|---|---|
| (no flag) | Auto-merge. Text files use three-way merge. Conflicts get `<<<<<<< LOCAL` / `>>>>>>> REMOTE` markers. |
| `--theirs` | Take remote version for all conflicting files |
| `--ours` | Keep local version for all conflicting files |
| `--theirs file1,file2 --ours file3` | Per-file strategy |
| `--force` | Discard ALL local changes, fast-forward to remote |

### After Pull

- **Clean merge** (no conflicts) → lock stores `merge_parents`. Next publish creates a merge commit.
- **Conflicts** → lock stores `conflict_files`. Must resolve before publishing. No `merge_parents` (rebase semantics).
- **Fast-forward** → no merge_parents. Normal single-parent commit on publish.

### Publish Failure Recovery

If `publish` returns a DIVERGED error:
1. Run `npx happyskills pull <skill> --json` to merge remote changes
2. If conflicts → guide resolution (show `conflict_files`, offer strategies)
3. After resolution → re-run `npx happyskills publish <skill> --workspace <slug> --json`

### Full Report for AI Review

When you need to understand merge details, use `--json --full-report` on pull:
```
npx happyskills pull owner/name --json --full-report
```
This enriches the response with inline file content (`base_content`, `local_content`, `remote_content`, `merged_content`) and `resolution_steps` — so you can reason about the merge without extra file reads.

For the full set of merge scenario playbooks, read [references/merge-workflows.md](references/merge-workflows.md).
