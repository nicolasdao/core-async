# Skill Workflows

## Common Procedures

These reusable procedures are referenced by multiple workflows below. Each workflow documents its unique steps inline and references these procedures for the shared parts.

### Optional Fields Prompt

Ask about each of the following fields individually. Do NOT skip any.

**a. `authors`** — Use AskUserQuestion to ask if the user wants to add authors. Suggest a format like `"Jane Doe <jane@acme.com>"`.

**b. `license`** — Use AskUserQuestion with these exact options in this order:
   1. **"MIT"** — Description: "Permissive. Do anything, just include the license text."
   2. **"BSD-3-Clause"** — Description: "Permissive with no-endorsement clause."
   3. **"Apache-2.0"** — Description: "Permissive with patent protection."
   4. **"Show me more"** — Description: "See all available licenses."

   If the user selects **"Show me more"**, display this reference table:

   **Permissive:**
   | SPDX ID | Description |
   |---------|-------------|
   | MIT | Do anything, just include the license text |
   | ISC | Functionally identical to MIT, shorter wording |
   | BSD-2-Clause | Two conditions — retain notice, no liability |
   | BSD-3-Clause | Like BSD-2 plus no-endorsement clause |
   | Apache-2.0 | Like MIT plus patent grant, must state changes |

   **Copyleft:**
   | SPDX ID | Description |
   |---------|-------------|
   | GPL-3.0-only | Strong copyleft — derivatives must also be GPL |
   | LGPL-3.0-only | Weaker copyleft — libraries can be linked from proprietary code |
   | MPL-2.0 | File-level copyleft — modified files stay MPL, rest can be proprietary |
   | AGPL-3.0-only | Like GPL but covers network/SaaS use |

   **Public Domain:**
   | SPDX ID | Description |
   |---------|-------------|
   | CC0-1.0 | Full public domain dedication, zero restrictions |
   | 0BSD | Public domain as a formal license |

   **Proprietary:**
   | Value | Description |
   |-------|-------------|
   | UNLICENSED | All rights reserved, no reuse allowed |

   Then use a second AskUserQuestion with:
   1. **"UNLICENSED"** — Description: "All rights reserved (private/internal skills)."
   2. **"GPL-3.0-only"** — Description: "Strong copyleft — derivatives must be GPL."
   3. **"MPL-2.0"** — Description: "File-level copyleft — modified files stay MPL."
   4. **"CC0-1.0"** — Description: "Public domain dedication, zero restrictions."

   The automatic "Other" option is available at both tiers for any SPDX identifier not listed.

   **After the user selects a license, generate a LICENSE file** in the skill directory:
   - **Copyright holder**: Reuse the `authors` value from the authors prompt above. If no authors were set, use AskUserQuestion to ask for a copyright holder name (person or company name — no legal registration numbers needed, just a name).
   - **Year**: Use the current year.
   - **License text**: Write the standard license text for the chosen SPDX identifier. For licenses that include a copyright line (MIT, ISC, BSD-2-Clause, BSD-3-Clause, 0BSD, UNLICENSED), insert `Copyright (c) [year] [name]` at the top. For licenses with standardized text and no copyright line in the body (Apache-2.0, GPL-3.0-only, LGPL-3.0-only, AGPL-3.0-only, MPL-2.0), write the standard text as-is. For CC0-1.0, write the standard dedication text.
   - Write the file as `LICENSE` (no extension) in the skill directory using the Write tool.

**c. `repository`** — Before asking, run `git remote get-url origin 2>/dev/null` to detect the current git remote URL.
   - If a remote URL is found, use AskUserQuestion with:
     1. **"Yes, use <detected-url>"** — Description: "Set repository to the detected git remote."
     2. **"No, skip"** — Description: "Don't set a repository URL."
   The automatic "Other" option lets the user enter a different URL.
   - If no remote URL is found, use AskUserQuestion with:
     1. **"Enter a URL"** — Description: "Provide a repository URL manually."
     2. **"Skip"** — Description: "Don't set a repository URL."

### Invocation Model Confirmation

When an enrichment workflow needs to confirm the user's invocation preference, present these two options via AskUserQuestion:

- **"Auto-invoke (Recommended)"** — Claude automatically invokes the skill when relevant. Best for most skills.
- **"User-only (/slash command)"** — Only the user can trigger it via `/skill-name`. Claude will not know the skill exists and cannot invoke it automatically. Recommended only for destructive operations like deployments, releases, or deletes.

