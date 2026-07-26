---
name: review
description: Audit a plan markdown file against the actual implementation. Verify every item the plan defined was built, surface gaps and scope for improvement, run the build tooling (`tsc --noEmit`, `npm run lint`, and `npm run build` when relevant) to catch type/lint/build errors and warnings, and check that the code written for the plan (and anything else living in the same files/blocks) adheres to DEVELOPER_GUIDE.md. Use when the user runs `/review <plan.md>` or asks to review/audit a plan against the code. After presenting the review, if the user says "patch" (or "apply"/"fix"), apply every finding from the report.
---

# /review — Plan implementation & guide-adherence audit

You are auditing a **plan markdown file** against the **actual code** in this repo, and against [`DEVELOPER_GUIDE.md`](../../../DEVELOPER_GUIDE.md).

This skill has **two modes** in one conversation:
1. **Review** (default, when invoked) — audit and report. **Do not change any code.**
2. **Patch** (when the user later says "patch" / "apply" / "fix the suggestions") — apply every finding from the report you just produced.

---

## Inputs

- The plan file is passed as the argument, e.g. `/review docs/plans/insights.md`.
- If **no plan file** is given, list the candidate plan/spec markdown files (`*.md` that read like plans — `plan.md`, `new plan.md`, `*_FEATURE.md`, files under `docs/`) and ask which one to review. Do not guess.
- Authoritative references while reviewing:
  - [`DEVELOPER_GUIDE.md`](../../../DEVELOPER_GUIDE.md) — engineering conventions (the adherence bar).
  - [`CONTEXT.md`](../../../CONTEXT.md) — what the app is / how it works (source of truth when docs and code disagree, trust code + CONTEXT).
  - [`DEVELOPER_GUIDE_AUDIT.md`](../../../DEVELOPER_GUIDE_AUDIT.md) — an existing audit; **mirror its format and severity legend** for output.

---

## Mode 1 — Review

### Phase 1: Decompose the plan
Read the plan file in full. Extract its concrete **deliverables** into a checklist — every distinct thing the plan says will be built, changed, or must be true when done. Split vague prose into checkable items. Number them `P1, P2, …`. Note any explicit acceptance criteria.

### Phase 2: Locate the implementation
Find the code that corresponds to the plan. Use whatever gives the truest picture:
- `git log`/`git diff` for commits or a branch tied to the plan, if identifiable.
- `git status` / `git diff` for uncommitted work.
- Grep/search for the files, routes, components, functions, and symbols the plan names.

Read the actual code — **never assume** a plan item was implemented because the plan says so. Verify against source, and cite `file:line`.

### Phase 3: Run the build tooling
Before the static audit, actually **run the checks** and capture their output — a review must catch what the compiler and linter catch, not just what you read:
- `npx tsc --noEmit` — TypeScript / type errors (strict mode is on, §9).
- `npm run lint` — ESLint errors **and warnings**.
- `npm run build` — only if the change could affect the build (new routes, config, server/client boundary, imports) or if `tsc`/lint came back clean but you suspect a build-time issue; skip for pure doc/style edits.

Attribute each error/warning to a `file:line`. Note which are inside the plan's touched files (in-scope) vs. elsewhere in the repo (out-of-scope) — report both, but label them.

### Phase 4: The five checks
Produce findings under exactly these five buckets:

**A. Implementation completeness** — For each `P#` deliverable, mark one of:
- `✅ Implemented` — done, with evidence (`file:line`).
- `⚠️ Partial` — started but incomplete/incorrect; say what's missing.
- `❌ Missing` — no implementation found.
- `➕ Deviated` — built differently than the plan specified (note whether the deviation is an improvement or a problem).

**B. Gaps & scope for improvement** — Planned things that work but could be better, missing edge-case/error handling the plan implied, tests/docs the change should have updated, follow-ups the plan left open. These are enhancements, not violations.

**C. Guide adherence — plan code** — Check the code written for the plan against `DEVELOPER_GUIDE.md`. For each violation, cite the guide section (`§N`) and the exact rule. Walk the guide's relevant sections for the kind of code touched (e.g. API routes → §11/§14/§15; storage → §13; AI providers → §12; components → §3/§16/§17; hooks/fetching → §21; types → §9; naming → §8; imports → §10; derived data → §19; constants → §18).

**D. Out-of-scope abnormalities** — While reading the touched files/blocks, flag anything **not part of the plan** that still violates `DEVELOPER_GUIDE.md` (e.g. a pre-existing `any` leak, hard-coded hex, an emoji in UI, a missing try/catch two functions down in the same route file). Mark these clearly as out-of-plan so the user can decide. Scope your search to the files the plan touched — don't audit the whole repo.

