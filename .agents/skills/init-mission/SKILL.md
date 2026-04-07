---
name: init-mission
description: Interview the user to produce a docs/mission.md capturing business vision, values, non-goals, users, and UX compass. Analyzes the project first, then asks adaptive questions to build a decision-making compass that guides future engineering choices.
allowed-tools: Read, Write, Glob, Grep, Bash
argument-hint: "[optional: pre-computed reconnaissance results]"
---

# init-mission

Create a concise `docs/mission.md` that captures the business context of this project through an adaptive interview. This document becomes a decision-making compass — loaded in every AI session to guide engineering choices toward the project's actual goals.

## Output

A single file: `docs/mission.md` with these sections:

| Section | Purpose |
|---|---|
| **Vision** | Why the project exists, what it is trying to achieve |
| **Values** | How the mission must be delivered, with a clear tradeoff hierarchy (X over Y) |
| **Non-goals** | What the project deliberately does not do |
| **Users** | Who they are, their problem, their context |
| **User Experience Compass** | Aha moments to protect and irritants to avoid |

The file includes a Table of Contents and ends with a brief compass note explaining that this document guides engineering decisions.

### Quality Standard

The mission doc must be:

- **Concise** — no filler, no corporate jargon, every sentence carries weight. Target under 150 lines.
- **Non-contradictory** — values and non-goals must not conflict with vision or with each other.
- **Undiluted** — fewer and sharper beats many and vague. Resist the urge to add "nice-to-have" values.
- **Business context only** — no AI behavior instructions, no implementation details, no technical specifications.

---

## Process

### Phase 1: Reconnaissance

**Check whether the user provided pre-computed reconnaissance results via `$ARGUMENTS`.**

- **If reconnaissance results are provided**: Parse and use them directly. Skip to Phase 2.
- **If no results are provided**: Execute the full reconnaissance process documented in [reconnaissance.md](reconnaissance.md). This produces a structured project summary that informs the interview.

After reconnaissance, also check whether `docs/mission.md` already exists:

- **If it exists**: Read it. In Phase 2, present the existing content for refinement rather than starting from scratch. Tell the user: "I found an existing mission document. I'll use it as a starting point — we can refine each section together."
- **If it does not exist**: Proceed with draft-first interview (infer from reconnaissance).

### Phase 2: Adaptive Interview

This is the core of the skill. You are not following a script — you are using intelligence to understand the user's project and help them articulate their mission.

#### Interview Principles

These principles govern your behavior throughout the entire interview:

1. **Detect communication style early.** Pay attention to how the user responds — terse or verbose, abstract or concrete, business-speak or engineering-speak. Adapt your questions, language, and draft style to match. A CTO and a junior developer need different approaches.

2. **Draft first, ask second.** Based on reconnaissance (and existing mission.md if present), present your best inference for each section. The user reacts to something concrete rather than creating from nothing. This is dramatically easier for most people.

3. **One section at a time.** Never present multiple sections simultaneously. Complete one section before moving to the next. This keeps the conversation focused and prevents overwhelm.

4. **Build on everything.** Each question is informed by the reconnaissance, all previous answers, and the confirmed sections so far. Never ask something the user already answered — even indirectly.

5. **Guide, don't interrogate.** Ask at most 2 clarifying questions per section before presenting a draft. If the user's answer is vague, help them sharpen it by offering specific options rather than asking open-ended follow-ups.

6. **Challenge dilution.** If the user adds too many values, gently point out that a value that doesn't force a tradeoff isn't a value — it's just a wish. "Simplicity over flexibility" forces a real choice. "We value quality" does not.

7. **Detect strengths and weaknesses.** Some users are great at articulating vision but struggle with non-goals. Others think concretely about users but can't abstract values. Identify where the user needs more scaffolding and provide it — offer options, give examples from similar projects, or reframe the question.

8. **Set the user up for success.** Your job is not to extract answers — it's to help the user discover what they already know but haven't articulated. Use the reconnaissance to provide context that triggers recognition: "Based on the codebase, it looks like... is that right?"

#### Section Flow

Work through each section in order. For each section:
1. Present your inferred draft (based on reconnaissance + all confirmed sections so far)
2. Ask the user to refine: what to change, add, or remove
3. Iterate until the user confirms (typically 1-2 rounds)
4. Move to the next section

##### Section 1: Vision