**Default to auto-invoke.** The action depends on the skill's current state:
- **New skill** (Post-Init): Do NOT add the `disable-model-invocation` flag. NEVER set it without asking.
- **Existing skill** (Post-Convert, Post-Fork): Remove the `disable-model-invocation: true` flag if present. NEVER keep it without confirming.

### Workspace Resolution

Resolve the target workspace for publishing by running `npx happyskills whoami --json`: if one workspace use it, if multiple check `skills-lock.json` (in the project root) for a `<slug>/<skill-name>` key and use the matching workspace, if zero or multiple matches ask the user via AskUserQuestion.

### First-Time Publish

Use this procedure when publishing a skill for the first time (Post-Init, Post-Convert, Kit Creation). For releasing updates to already-published skills, use the Skill Release Workflow instead.

1. **Authenticate** — Run the auth flow (Section 2 of SKILL.md).
2. **Resolve workspace** — Run the **Workspace Resolution** procedure (see above).
3. **Visibility** — Ask with exactly these options in this order:
   1. **"Private (Recommended)"** — MUST be the FIRST option. Description: "Only visible to members of your workspace."
   2. **"Public"** — MUST be the SECOND option. Description: "Visible in the public catalog to all users."
   NEVER present "Public" as the first or default option.
4. **Publish** — Run the appropriate command (ALWAYS include `--workspace`):
   - Private: `npx happyskills publish <skill-name> --workspace <slug> --json`
   - Public: `npx happyskills publish <skill-name> --workspace <slug> --public --json`

---

## Post-Init Enrichment

After the authoring workflow (Section 7, steps 1–9) completes, the skill has a well-designed SKILL.md but its `skill.json` only has `name` and `version`. Run this enrichment workflow to complete the HappySkills ecosystem metadata and make the skill publish-ready.

1. **Read the SKILL.md** — Understand what the skill does, its domain, and its target audience.
2. **MANDATORY — Verify SKILL.md frontmatter has `name` and `description`** — The authoring workflow (step 6) should have set these, but verify they are present and non-empty. If the `description` is still the placeholder ("Describe what this skill does and when to invoke it"), replace it with a proper keyword-rich description following the formula: `[action verb] + [specific domain] + [use case] + [natural trigger phrases]`. Use only safe characters (no semicolons, colons, or other forbidden YAML characters). Ask the user to confirm. This step is NON-NEGOTIABLE — the CLI will warn on publish if description is missing.
3. **Write skill.json `description`** — A concise summary (under 200 chars) optimized for registry search. This is different from the SKILL.md `description` which targets Claude auto-invocation.
4. **Suggest `keywords`** — Based on the skill's content, propose canonical slugs (e.g., `deployment`, `testing`, `api`) plus any relevant custom keywords. Use AskUserQuestion to confirm.
5. **Detect system dependencies** — If the SKILL.md references external CLIs (e.g., `docker`, `aws`, `terraform`, `kubectl`), suggest adding `systemDependencies` to skill.json. For format rules and platform-specific install commands, see [happyskills-conventions.md § 4](happyskills-conventions.md).
6. **Detect skill dependencies** — If the SKILL.md references other published HappySkills skills, suggest adding them to `dependencies`.
7. **Prompt for optional fields** — Run the **Optional Fields Prompt** procedure (see Common Procedures above).
8. **Confirm invocation model** — Check whether the SKILL.md has `disable-model-invocation: true`, or if you're about to set it. Run the **Invocation Model Confirmation** procedure (see Common Procedures above). For new skills, the action is "do not add the flag."
9. **Initialize CHANGELOG.md** — If none exists, create one with the initial version entry.
10. **Check for embedded executable code** — Scan SKILL.md and any files in `references/` for code blocks that contain executable logic intended to be run as part of the skill's workflow (not documentation examples or code patterns). All executable code MUST be in `scripts/` as actual files — code in markdown is only for documentation and examples. If executable code is found embedded in markdown, extract it into `scripts/` and replace the code block with a reference: `${CLAUDE_SKILL_DIR}/scripts/<filename>`. Use AskUserQuestion to confirm the extraction.
11. **Run validation (MANDATORY)** — Run `npx happyskills validate <skill-name> --json`. If `data.valid` is `false`, fix all errors before proceeding — if an error includes a `recommendations` array, follow those steps in order and exactly as written; otherwise, for description `max_length` errors, apply the fallback procedure from Section 5 of the SKILL.md. Present warnings to the user. This is the final quality gate — do NOT skip it.
12. **Optional publish** — Use AskUserQuestion to ask: "Would you like to publish this skill now, or test it first?" with options:
   1. **"Publish now"** — Run the **First-Time Publish** procedure (see Common Procedures above).
   2. **"Test first"** — Done. Tell the user they can publish later with `happyskills publish <skill-name>`.

