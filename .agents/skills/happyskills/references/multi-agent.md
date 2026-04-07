# Multi-Agent Support

HappySkills supports installing skills across multiple AI coding agents simultaneously. When you install a skill, HappySkills automatically detects which AI agents are available on your system and links the skill to all of them.

---

## Where Physical Skill Files Live

**The single source of truth for all skill files is always the canonical `.agents/skills/` directory:**

| Scope | Physical location (source of truth) |
|---|---|
| Project-level | `<project>/.agents/skills/` |
| Global | `~/.agents/skills/` |

Every agent directory (`.claude/skills/`, `.cursor/skills/`, `.windsurf/skills/`, etc.) contains **only symlinks** pointing back to `.agents/skills/`. No agent is special — they all work the same way.

The lock file (`skills-lock.json`) exclusively tracks the canonical location. It has no knowledge of symlinks or agent directories.

**Key implications:**
- To find the real files for any skill, always look in `.agents/skills/`
- Deleting a file from `.agents/skills/` breaks all agent symlinks
- Editing a file in `.agents/skills/` instantly propagates to all linked agents
- The `.claude/skills/`, `.cursor/skills/`, etc. directories should never be edited directly — they are derived from the canonical location

---

## How It Works

1. **Canonical location** — HappySkills downloads, extracts, and writes physical skill files exclusively to `.agents/skills/` (project) or `~/.agents/skills/` (global). No agent directory ever receives physical files directly.
2. **Auto-detection** — At install time, HappySkills scans your home directory for AI agent config folders (e.g., `~/.claude/`, `~/.cursor/`, `~/.windsurf/`).
3. **Symlink linking** — For each detected agent, HappySkills creates a symlink from that agent's skills directory to the canonical copy in `.agents/skills/`. This means one physical copy serves all agents, and updates propagate instantly.
4. **Uninstall cleanup** — When you uninstall a skill, HappySkills removes the physical files from `.agents/skills/` and cleans up all symlinks from every agent directory.

---

## Supported Agents

HappySkills supports 8 AI coding agents out of the box:

| Agent | ID | Skills Directory | Detection | Storage |
|---|---|---|---|---|
| Claude Code | `claude` | `.claude/skills/` | `~/.claude/` | Symlinks to `.agents/skills/` |
| Cursor | `cursor` | `.cursor/skills/` | `~/.cursor/` | Symlinks to `.agents/skills/` |
| Windsurf | `windsurf` | `.windsurf/skills/` | `~/.windsurf/` | Symlinks to `.agents/skills/` |
| Codex (OpenAI) | `codex` | `.codex/skills/` | `~/.codex/` | Symlinks to `.agents/skills/` |
| GitHub Copilot | `copilot` | `.github/skills/` | `~/.github/copilot/` | Symlinks to `.agents/skills/` |
| Aider | `aider` | `.aider/skills/` | `~/.aider/` | Symlinks to `.agents/skills/` |
| Cline | `cline` | `.cline/skills/` | `~/.cline/` | Symlinks to `.agents/skills/` |
| Roo Code | `roo` | `.roo/skills/` | `~/.roo/` | Symlinks to `.agents/skills/` |

All agents are equal — each receives a symlink from the canonical `.agents/skills/` directory. No agent stores physical files.

---

## The --agents Flag

By default, HappySkills auto-detects which agents are installed and links to all of them. You can override this behavior:

**Target specific agents:**
```
npx happyskills install owner/name --agents claude,cursor -y --json
```

**Only Claude (disable linking to other agents):**
```
npx happyskills install owner/name --agents claude -y --json
```

**Set a permanent default via config (recommended):**
```
npx happyskills config agents claude                 # only Claude
npx happyskills config agents claude,cursor          # Claude + Cursor only
npx happyskills config agents --reset                # back to auto-detect
npx happyskills config agents --list                 # show all agents with status
```

Persists to `~/.config/happyskills/config.json`. No shell profile editing needed.

