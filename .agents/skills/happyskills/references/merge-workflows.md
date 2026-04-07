# Merge & Sync Workflows

Detailed playbooks for diagnosing and resolving merge-related scenarios. SKILL.md Section 10 has the quick decision tree — this file has the full procedures.

---

## Status Diagnosis Guide

Run `npx happyskills status <skill> --json` to get the current state. The `status` field tells you what to do:

### clean — No changes anywhere

Local files match the base integrity hash. Remote head matches `base_commit`. Nothing to do. If the user wants to publish, they just need to bump the version first.

### modified — Local changes only

The user has edited files since install. Remote hasn't changed. Safe to publish — the server will accept the push because `base_commit` still matches the remote head.

### outdated — Remote changed, no local edits

Someone else published a new version. Local files haven't been touched. Run:

```
npx happyskills pull <skill> --json
```

This will fast-forward — replace local files with the remote version. No merge needed. After pull, `base_commit` is updated to the new remote head.

### diverged — Both local AND remote changed

This is the key scenario the merge system was built for. Both sides have changes that need to be combined. Run:

```
npx happyskills pull <skill> --json
```

Three possible outcomes:
1. **All files auto-merge cleanly** → status is `merged`. Lock stores `merge_parents`. Next publish creates a merge commit. Done.
2. **Some files have conflicts** → status is `conflicts`. Conflict markers written to affected files. See the Conflict Resolution section below.
3. **skill.json has field-level suggestions** → `json_conflicts` array lists fields where the merge made a default choice. Review these — they're suggestions, not errors.

### conflicts — Unresolved markers from a prior pull

The `conflict_files` array in the status response lists which files have unresolved merge conflict markers (LOCAL/REMOTE boundary lines). The user must resolve these before publishing.

**Important**: Publishing is blocked when conflict markers are present — even with `--force`. The `--force` flag bypasses the divergence check, not the conflict validation.

**Merge state preservation**: The `install`, `update`, and `refresh` commands do NOT modify `merge_parents` or `conflict_files` in the lock. Only `pull` and `publish` manage these fields. This means a pending merge state survives other operations — the user won't lose their merge progress by installing another skill.

---

## Pull Workflow Playbook

### When to Pull

- Before publishing a skill that shows `outdated` or `diverged` status
- When the user asks to sync, merge, or get remote changes
- After a publish returns `DIVERGED` error

### Fast-Forward Path

Triggered when local files have no modifications (or `--force` is used). The CLI replaces all files with the remote version and updates the lock:
- `base_commit` → remote head
- `base_integrity` → recalculated
- No `merge_parents` stored
- Any previous `conflict_files` or `merge_parents` cleared

### Three-Way Merge Path

Triggered when both local and remote have changes and no `--force` flag. The CLI:

1. Downloads the base tree (at `base_commit`), local files (on disk), and remote tree (at remote head)
2. Classifies each file: local-only modified, remote-only modified, both-modified, added, deleted, renamed
3. Applies non-conflicting changes automatically:
   - Remote-only changes → applied to disk
   - Local-only changes → kept as-is
   - Renamed files → detected by SHA match, applied as rename
4. Merges both-modified files:
   - **Text files** → three-way merge using `node-diff3`. If clean → merged text written. If conflicts → conflict markers written.
   - **skill.json** → structured JSON merge. Always produces valid JSON. Field-level conflicts go to `json_conflicts` (suggestions, not markers).
   - **CHANGELOG.md** → section-aware merge. Preserves remote history, prepends local sections.
5. Updates the lock:
   - `base_commit` → remote head
   - `base_integrity` → recalculated from merged files
   - If no conflicts: `merge_parents = [old_base_commit, remote_head]`
   - If conflicts: `conflict_files = [list of files with markers]`, no `merge_parents`
6. Runs dependency reconciliation — if the merged `skill.json` introduces new dependencies, they're installed automatically. Existing deps outside new constraint ranges trigger warnings (or errors with `--strict`).

### Choosing a Pull Strategy

| Situation | Recommended Strategy |
|---|---|
| User wants to keep all their work and get remote changes | No flag (auto-merge) |
| User doesn't care about their local changes | `--force` |
| User wants remote version for all conflicts | `--theirs` |
| User wants to keep their version for all conflicts | `--ours` |
| Different strategy per file | `--theirs file1,file2 --ours file3` |
| Need to understand what changed before deciding | Run `diff --full` first, then pull with strategy |

---

## Conflict Resolution Guide

### What Conflict Markers Look Like

When auto-merge cannot cleanly combine changes on the same lines, the file gets three markers:

- Line starting with `<< LOCAL` (7 angle brackets + space + LOCAL) — marks the start of the local version
- Line with `==` (7 equals signs) — separates local from remote
- Line starting with `>> REMOTE` (7 angle brackets + space + REMOTE) — marks the end of the remote version

The user must edit the file to keep the version they want (or combine both) and remove all three marker lines.

### Resolution Options

**Option 1 — Manual edit**: Open the file, read both versions, decide which to keep (or write a combination), remove the markers.

**Option 2 — Re-pull with strategy**: Run pull again with `--theirs` or `--ours` to resolve all remaining conflicts in one direction:

```
npx happyskills pull <skill> --theirs --json
npx happyskills pull <skill> --ours --json
```

**Option 3 — Per-file strategy**: If some files should take remote and others should keep local:

```
npx happyskills pull <skill> --theirs SKILL.md --ours references/custom.md --json
```

### After Resolution

Once all conflict markers are removed from files:
- Run `npx happyskills status <skill> --json` to verify status is no longer `conflicts`
- The lock's `conflict_files` is cleared on the next successful pull
- Publish creates a single-parent commit (rebase semantics — no merge commit when conflicts were involved)

### skill.json Merge Suggestions

The `json_conflicts` array contains field-level suggestions from the structured JSON merge. These are NOT conflict markers — skill.json is always valid JSON after merge. They're advisory notes like:

```json
{ "field": "description", "suggestion": "Remote changed description; local had no change — remote value used" }
```

Present these to the user for review. They may want to adjust the merged skill.json.

---

## Publish After Merge

### Normal Flow (clean auto-merge)

1. Pull auto-merges cleanly → `merge_parents` stored in lock
2. User bumps version, updates CHANGELOG
3. Publish sends `merge_parents` as `parent_shas` → server creates merge commit with two parents
4. Lock updated: `base_commit` = new commit, both `merge_parents` and `conflict_files` cleared

### Conflict Flow (rebase semantics)

1. Pull writes conflict markers → `conflict_files` stored in lock, no `merge_parents`
2. User resolves markers manually
3. User bumps version, updates CHANGELOG
4. Publish sends no `parent_shas` → server creates normal single-parent commit
5. History shows linear progression, not a merge

### TOCTOU — Remote Changes During Pull-to-Publish Window

Rare but possible: someone publishes between your pull and your publish.

1. You pull → clean merge, `merge_parents = [A, B]`
2. Carol publishes C (parent B). Remote head → C.
3. You publish → server checks `base_commit (B) = current_head (C)` → `B ≠ C` → **409 DIVERGED**
4. You pull again → new merge, `merge_parents = [B, C]`
5. You publish → succeeds, merge commit M created

**How the skill should handle this**: If publish returns DIVERGED after you already pulled, automatically run pull again, then re-attempt publish. Tell the user: "Someone published while you were preparing — pulled the latest changes and re-publishing."

---

## Using --full-report for AI Review

The `--full-report` flag (requires `--json`) enriches pull output for intelligent merge review:

```
npx happyskills pull owner/name --json --full-report
```

Each file entry in `report.files` includes:
- `base_content` — the common ancestor version
- `local_content` — what the user had locally
- `remote_content` — what the remote has
- `merged_content` — the result after merge

The response also includes `resolution_steps` — an array of action-typed steps:
- `resolve_conflict_markers` — files with markers that need manual resolution
- `review_json_suggestions` — auto-applied JSON field defaults to verify
- `semantic_review` — all modified/added files to check for cross-file logical contradictions
- `verify` — run `happyskills status` to confirm resolution

**When to use**: Use `--full-report` when you need to reason about the merge — e.g., checking if the merged SKILL.md still makes logical sense after combining two sets of changes. The inline content lets you review without extra file reads.

---

## Common Scenario Playbooks

### "I want to publish but the remote has changed"

1. Run `npx happyskills status <skill> --json`
2. Status is `diverged` → run `npx happyskills pull <skill> --json`
3. If `merged` → proceed to publish (merge commit will be created)
4. If `conflicts` → show conflict files, guide resolution, then publish

### "Why can't I publish?"

1. Run `npx happyskills status <skill> --json`
2. Check status:
   - `diverged` → "The remote has new changes since your last pull. Run pull to merge."
   - `conflicts` → "You have unresolved conflict markers from a previous pull. Resolve them first."
   - `outdated` → "The remote has advanced. Pull to get the latest version."
   - `modified` or `clean` → check for validation errors (`npx happyskills validate`)
3. If status is fine but publish still fails → check the error code (auth, network, validation)

### "I have merge conflicts"

1. Run `npx happyskills status <skill> --json` to see `conflict_files`
2. Ask: "Would you like to resolve manually, take all remote changes (--theirs), or keep all your changes (--ours)?"
3. If manual → read each conflict file, show the markers, help the user decide
4. If `--theirs` or `--ours` → run `npx happyskills pull <skill> --theirs --json` (or `--ours`)
5. Verify: `npx happyskills status <skill> --json` → status should no longer be `conflicts`

### "I want to discard my changes and get the latest"

```
npx happyskills pull <skill> --force --json
```

This replaces all local files with the remote version. Confirm with AskUserQuestion first — this is destructive.

### "Show me what changed before I decide"

1. `npx happyskills diff <skill> --json` — local changes
2. `npx happyskills diff <skill> --remote --json` — remote changes
3. `npx happyskills diff <skill> --full --json` — both sides compared to base

Present the file classifications, then ask the user how they want to proceed.

### "I pulled and it merged, but I want to review the result"

Use the full report mode:

```
npx happyskills pull <skill> --json --full-report
```

Review the `merged_content` for each file. Check `resolution_steps` for any items that need attention. If satisfied, proceed to publish.