## Post-Convert Enrichment

After `happyskills convert` succeeds, the skill has a basic `skill.json` (name, version, workspace) but is **not yet published** — it is missing the metadata that makes it discoverable, well-documented, and publish-ready. Run this enrichment workflow automatically after every conversion, then publish as the final step.

**Important**: Do NOT alter the SKILL.md body content — it is the user's original work. Only enrich `skill.json`, add supplementary HappySkills files, and ensure SKILL.md frontmatter has the required fields.

1. **Read the SKILL.md** — Understand what the skill does, its domain, and its target audience.
2. **MANDATORY — Ensure SKILL.md frontmatter has `name` and `description`** — Check if the SKILL.md has a YAML frontmatter block (`---`). If NOT, you MUST add one. If it exists but is missing `name` or `description`, you MUST add the missing fields. The `description` is the #1 factor for Claude auto-invocation quality — without it, the skill will silently fail to trigger. Write a keyword-rich description following the formula: `[action verb] + [specific domain] + [use case] + [natural trigger phrases]`. Use only safe characters (no semicolons, colons, or other forbidden YAML characters). Ask the user to confirm the description before writing it. This step is NON-NEGOTIABLE — do not skip it under any circumstances.
3. **Write skill.json `description`** — A concise summary (under 200 chars) optimized for registry search. This is different from the SKILL.md `description` which targets Claude auto-invocation.
4. **Suggest `keywords`** — Based on the skill's content, propose canonical slugs (e.g., `deployment`, `testing`, `api`) plus any relevant custom keywords. Use AskUserQuestion to confirm.
5. **Detect system dependencies** — If the SKILL.md references external CLIs (e.g., `docker`, `aws`, `terraform`, `kubectl`), suggest adding `systemDependencies` to skill.json. For format rules and platform-specific install commands, see [happyskills-conventions.md § 4](happyskills-conventions.md).
6. **Detect skill dependencies** — If the SKILL.md references other published HappySkills skills, suggest adding them to `dependencies`.
7. **Prompt for optional fields** — Run the **Optional Fields Prompt** procedure (see Common Procedures above).
8. **Confirm invocation model** — Check whether the SKILL.md has `disable-model-invocation: true`. If it does, run the **Invocation Model Confirmation** procedure (see Common Procedures above). For existing skills, the action is "remove the flag."
9. **Initialize CHANGELOG.md** — If none exists, create one with the initial version entry.
10. **Run validation (MANDATORY)** — Run `npx happyskills validate <skill-name> --json`. If `data.valid` is `false`, fix all errors before proceeding to publish — if an error includes a `recommendations` array, follow those steps in order and exactly as written; otherwise, for description `max_length` errors, apply the fallback procedure from Section 5 of the SKILL.md. Present warnings to the user. Do NOT publish a skill that fails validation.
11. **Publish to the registry** — This is the first publish — `convert` no longer auto-publishes. Run the **First-Time Publish** procedure (see Common Procedures above).

## Post-Fork Enrichment

After `happyskills fork` succeeds, the forked skill has its version reset to `0.1.0` and dependencies cleared. Run this enrichment automatically after every fork.