**E. Build / lint / type errors** — Every error and warning from Phase 3 (`tsc`, `npm run lint`, and `npm run build` if run). Type errors and build failures are 🔴 blockers; lint warnings are 🟡 unless they mask a real bug. Report the **actual tool output** verbatim (trimmed to the relevant lines), not a paraphrase. If all three came back clean, say so explicitly — a passing build is a finding worth stating.

### Phase 5: Present the report in chat
Output the full report **directly in the chat** — do not write it to a file. Make each finding **self-contained and actionable** (they are what `patch` will apply). Use this structure and the audit doc's severity legend:

```markdown
# Review — <plan filename>

_Reviewed: <files/commits examined>. Against DEVELOPER_GUIDE.md._

**Tooling:** `tsc` ✅/❌ · `lint` ✅ (N warnings) / ❌ (N errors) · `build` ✅/❌/skipped

## A. Implementation completeness
| # | Deliverable | Status | Evidence / gap |
|---|-------------|--------|----------------|
| P1 | … | ✅/⚠️/❌/➕ | `file:line` … |

## Findings
> Each finding: ID · severity · location · what · why (plan ref or §guide) · suggested fix.
> Severity: 🔴 blocker (missing deliverable / hard-rule violation / type or build error) · 🟡 improvement or lint warning · 🔵 nit.

- **[F1] 🔴 [E · tsc] `lib/x.ts:40`** — `Type 'string | null' is not assignable to 'string'` (verbatim). _Fix:_ narrow before assigning.
- **[F2] 🔴 [C · guide §14] `app/api/foo/route.ts:23`** — No top-level try/catch.
  _Why:_ §14 mandate. _Fix:_ wrap handler body, `console.error` in catch, return `{ success:false, error }`.
- **[F3] 🟡 [E · lint, out-of-plan] `app/page.tsx:88`** — `react-hooks/exhaustive-deps` warning. _Fix:_ add missing dep or justify.
- **[F4] 🔵 [D · guide §16, out-of-plan] `app/components/Y.tsx:12`** — hard-coded `#D4AF37`. _Fix:_ use `var(--golden-main)`.
```

Tag every finding with its bucket (A/B/C/D/E) and, for C/D, the guide section. Rank findings most-severe first. Lead with a one-line summary (deliverables done/partial/missing count; guide-violation count split plan vs out-of-plan; and the `tsc`/`lint`/`build` result). **Do not edit code or write any files in this mode.**

Then tell the user: *"Say **patch** to apply these, or tell me which findings to skip."*

---

## Mode 2 — Patch

Triggered when the user says **patch** / **apply** / **fix the suggestions** after a review (no need to re-run `/review`).

1. Use the review report from earlier in this conversation as the work list. If the review has scrolled out of context / been summarized, **re-run the review audit first** (Phases 1–4) to regenerate the findings, then patch — don't guess at what the findings were.
2. Apply **every actionable finding** by default — buckets A (⚠️/❌ → implement the missing/partial work), C, D, and E (fix every type/build error and lint error/warning). For B (improvements) and 🔵 nits, apply them too unless the user scoped a subset ("patch only the guide violations", "skip the out-of-plan ones"). Honor any skips the user named.
3. Follow `DEVELOPER_GUIDE.md` for every change you make — the fixes must themselves adhere to the guide (reuse primitives, `@/` imports, `{ success }` route shape, typed errors, CSS variables, no emojis in UI, storage-lib skeleton, etc.).
4. **Verify** after patching: re-run `npx tsc --noEmit` and `npm run lint` (plus `npm run build` if bucket E flagged a build error) and confirm they now come back **clean** — patching bucket E findings that leave the tooling still failing is not done. Drive the affected flow if it has runtime behavior. Report results honestly — if something still fails, say so.
5. If the plan was under-implemented and you filled it in, update the plan's own checkboxes if it has them.
6. Report back in chat: for each finding say `✅ fixed`, `⏭️ skipped (reason)`, or `➖ no change needed`, then summarize what changed file by file and note anything you intentionally left for the user.

---

## Rules

- **Review mode never writes code or files** — it only reports in chat. Patch mode does the fixing.
- **Verify every claim against source.** Cite `file:line`. A plan saying something is done is not evidence.
- **Separate plan-scope (A/B/C) from out-of-plan (D)** so the user always knows what was in the original plan vs. incidental debt you noticed.
- **Cite the guide section** for every adherence finding — a violation without a `§N` isn't actionable.
- **Signal over noise.** Prefer fewer high-confidence findings; don't invent nits to pad the list. Real gaps and real violations only.
- When the guide and the code genuinely disagree on intent, trust the **code + `CONTEXT.md`** and flag the stale guide line as a finding (per `DEVELOPER_GUIDE.md`'s own "fix the stale doc" rule).
