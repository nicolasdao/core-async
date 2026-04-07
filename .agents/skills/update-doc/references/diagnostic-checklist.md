# Documentation Diagnostic Checklist

This checklist is used by the diagnostic sub-agent in Phase 1. For each documentation file, run every check and return a structured report.

## Per-File Checks

### 1. Line Count

Count the total lines in the file.

| File | Guardrail | Action if exceeded |
|---|---|---|
| README.md | 750 lines | Must split — identify sub-concerns to extract into docs/ files |
| docs/*.md | 750 lines | Must split — extract sub-topics into new focused files |

Report: `{ file, line_count, limit, over_limit: true/false }`

### 2. Table of Contents

Check whether the file has a TOC immediately after the h1 heading.

**Present and correct** means:
- Appears right after the h1 (before any content)
- Uses linked markdown list format with anchor links (e.g., `- [Section](#section)`)
- Covers headings up to h4
- All links match actual headings in the file (no broken anchors, no missing entries)

**Compliance states:**

| State | Action |
|---|---|
| TOC present, linked format, all entries match | Compliant — no action |
| TOC present, linked format, but stale (missing or extra entries) | Update TOC to match current headings |
| TOC present, but plain text (no anchor links) | Convert to linked format |
| TOC missing entirely | Add linked TOC after h1 |

Report: `{ file, has_toc: true/false, format: "linked"/"plain"/"none", is_stale: true/false, action: "none"/"update"/"convert"/"add" }`

### 3. Cross-Links

Check whether the file links to other docs/ files and whether other files link back to it.

- Every docs/ file should be linked from README.md
- docs/ files should cross-link to related docs/ files where relevant

Report: `{ file, linked_from_readme: true/false, cross_links_to: [files], cross_linked_from: [files] }`

### 4. docs/gotchas.md Existence

Check whether `docs/gotchas.md` exists.

- If it exists, include it in the file list for content review
- If it does not exist, flag it for creation. New gotchas discovered during the content update phase should be written here.

Report: `{ exists: true/false, action: "none"/"create" }`

### 5. Content Staleness Indicators

Scan each file for patterns that may be stale after code changes:

- **Numeric claims**: patterns like "N commands", "M endpoints", "K modules", "N options"
- **File references**: mentions of source files that may have been renamed or deleted
- **Feature descriptions**: descriptions of behavior that may have changed
- **Code examples**: inline code snippets that may no longer match the codebase

Report per file: `{ file, numeric_claims: [...], file_references: [...], potential_stale_sections: [...] }`

## Aggregate Report Structure

The diagnostic sub-agent should return a single structured summary:

```
DIAGNOSTIC REPORT
=================

FILES SCANNED: [list of all doc files found]

COMPLIANCE ISSUES (deterministic — must fix):
- [file]: TOC missing / TOC stale / TOC not linked / Over size limit / Not linked from README

GOTCHAS STATUS: exists / missing (must create)

CONTENT REVIEW NEEDED (requires LLM judgment):
- [file]: [list of numeric claims, file references, potential stale sections]

CROSS-LINK MAP:
- README.md links to: [files]
- [doc file] links to: [files]
- ORPHANED (not linked from README): [files]
```