1. **Read the forked SKILL.md** — Understand what the original skill does.
2. **MANDATORY — Ensure SKILL.md frontmatter has `name` and `description`** — Check if the forked SKILL.md has a YAML frontmatter block (`---`) with both `name` and `description`. If either is missing or empty, you MUST add them. The `description` is the #1 factor for Claude auto-invocation quality — without it, the skill will silently fail to trigger. The fork may serve a different purpose than the original, so ask the user what they plan to change and write an appropriate description. Use only safe characters (no semicolons, colons, or other forbidden YAML characters). This step is NON-NEGOTIABLE.
3. **Write skill.json `description`** — A concise summary (under 200 chars) optimized for registry search. This is different from the SKILL.md `description` which targets Claude auto-invocation.
4. **Suggest `keywords`** — Propose canonical slugs based on the skill's content. Use AskUserQuestion to confirm.
5. **Re-evaluate dependencies** — The original skill's dependencies were cleared. Read the SKILL.md to detect if it references other skills or external CLIs, and suggest re-adding the relevant `dependencies` and `systemDependencies`. For system dependency format rules, see [happyskills-conventions.md § 4](happyskills-conventions.md).
6. **Prompt for optional fields** — Run the **Optional Fields Prompt** procedure (see Common Procedures above).
7. **Confirm invocation model** — Check whether the forked SKILL.md has `disable-model-invocation: true`. If it does, run the **Invocation Model Confirmation** procedure (see Common Procedures above). For forked skills, the action is "remove the flag."
8. **Initialize CHANGELOG.md** — Create one with a `0.1.0` entry noting it was forked from the original (include `forked_from` info).
9. **Run validation** — Run `npx happyskills validate <skill-name> --json`. If `data.valid` is `false`, fix all errors — if an error includes a `recommendations` array, follow those steps in order and exactly as written; otherwise, for description `max_length` errors, apply the fallback procedure from Section 5 of the SKILL.md. Present warnings to the user. This ensures the forked skill is in a valid state before the user starts modifying it.

## Skill Release Workflow

When the user wants to release/ship a skill update, run this end-to-end pipeline. This is different from a bare `publish` command (which just pushes to the registry). The release workflow is the intelligent, full-lifecycle process.

**1. Identify the skill and read current state**

- Locate the skill directory and read its `skill.json` to get the current version.
- Read the existing `CHANGELOG.md` (if any) to understand what's already been documented.

**2. Analyze changes**

Review what changed since the last release. Use multiple sources:
- Conversation context (what the LLM did in this session)
- `git diff` and `git log` within the skill directory (if in a git repo)
- File modification timestamps

Classify each change:

| Change Type | Bump | Examples |
|---|---|---|
| Bug fixes, typos, corrections | `patch` | Fixed typo in description, fixed broken command |
| New features, new sections, new capabilities | `minor` | Added new command support, added authoring mode |
| Breaking changes | `major` | Changed invocation model, restructured frontmatter, removed features, renamed skill |

**3. Propose bump type and confirm**

Present the inferred bump type with reasoning. Use AskUserQuestion to let the user confirm or override:
- "Based on the changes (added X, fixed Y), I recommend a **minor** bump (1.0.0 → 1.1.0). Does that look right?"

**4. Pre-release validation (MANDATORY)**

Before bumping, run `npx happyskills validate <skill-name> --json` to verify the skill is publish-ready. This checks all rules deterministically: SKILL.md existence, frontmatter fields (name, description, optional fields), line count, skill.json fields (name, version, description, keywords, dependencies, systemDependencies), cross-file name consistency, and executable code detection.

- If `data.valid` is `false` → fix all errors before proceeding. If an error includes a `recommendations` array, follow those steps in order and exactly as written; otherwise, for description `max_length` errors, apply the fallback procedure from Section 5 of the SKILL.md. Do NOT bump or publish a skill that fails validation.
- If `data.valid` is `true` but there are warnings → present them to the user. Warnings are advisory and do not block the release.
- Additionally review content quality manually: the SKILL.md `description` should be keyword-rich (not a placeholder), and the skill should be well-structured.

