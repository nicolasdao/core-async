---
name: release
description: Review session changes, decide semver bump, update CHANGELOG.md, bump package.json version, and create a release commit with git tag. Use when the user asks to release, publish, bump version, prepare a release, or update the changelog.
allowed-tools: Bash, Grep, Glob, Read, Edit, Write
---

# Release — Semver Bump + Changelog + Commit

Analyze all changes since the last release, determine the correct semver bump, update the CHANGELOG.md, bump the version in package.json, and create a release commit with a git tag.

## Step 1: Determine the Last Release

Find the last release version and its commit:

```bash
git tag --sort=-v:refnum | head -5
```

If no tags exist, use the version in CHANGELOG.md as the baseline. Also read the current version from `package.json`.

## Step 2: Analyze Changes Since Last Release

Get the full diff of changes since the last release:

```bash
# If tags exist:
git log <last-tag>..HEAD --oneline
git diff <last-tag> --stat

# If no tags, compare against the last "chore(release)" commit:
git log --oneline --all | grep "chore(release)" | head -1
```

Also check `git status` and `git diff --stat HEAD` for any uncommitted changes from the current session. These are part of the release too.

Read the actual diff to understand what changed:

```bash
git diff <last-tag> -- src/ test/ package.json
```

For uncommitted changes:

```bash
git diff HEAD -- src/ test/ package.json
```

## Step 3: Classify Changes and Decide Semver Bump

Classify every change into one of these categories:

| Category | Examples | Semver Impact |
|----------|----------|---------------|
| **BREAKING** | Removed API, changed return type, removed export, changed default behavior, dropped Node version support | **MAJOR** |
| **Feature** | New export, new method, new option, new file, new capability | **MINOR** |
| **Bug Fix** | Corrected wrong behavior, fixed crash, fixed edge case | **PATCH** |
| **Performance** | Faster algorithm, reduced memory, optimized hot path | **PATCH** |
| **Chore** | Deps update, CI change, docs update, test addition | **PATCH** (or skip if no user-facing change) |

**Decision rules:**
- If ANY change is BREAKING → **MAJOR** bump
- Else if ANY change is a Feature → **MINOR** bump
- Else → **PATCH** bump

Present the classification to the user and confirm the bump level before proceeding.

## Step 4: Bump Version in package.json

Calculate the new version based on the current version and the bump level.

Edit `package.json` to update the `"version"` field. Also update `package-lock.json`:

```bash
npm version <new-version> --no-git-tag-version
```

This updates both `package.json` and `package-lock.json` without creating a commit.

## Step 5: Update CHANGELOG.md

Read the existing CHANGELOG.md. Add a new entry at the top (after the header), following the [Keep a Changelog](https://keepachangelog.com/) format with conventional-commit style:

```markdown
## [X.Y.Z](https://github.com/<owner>/<repo>/compare/v<old>...v<new>) (YYYY-MM-DD)

### ⚠ BREAKING CHANGES
* **scope:** description

### Features
* **scope:** description

### Bug Fixes
* **scope:** description

### Performance
* **scope:** description
```

Rules:
- Only include sections that have entries (don't add empty sections)
- Use `**scope:**` prefix where a clear scope exists (e.g., `**channel:**`, `**tools:**`)
- Keep descriptions concise but specific — mention what changed and why
- Include file references in parentheses where helpful
- Date format: YYYY-MM-DD
- Link format: compare URL from old tag to new tag

## Step 6: Run Tests

Verify everything still works:

```bash
npm test
```

If tests fail, stop and report the failure. Do not proceed with the release.

## Step 7: Create Release Commit and Tag

Stage all release-related files and create the commit:

```bash
git add package.json package-lock.json CHANGELOG.md
# Also stage any other files changed in this session that haven't been committed yet
git add <other-files>
```

Create the commit with a conventional commit message:

```bash
git commit -m "chore(release): X.Y.Z"
```

Create a git tag:

```bash
git tag vX.Y.Z
```

## Step 8: Summary

Report to the user:
- Previous version → New version
- Bump type (major/minor/patch) and why
- Number of changelog entries by category
- The git tag created
- Remind them to `git push --follow-tags origin master && npm publish` when ready

Do NOT push or publish automatically — let the user decide when to do that.