**Alternative: environment variable:**
```
export HAPPYSKILLS_AGENTS=claude          # only Claude
export HAPPYSKILLS_AGENTS=claude,cursor   # Claude + Cursor only
```

Add to `.zshrc` or `.bashrc` for persistence.

**Priority order:**
1. `--agents` flag (highest — per-command override)
2. `HAPPYSKILLS_AGENTS` environment variable
3. Config file (`~/.config/happyskills/config.json`)
4. Auto-detection (default — scan home directory)

---

## Commands That Support --agents

| Command | Multi-Agent Behavior |
|---|---|
| `install` | Links to detected agents after installing (respects disabled state — disabled skills are not re-linked) |
| `uninstall` | Removes symlinks from all agents |
| `update` | Re-links after updating (respects disabled state) |
| `refresh` | Re-links after refreshing (respects disabled state) |
| `setup` | Links the happyskills skill to detected agents |
| `enable` | Creates symlinks for specified skills in all detected agent folders |
| `disable` | Removes symlinks for specified skills from all agent folders |

---

## Enable / Disable Skills

Skills can be disabled without uninstalling them. Disabling removes the symlinks from agent folders while keeping the physical files in `.agents/skills/` and the lock file entry intact. This is useful when:

- You have too many skills and want to reduce context window pollution
- You want to temporarily hide a skill from agents without losing it
- You want to prevent accidental slash-command invocation of a skill you're not currently using

**How it works:**
- **Disable** removes symlinks from all agent folders (`.claude/skills/`, `.cursor/skills/`, etc.)
- **Enable** re-creates symlinks pointing back to `.agents/skills/`
- The canonical files and lock file are never modified — only symlinks change
- Disabled skills remain tracked in the lock file and can receive updates
- When a disabled skill is updated (via `install`, `update`, or `refresh`), it stays disabled — the CLI captures the disabled state before updating and does not re-create symlinks

**Detection:** A skill is considered "enabled" if it has at least one symlink in any detected agent folder. A skill with no symlinks anywhere is "disabled". The `list` command shows an Enabled column indicating this state.

```
npx happyskills disable deploy-aws monitoring --json    # disable multiple skills
npx happyskills enable deploy-aws --json                # re-enable
npx happyskills list --json                             # see enabled/disabled status
```

---

## JSON Output

When skills are linked to agents, the install JSON response includes a `linked_agents` field:

```json
{
  "data": {
    "skill": "owner/name",
    "version": "1.0.0",
    "installed": [...],
    "linked_agents": ["claude", "cursor", "windsurf"]
  }
}
```

If `linked_agents` is empty or absent, no agents were detected.

---

## Fallback Behavior

- **Symlinks preferred** — Fast, zero disk overhead, updates propagate instantly.
- **Copy fallback** — If symlinks fail (e.g., Windows without Developer Mode), HappySkills falls back to a physical copy in the agent's directory. This is the only scenario where files exist outside `.agents/skills/`. Even in this case, the canonical copy in `.agents/skills/` remains the source of truth tracked by the lock file.
- **Non-fatal** — If linking to an agent fails, the canonical install in `.agents/skills/` still succeeds. A warning is printed.
- **Lock file unchanged** — The lock file (`skills-lock.json`) exclusively tracks the canonical location (`.agents/skills/`). It has no knowledge of symlinks or agent directories.

---

## Examples

**User has Claude + Cursor installed:**
```
$ npx happyskills install acme/deploy-aws -y
  Installed 1 package(s)
  Linked to: Claude Code, Cursor
```

**User has Claude + Cursor + Windsurf installed:**
```
$ npx happyskills install acme/deploy-aws -y
  Installed 1 package(s)
  Linked to: Claude Code, Cursor, Windsurf
```

**User only wants Claude:**
```
$ npx happyskills install acme/deploy-aws --agents claude -y
  Installed 1 package(s)
  Linked to: Claude Code
```