**If validation fixes modified skill files** (e.g., refactoring SKILL.md to reduce line count, rewriting the description, extracting content to references), those fixes are additional changes that MUST be handled:
- **Record what changed** — Note which files were modified and what was done (e.g., "extracted references to reduce SKILL.md below 500 lines", "compressed description to meet max_length").
- **Re-evaluate the bump type** — Return to step 3 and reconsider: the original bump type (from the user's intentional changes) typically still applies since validation fixes are corrective. However, if the fix involved significant structural refactoring (e.g., splitting a file, reorganizing sections), consider whether the bump should be elevated.
- **Include fixes in CHANGELOG** — In step 6, document both the original changes AND the validation fixes. Validation fixes typically go under `### Fixed` or `### Changed`.
- **Re-run validation** — After fixing, always re-run `npx happyskills validate` to confirm the fix resolved the error without introducing new ones. Repeat this cycle until validation passes cleanly.

**5. Bump the version**

```bash
npx happyskills bump <patch|minor|major> <skill-name> --json
```

Parse the response to get the new version number.

**6. Update CHANGELOG.md**

Write a new entry at the top of the changelog (below the `# Changelog` heading), following the Keep a Changelog format:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New feature descriptions

### Changed
- Modifications to existing features

### Fixed
- Bug fix descriptions

### Removed
- Removed feature descriptions
```

Only include the groups (`### Added`, `### Changed`, `### Fixed`, `### Removed`) that have entries. If `CHANGELOG.md` does not exist, create it with the `# Changelog` heading and the new entry.

**7. Resolve workspace and publish**

First, run the **Workspace Resolution** procedure (see Common Procedures above).

Show a summary of what will be published:
- Skill name and workspace
- Version: old → new
- Changes (from changelog entry)

Use AskUserQuestion for final confirmation. Do NOT ask about visibility — this is an update to an existing skill, so the server preserves the existing visibility automatically. Then run (ALWAYS include `--workspace`):

```bash
npx happyskills publish <skill-name> --workspace <slug> --json
```

Parse and present the result: "Published owner/name@X.Y.Z to the registry."

## Kit Creation Workflow

When the user wants to create a kit (a meta-package that bundles multiple skills as dependencies), run this guided workflow. This replaces the bare `init --kit` command with an intelligent, LLM-assisted experience.

**Step 1: List installed skills**

Run `npx happyskills list --json` and parse the response. Extract all skills from `data.skills` (managed) and `data.external` (external). Display a formatted numbered list showing: number, owner/name, version, and description (from skill.json if readable). If no skills are installed, tell the user they need installed skills to create a kit and stop.

**Step 2: Search cloud registry (optional)**

After showing installed skills, ask the user: "Would you also like to search the HappySkills registry for additional skills to include?"

If yes:
1. Ask what kind of skills they're looking for (or infer from already-selected local skills)
2. Run `npx happyskills search "<query>" --json`
3. Present top results as a numbered list with owner/name, description, version
4. User picks by numbers/names (or "none")
5. Merge cloud picks into the selection pool (alongside local skills)
6. Ask "Search for more?" — repeat until done

If no: proceed to the next step.

Cloud-selected skills don't need to be locally installed — they go directly into the kit's `dependencies` map. The version range uses the version from search results (e.g., `^major.minor.0`).

**Step 3: User selects skills for the kit**

Present the combined list (local + cloud-selected) and ask the user which skills they'd like to bundle into the kit. The user can respond with numbers, names, natural language descriptions ("the React and database ones"), or "all". Confirm the selection by listing the chosen skills back to the user. Allow the user to add or remove from the selection before proceeding.

**Step 4: Inspect selected skills**

For each selected skill, read its `SKILL.md` and `skill.json` from the installed directory (`.claude/skills/<owner>/<name>/` or `.claude/skills/<name>/`). For cloud-selected skills that are not locally installed, use the metadata from the search results. Extract: name, description (from both SKILL.md frontmatter and skill.json), keywords, tags, version. Build a summary of what each skill does.

**Step 5: Infer kit name and description**

Analyze the commonalities across selected skills (shared keywords, related domains, complementary purposes). Suggest a kit name starting with `_kit-` (lowercase-with-hyphens, descriptive of the collection). Draft a description that explains what the kit provides as a whole — not just listing the skills, but describing the capability the bundle enables. Ask the user for an optional brief using AskUserQuestion:
1. **"Use your suggestion"** — Description: "Go with the LLM-inferred name and description."
2. **"I have a brief"** — Description: "Provide context to guide the name and description."

If the user provides a brief, incorporate it and regenerate the name and description.

**Step 6: Choose version strategy**

Before presenting the final review, ask the user how the kit should handle skill versions. Use AskUserQuestion:
1. **"Pin to current versions (Recommended)"** — Description: "The kit installs the same versions you have today. You control when to upgrade. Best if you want stability and predictability."
2. **"Always use the latest"** — Description: "The kit always installs the newest version of each skill, even if they change significantly. Best if you want your kit to stay current automatically."

Explain the difference in friendly terms before asking:
- **Pin to current versions**: "This locks each skill to a version range based on what you have installed right now (e.g., `^1.2.0` means any update within version 1.x). Your kit will keep working the same way until you decide to upgrade."
- **Always use the latest**: "This tells the kit to grab whatever the newest version is every time someone installs it (using `*`). The skills may change over time, but you'll always get the latest and greatest."

Store the user's choice:
- **Pin** → use `^major.minor.0` ranges (based on the installed version from `happyskills list`; for cloud-selected skills, use the version from search results)
- **Always latest** → use `*` for every dependency

**Step 7: Review and iterate**

Present the proposed kit to the user:
- Name
- Description
- Skills included (with version ranges based on the strategy chosen in step 6)

Use AskUserQuestion:
1. **"Looks good"** — Proceed to creation.
2. **"Change the name"** — Let user provide a new name.
3. **"Refine the description"** — User gives feedback, LLM regenerates.
4. **"Change the skills"** — Go back to step 3.

Loop until the user selects "Looks good".

**Step 8: Create the kit**

Run `npx happyskills init <kit-name> --kit --json` to scaffold the directory. The CLI auto-prepends `_kit-` if the user omits it. Read the generated `skill.json`. Update it with:
- `description`: the approved description
- `keywords`: inferred from the selected skills' keywords + `"kit"`
- `dependencies`: map of `owner/name` → version range for each selected skill, using the strategy from step 6 (`^major.minor.0` for pinned, `*` for always-latest)

Write the updated `skill.json` using the Edit tool.

**Step 9: Write kit SKILL.md**

Replace the scaffolded SKILL.md with a proper kit description (NO frontmatter — kits use plain markdown):
- Kit name as heading
- "This is a kit — a curated collection of skills installed together in one command."
- "What's Included" section listing each skill with a brief description
- "When to Use" section based on the inferred purpose
- Install command example

**Step 10: Run Kit Enrichment (streamlined)**

Skip steps that don't apply to kits: frontmatter verification, invocation model, system dependencies, skill dependencies (already populated), executable code check. Run only the applicable enrichment steps:

1. **Prompt for optional fields** — Run the **Optional Fields Prompt** procedure (see Common Procedures above).
2. **Initialize CHANGELOG.md** — Create with the initial version entry.
3. **Run validation** — `npx happyskills validate <kit-name> --json`. Fix errors before proceeding — if an error includes a `recommendations` array, follow those steps in order and exactly as written.
4. **Optional publish** — Use AskUserQuestion: "Would you like to publish this kit now, or test it first?" with options:
   1. **"Publish now"** — Run the **First-Time Publish** procedure (see Common Procedures above).
   2. **"Test first"** — Done. Tell the user they can publish later.

## Skill Update Workflow

When the user wants to update an existing skill based on session learnings, new requirements, or feedback. This workflow ensures the update is done in one cohesive pass — merging intent, context, and best practices — rather than requiring a separate review cycle afterward.

**When to enter this workflow:** The user says things like "update this skill", "improve this skill based on what we just did", "apply what we learned to the skill", "the skill should handle X now", "refine this skill", "enhance this skill", or references updating a specific skill's content.

**Key distinction:** This workflow is for updating skill **content** (SKILL.md body, references, frontmatter, skill.json metadata). It is NOT for CLI package operations like `happyskills update` (which downloads newer versions from the registry). If the user says "update acme/deploy-aws", disambiguate: are they asking to download a newer version (CLI `update` command) or to modify the skill's content?

### Phase 1 — Pre-flight

1. **Identify the target skill** — Determine which skill to update. If the user says "this skill" or "the skill we just used", identify it from the session context (which skill was invoked, which skill directory was being worked on). If ambiguous, use AskUserQuestion to clarify.

2. **Divergence check** — Run `npx happyskills status <skill> --json` to check the skill's state. Act based on the result:

   | Status | Action |
   |---|---|
   | `clean` or `modified` | Safe to proceed. |
   | `outdated` | Run `npx happyskills pull <skill> --json` (fast-forward) before making changes. |
   | `diverged` | Run `npx happyskills pull <skill> --json` to merge. Resolve conflicts if any. Then proceed. |
   | `conflicts` | Unresolved conflicts from a prior pull. Must resolve before updating. Guide the user through resolution. |

   **Why this matters:** Skipping the divergence check risks making changes on a stale base. When you later try to publish, the server rejects with DIVERGED, forcing a pull + merge that may conflict with your freshly-written content.

3. **Read current skill state** — Read the skill's SKILL.md, skill.json, CHANGELOG.md, and scan the directory structure (Glob for `references/`, `scripts/`, etc.). Understand the current architecture before changing anything.

### Phase 2 — Analysis

4. **Understand the update requirement** — Gather the full picture from multiple sources:
   - **Session context** — What did the user do in this session? What problems were encountered? What worked well? What did the skill fail to handle?
   - **Explicit request** — What exactly is the user asking to change or improve?
   - **Observed gaps** — Based on the session, are there missing trigger phrases, missing workflows, incorrect instructions, or structural issues?

   If the requirement is unclear or broad, use AskUserQuestion to prioritize: "I see several possible improvements. Which should I focus on?"

5. **Load best practices** — Read the authoring references to ensure changes comply with all conventions:
   - [references/skill-authoring.md](skill-authoring.md) — Claude Code spec (frontmatter, invocation models, description formula, forbidden characters, anti-patterns)
   - [references/happyskills-conventions.md](happyskills-conventions.md) — HappySkills superset (skill.json, keywords, naming, publishing checklist)

### Phase 3 — Implementation

6. **Design the changes** — Before writing any files, plan what changes are needed. Consider:
   - Does the **description** need new trigger phrases? (Use the formula: action verb + domain + use case + natural trigger phrases)
   - Does the **routing table** need new entries? (If the skill has a routing section)
   - Does the **SKILL.md body** need new sections, updated instructions, or restructured content?
   - Do **reference files** need to be created, updated, or reorganized?
   - Does **skill.json** metadata need updates (keywords, description, dependencies)?
   - Will the changes push SKILL.md over 500 lines? If so, extract content to references.

7. **Apply changes** — Use the Edit tool to modify files. Follow these rules:
   - **Preserve existing structure** — Don't reorganize the entire skill unless the user asked for it. Surgical changes are better than rewrites.
   - **Forbidden characters** — Scan all frontmatter values for semicolons, colons, brackets, and other forbidden YAML characters.
   - **Line limits** — SKILL.md must stay under 500 lines. Supporting files should stay under 400 lines each (split by topic if larger).
   - **Supporting file organization** — New reference content goes in `references/`, new scripts in `scripts/`, new templates in `assets/` or `templates/`.
   - **Consistent cross-references** — If you add a new reference file, add a conditional link in SKILL.md ("Read X if Y").
   - **DRY** — If your changes introduce content that duplicates something already in another file, extract the common content to a single location and reference it. See [skill-authoring.md § 9, Best Practice #13](skill-authoring.md) for the full rule.

### Phase 4 — Validation and Release

8. **Validate** — Run `npx happyskills validate <skill-name> --json`. If `data.valid` is `false`, fix all errors — if an error includes a `recommendations` array, follow those steps in order and exactly as written; otherwise, for description `max_length` errors, apply the fallback procedure from Section 5 of the SKILL.md. Present warnings to the user.

9. **Offer to release** — Use AskUserQuestion: "The skill has been updated. Would you like to release this update now, or continue working?"
   - **"Release now"** — Proceed to the **Skill Release Workflow** (above). This handles: change analysis, semver bump proposal, CHANGELOG update, workspace resolution, and publish.
   - **"Continue working"** — Done. The changes are applied locally. Remind the user they can release later with "release my skill" or `/happyskills release my skill`.

## Skill Audit Workflow

When the user wants a quality review of an existing skill — checking for best practice compliance, structural issues, and content quality. This works on both HappySkills-managed skills and external (unconverted) skills.

**When to enter this workflow:** The user says things like "audit this skill", "review skill for best practices", "check skill quality", "is this skill well designed", "skill health check", "does this skill follow best practices", or asks for a comprehensive review of a skill's structure and content.

**Key distinction:** An audit is a **read-only diagnostic** — it identifies issues and recommends fixes but does not modify files. If the user wants fixes applied, transition to the Skill Update Workflow after presenting the audit results.

### Phase 1 — Identify and Read

1. **Identify the target skill** — Determine which skill to audit. If ambiguous, use AskUserQuestion to clarify. The skill can be a HappySkills-managed skill (has skill.json) or an external/unconverted skill (only has SKILL.md).

2. **Read the full skill** — Read every file in the skill directory: SKILL.md, skill.json (if present), all files in `references/`, `scripts/`, `assets/`, and any other directories. Build a complete picture of the skill's structure.

3. **Load best practices** — Read the authoring references:
   - [skill-authoring.md](skill-authoring.md) — Claude Code spec (frontmatter, invocation models, description formula, forbidden characters, best practices, anti-patterns)
   - [happyskills-conventions.md](happyskills-conventions.md) — HappySkills superset (skill.json, keywords, naming, dependencies)

### Phase 2 — Automated Checks

4. **Run validate** (if HappySkills-managed) — Run `npx happyskills validate <skill-name> --json`. Record all errors and warnings.

### Phase 3 — Manual Quality Review

Check each of the following areas. For each issue found, note the file, location, and specific recommendation.

5. **Description quality** — Is the SKILL.md `description` keyword-rich, following the formula (action verb + domain + use case + trigger phrases)? Does it cover multiple phrasing families (imperative, question, past tense)? Are there forbidden characters? Is it under 1024 chars? If above 850 chars, check for mega-skill symptoms (keyword density, synonym redundancy, coverage gaps) and recommend a strategy (compress, decompose, or hybrid). For the full guide, see [skill-authoring.md § 5](skill-authoring.md).

6. **Frontmatter completeness** — Are `name` and `description` present? Is `allowed-tools` set appropriately? Is `disable-model-invocation` set correctly for the skill's purpose? See [skill-authoring.md § 3-4](skill-authoring.md).

7. **Content structure** — Is SKILL.md under 500 lines? Are supporting files under 400 lines each? Is content organized into `references/`, `scripts/`, `assets/` appropriately? Are there files dumped at root that should be in subdirectories? See [skill-authoring.md § 7](skill-authoring.md).

8. **DRY compliance** — Scan all files for content that appears in more than one file or more than once within the same file. For each duplication found, classify it before flagging:

   **Must deduplicate** (report as warning):
   - Identical tables, procedures, or rule blocks copy-pasted across files with no contextual differences
   - Content that has already drifted between copies (a sign that sync is failing)

   **Acceptable co-location** (do NOT flag):
   - Agent prompt templates embedded in the workflow step that spawns them — these must be immediately available in the execution context, not behind a reference hop
   - Short contextual reminders (1-2 lines) restating a critical safety constraint in a workflow step
   - Content in SKILL.md that overlaps with a reference file but is tuned for the executing LLM (SKILL.md serves the agent at runtime, reference files serve human readers or on-demand loading — these are different audiences)
   - Any overlap where SKILL.md is under the 500-line limit and deduplicating would force the agent to read across multiple files mid-workflow

   **Guiding principle:** DRY is a means to maintainability, not an end in itself. When deduplicating would degrade execution reliability (by adding indirection hops the agent may fail to follow), the duplication is the better trade-off. See [skill-authoring.md § 9, Best Practice #13](skill-authoring.md).

9. **Anti-pattern scan** — Check against the full anti-pattern list in [skill-authoring.md § 10](skill-authoring.md): vague description, oversized files, missing constraints section, missing verification steps, executable code in markdown, deeply nested references, etc.

10. **skill.json completeness** (if HappySkills-managed) — Are `description`, `keywords`, `dependencies`, and `systemDependencies` set correctly? Does the skill.json `description` differ from the SKILL.md `description` (they serve different purposes)? See [happyskills-conventions.md § 2-4](happyskills-conventions.md).

### Phase 4 — Report and Offer Fixes

11. **Present the audit report** — Summarize findings grouped by severity:
    - **Errors** — Issues that break functionality (missing description, forbidden characters, oversized files)
    - **Warnings** — Issues that degrade quality (vague description, DRY violations, missing constraints)
    - **Suggestions** — Improvements that would strengthen the skill (better trigger phrases, file reorganization)

    For each issue, provide the specific file, the problem, and the recommended fix.

12. **Offer to fix** — Use AskUserQuestion: "Would you like me to fix these issues now?"
    - **"Yes, fix all"** — Transition to the Skill Update Workflow to apply all fixes.
    - **"Fix errors only"** — Apply only error-level fixes.
    - **"No, just the report"** — Done. The user can act on the report manually or later.