Present a 2-3 sentence vision statement inferred from the reconnaissance. Ask: "Does this capture why this project exists? What would you change?"

The vision must answer: **Why does this project exist, and what is it ultimately trying to achieve?** This can be a business outcome, a community goal, an operational need, or anything else — projects exist for many reasons.

##### Section 2: Values

Based on the confirmed vision and the reconnaissance, infer 3-5 values expressed as a **tradeoff hierarchy**. Format each as "X over Y" — this forces real choices.

Example format:
- Simplicity over flexibility
- Developer experience over raw performance
- Sustainability over speed-to-market

Present for refinement: "Here's what I think matters most about how this project delivers its vision. What would you reorder, remove, or add?"

##### Section 3: Non-goals

Infer 3-5 non-goals from the reconnaissance — things the project clearly does not do, based on what is absent from the codebase. Non-goals should be things someone might reasonably expect this project to do but it deliberately does not.

Example: "This project is NOT a general-purpose framework" or "This project does NOT aim to support self-hosting."

Present for refinement.

##### Section 4: Users

Infer the primary user type(s) from the codebase (CLI = developers, web app = end users, library = other developers, API = integrators, etc.). For each user type, draft:

- **Who they are** — role, context, skill level
- **What problem they face** — the pain point that brings them to this project
- **What situation they're in** — the context in which they use the project

Present for refinement.

##### Section 5: User Experience Compass

Based on the confirmed vision, values, users, and project type, infer:

- **Aha moments** — what makes users say "this is great." These are the experiences to protect at all costs.
- **Irritants** — what would make users frustrated or leave. These are the experiences to avoid at all costs.

Present as two short lists for refinement.

### Phase 3: Writing

After all five sections are confirmed:

1. Create `docs/` directory if it does not exist
2. Write `docs/mission.md` with:
   - h1 heading with project name and "Mission"
   - Table of Contents (linked markdown list format with anchor links, up to h4)
   - All five sections with their confirmed content
   - A closing section: "## Decision-Making Compass" with a brief note: "This document captures the strategic context behind this project. When evaluating solutions, designing features, or fixing bugs, use the vision, values, non-goals, and user context above to guide decisions. When a request appears to conflict with this mission, surface the tension constructively."
3. Present the final file to the user for a last review before writing

### Phase 4: Validation

After writing the file:

1. Re-read `docs/mission.md`
2. Verify the file is under 150 lines
3. Verify no contradictions between sections (values must align with vision, non-goals must not conflict with vision)
4. Verify no AI behavior instructions leaked into the document (it must be pure business context)
5. Verify the TOC matches the actual headings

### Phase 5: README Integration

The mission document must be connected to the project's README — the entry point of all documentation. Without this link, `docs/mission.md` is orphaned and invisible to both humans and AI agents.

1. **Read the project root `README.md`**. If it does not exist, skip this phase entirely (the user can run `init-doc` later to create one).
2. **Find the Documentation section** (or equivalent section that links to docs/ files). If no such section exists, create one.
3. **Add or update the `docs/mission.md` entry** with a description that explains how it supports decision-making at two levels:
   - **Proactive (before implementation)** — when a bug fix or feature request comes in, the mission provides the lens through which to interpret and approach it. This context can steer the implementation in a direction that aligns with the project's ultimate goals — a direction that would not emerge without the mission.
   - **Reactive (when facing multiple solutions)** — when multiple valid approaches exist, the mission provides enough context to choose the best path without asking the user. The AI should only escalate to the user when there is a genuine conflict or ambiguity that the mission cannot resolve — this should be the exception, not the rule.
4. **Summarize** what was created and how the README was updated.

---

## Constraints

- NEVER modify `CLAUDE.md`, `MEMORY.md`, `.claude/`, `specs/`, or `docs/manual/`
- NEVER fabricate business context — everything must come from the user or be confirmed by the user
- NEVER write AI behavior instructions into `docs/mission.md` — it is business context, not an AI behavior guide
- NEVER skip the interview — do not auto-generate the full document without user input and confirmation
- NEVER present all five sections at once — one section at a time, progressively
- NEVER ask more than 2 clarifying questions per section without presenting a draft first
- NEVER let the mission doc exceed 150 lines — if it is longer, it is not concise enough
- Keep each value statement as "X over Y" to force real tradeoffs
- Non-goals must be things someone could reasonably expect the project to do — not obvious absurdities
