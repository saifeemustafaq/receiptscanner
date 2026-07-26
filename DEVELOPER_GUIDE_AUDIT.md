# Developer Guide Adherence Audit

Tracking document for auditing **every source file** against [`DEVELOPER_GUIDE.md`](DEVELOPER_GUIDE.md). We work through this **part by part**. For each file we (1) review it against the listed guide sections, (2) record findings, (3) fix violations, (4) mark the status.

## How to use this doc

- Work **one Part at a time**, top to bottom. Don't start a new Part until the current one is fully triaged (reviewed + findings recorded; fixes can follow).
- Update the **Status** of each file as you go. Legend:
  - `⬜ Not started` — not yet reviewed.
  - `🔍 In review` — currently being read/assessed.
  - `⚠️ Needs fixes` — violations found, listed in Findings.
  - `✅ Compliant` — reviewed, adheres to the guide (or fixed and verified).
- Put concrete findings in the **Findings / Notes** column (or the per-part notes section) with the guide section number, e.g. "§14: returns `{ error }` instead of `{ success, error }`".
- **Do not fix while reviewing the whole part** — first review the entire part and record findings, then fix as a batch so we keep related changes together.

## Progress summary

| Part | Scope | Files | Status |
|------|-------|-------|--------|
| 1 | AI subsystem (`lib/ai/`) | 7 | ✅ Compliant (1 fix applied; +text-first PDF sprint) |
| 2 | Persistence — storage libs (`lib/*Storage.ts`) | 4 | ✅ Compliant (1 fix applied) |
| 3 | Derived data + shared types (`lib/`) | 3 | ✅ Compliant (2 fixes applied) |
| 4 | Client hooks (`lib/hooks/`) | 4 | ✅ Reviewed (2 fixes applied; 3 rolled into Parts 6/8) |
| 5 | API routes (`app/api/`) | 5 | ✅ Compliant (1 fix applied) |
| 6 | Pages (`app/*/page.tsx`, layout) | 8 | ✅ Compliant (2 fix groups applied; alert()/rename tech-debt noted) |
| 7 | UI primitives (`app/components/` — atoms) | 6 | ✅ Compliant (guide §20 corrected to match code) |
| 8 | Feature components (`app/components/` — organisms) | 11 | ✅ Compliant (emoji + `any` fixes; mutation-surfacing #3 closed) |
| 9 | Styling & global CSS | 1 | ✅ Compliant (2 fixes; +4 tokens added & all component hex repointed) |
| 10 | Scripts & config | 6 | ✅ Compliant (1 fix: broken `dotenv` dep in smoke test) |
| 11 | Docs consistency | 4 | ✅ Compliant (CONTEXT/PRD/DESIGN reconciled; README already accurate) |

**Totals:** 59 items across 11 parts.

---

## Part 1 — AI subsystem (`lib/ai/`)

Highest-value, most domain-critical code. Audit first. Primary guide sections: **§9 (TS/validation)**, **§10 (imports)**, **§12 (AI architecture)**, **§15 (typed errors)**, **§18 (constants)**, **§20 (exports)**.

| # | File | Key checks | Status | Findings / Notes |
|---|------|-----------|--------|------------------|
| 1.1 | `lib/ai/index.ts` | §12 dispatch pattern; `PROVIDERS`/`runProvider` correct; named exports (§20) | ✅ | Fixed §18: `PROVIDERS` now references `GEMINI_MODEL`/`OPENAI_MODEL` instead of hardcoding model strings. |
| 1.2 | `lib/ai/types.ts` | §9 shared shapes; `MissingApiKeyError` shape; `import type` (§10) | ✅ | Compliant. Minor note: `AIProvider` source-of-truth lives in `settingsStorage.ts` and is re-imported here — acceptable, but slightly odd dependency direction (AI module depends on settings for its core type). |
| 1.3 | `lib/ai/prompt.ts` | §12 single shared prompt; encodes bulk-vs-packaged; no forks | ✅ | Compliant. Single exported `buildExtractionPrompt({ isPDF, sourceText? })` (text + vision, not forked); encodes all pricing semantics, discount rule + PDF handling. |
| 1.4 | `lib/ai/parseResponse.ts` | §9 runtime validation is the single choke point; `ExtractionParseError`; the `any` here is contained | ✅ | Compliant. `any` is contained (validated, returns typed `ExtractedData`). Single validation choke point. |
| 1.5 | `lib/ai/gemini.ts` | §12 uses shared prompt + `parseAndValidate`; `MissingApiKeyError`; `temperature: 0.1`; `GEMINI_MODEL` const (§18) | ✅ | Fixed §18: `GEMINI_MODEL` now exported as the single source of truth. Emoji in `console.log` left as-is (dev log, not UI — see cross-cutting decision). |
| 1.6 | `lib/ai/openai.ts` | §12 uses shared prompt + `parseAndValidate`; `MissingApiKeyError`; `temperature: 0.1`; `OPENAI_MODEL` const (§18) | ✅ | Fixed §18: `OPENAI_MODEL` now exported as the single source of truth. Emoji in `console.log` left as-is (dev log). |
| 1.7 | `lib/ai/pdfText.ts` | §6 single responsibility; §18 named constants; §15 never throws across the route boundary | ✅ | New (text-first PDF sprint). `extractPdfText()` uses unpdf to extract + classify the text layer; classification/hardening thresholds co-located as named constants (§7/§18, single consumer); resolves to a no-text-layer result on any error so the pipeline degrades to vision. |

**Text-first PDF sprint (post-audit change).** Added a token-optimized text-first path for PDFs, kept fully inside the provider abstraction (§12):
- `lib/ai/index.ts`: added the `extractReceipt()` orchestrator (detect → dispatch, with a one-shot text→vision fallback on parse failure/0 items); `runProvider` is now a pure internal dispatcher. The route calls `extractReceipt`.
- `lib/ai/types.ts`: added `ExtractionMode` and a discriminated `ExtractionSource` union; `ProviderResult` now carries `mode`.
- `lib/ai/prompt.ts`: `buildExtractionPrompt({ isPDF, sourceText? })` (single prompt for text + vision, not forked); elevated the discounted-line-total rule to core (text mode has no strikethrough cue).
- `lib/ai/gemini.ts` / `openai.ts`: branch on `source.kind` (text vs vision) and run in JSON mode (`responseMimeType` / `json_object`); still funnel through `parseAndValidate` (§9 single choke point).
- `scripts/test-pdf-extract.js` (`npm run test:pdf`): offline text-layer classifier + `--oracle` filename-total check. `tsc`/lint clean; corpus classified 44/44 PDFs → text, image → vision.

---

## Part 2 — Persistence: storage libs (`lib/*Storage.ts`)

Primary guide sections: **§4 (DRY across storage libs)**, **§9 (`any` at JSON boundary only)**, **§13 (storage-lib skeleton, boolean returns, `✅` logs, data safety)**, **§18 (defaults as constants)**, **§20 (exports)**.

| # | File | Key checks | Status | Findings / Notes |
|---|------|-----------|--------|------------------|
| 2.1 | `lib/receiptStorage.ts` | §13 skeleton; boolean returns; `console.error` on fail; CSV/JSON export shape | ✅ | Fixed §8/§13: renamed `ensureDataDirExists` → `ensureReceiptsDataDirExists` to match the other three libs (internal-only, no external consumers). Note (tech debt): `exportReceipts` CSV does not escape commas/quotes — store names with commas would break the CSV. Not a guide violation; log for later. |
| 2.2 | `lib/storesStorage.ts` | §13 skeleton; default store list centralized (§18); mirrors pattern | ✅ | Compliant. `DEFAULT_STORES` const; boolean returns; case-insensitive dedup; sorted writes. |
| 2.3 | `lib/unitsStorage.ts` | §13 skeleton; default unit list (§18); discovery logic; mirrors pattern | ✅ | Compliant. `DEFAULT_UNITS` const; `discoverUnitsFromReceipts` uses `any[]` at the receipt boundary (acceptable, §9). |
| 2.4 | `lib/settingsStorage.ts` | §13 skeleton; `DEFAULT_SETTINGS`/`AI_PROVIDERS` consts; `isValidProvider` guard | ✅ | Compliant. Clean skeleton; `isValidProvider` guard applied on both read and write. |

> DRY note for this part (§4): the four libs share a near-identical dir/ensure/read/write skeleton but are **consistent enough** that a shared `readJsonFile()/writeJsonFile()` helper is **not yet warranted** (per §4's "extract only when painful"). The one drift found (the `ensure*` name) is now fixed. Re-evaluate if a 5th store is added.

---

## Part 3 — Derived data + shared types (`lib/`)

Primary guide sections: **§7 (dates)**, **§9 (types)**, **§18 (tolerances as constants)**, **§19 (deterministic derivation, no I/O)**, **§20 (exports)**.

| # | File | Key checks | Status | Findings / Notes |
|---|------|-----------|--------|------------------|
| 3.1 | `lib/types.ts` | §9 `SavedReceipt`/`QueueItem` typed; no stray `any`; shared types live here | ✅ | **Fixed §9/§2.** Canonical `ReceiptItem`/`ExtractedData` now defined here (nullable shape). `lib/ai/types.ts`, `ExtractedDataDisplay.tsx`, and `app/page.tsx` all import from `@/lib/types`; the component no longer defines or re-exports them, and the lib→UI import is gone. Duplicate definitions eliminated. Verified with `tsc --noEmit` (clean). |
| 3.2 | `lib/itemsProcessor.ts` | §19 pure/deterministic; price float tolerance `0.01` named (§18); `ProcessedItem` typed | ✅ | Fixed §18: extracted inline `0.01` → named `PRICE_TOLERANCE` const. Pure/deterministic, no I/O. Tech-debt (not a violation): repeated full reprocessing in `getItemByName`/`searchItems`/`getAllItemNames` and an O(n²) `originalName` lookup. |
| 3.3 | `lib/analyticsUtils.ts` | §19 no I/O; ±5% band + stats; `getStoreColor` palette; typed returns | ✅ | Compliant. Pure; §7 uses `America/Los_Angeles` for date formatting; ±5% stable band present; `ChartDataPoint` index signature is justified (dynamic store columns for Recharts). Tech-debt: same-store-same-day averaging (`(existing + price)/2`) is a running average, not a true mean for 3+ entries. |

---

## Part 4 — Client hooks (`lib/hooks/`)

Primary guide sections: **§10 (`'use client'`, imports)**, **§15 (client error handling)**, **§21 (data fetching pattern, `{ success }` branching)**, **§20 (exports)**.

| # | File | Key checks | Status | Findings / Notes |
|---|------|-----------|--------|------------------|
| 4.1 | `lib/hooks/useReceipts.ts` | §21 load/mutate/refetch; `{ loading, error }`; branches on `data.success`; `console.error` on catch (§15) | ⚠️ | Core pattern good (branches on `success`, logs, mutations return `{success,error}`). Flags: exposes `loading` while other 3 hooks use `isLoading` (§8); `updates: any` should be `Partial<SavedReceipt>` (§9). |
| 4.2 | `lib/hooks/useStores.ts` | §21 same pattern; no silent swallow | ✅ | Fixed §18/§4: imports `DEFAULT_STORES` from `@/lib/defaults`. Fixed §15/§21 (Part 8): `addStore`/`deleteStore`/`clearAll` now return `MutationResult` and `Settings.tsx` surfaces failures (inline for add, `alert()` for delete/clear). |
| 4.3 | `lib/hooks/useUnits.ts` | §21 same pattern; discovery handling | ✅ | Fixed §18/§4: imports `DEFAULT_UNITS` from `@/lib/defaults`. Fixed §15/§21 (Part 8): `addUnit`/`deleteUnit`/`clearAll` now return `MutationResult`, surfaced in `Settings.tsx`. |
| 4.4 | `lib/hooks/useSettings.ts` | §21 same pattern; provider read/update | ✅ | Fixed §18 default (reconciled to OpenAI). Fixed §15/§21 (Part 8): `setProvider` now returns `MutationResult` (keeps optimistic-rollback UX). Remaining note (tech-debt, not a violation): `PROVIDER_OPTIONS` model strings mirror `PROVIDERS` in `lib/ai` — justified (client can't import server SDK). |

> §18/§4 duplication fixed this part: `DEFAULT_STORES`/`DEFAULT_UNITS` extracted to `lib/defaults.ts` (client-safe, no `fs`), imported by both the storage libs and the hooks. Verified with `tsc --noEmit`.

---

## Part 5 — API routes (`app/api/`)

Primary guide sections: **§11 (`runtime='nodejs'`, no middleware)**, **§14 (try/catch, `{ success }` shape, thin controllers, input validation)**, **§15 (typed AI errors)**.

| # | File | Key checks | Status | Findings / Notes |
|---|------|-----------|--------|------------------|
| 5.1 | `app/api/process-receipt/route.ts` | §14 `{ data, metadata }` exception shape; `maxDuration=60`; typed error handling; thin controller | ✅ | Fixed §9/§15: `catch (error: any)` → `catch (error)` with `error instanceof Error` narrowing to a `message` string (typed-error checks for `MissingApiKeyError`/`ExtractionParseError` kept first; string-sniffing retained only as a fallback for untyped provider errors). `tsc` clean. |
| 5.2 | `app/api/receipts/route.ts` | §14 `{ success }` shape; validation; export as raw `NextResponse`; try/catch all methods | ✅ | Compliant. All 4 methods wrapped; export returns raw `NextResponse` with headers; validates required fields. |
| 5.3 | `app/api/stores/route.ts` | §14 `{ success }` shape; validation; delegates to storage lib | ✅ | Compliant. Thin controller; validates types; correct status codes (400/404/500). (Unused `request` param on `GET` — cosmetic, not a violation.) |
| 5.4 | `app/api/units/route.ts` | §14 `{ success }` shape; `?action=discover`; validation | ✅ | Compliant. `?action=discover` pulls receipts and delegates to `discoverUnitsFromReceipts`. |
| 5.5 | `app/api/settings/route.ts` | §14 `{ success }` shape; `isValidProvider` on write; `runtime='nodejs'` | ✅ | Compliant. Write guarded by `isValidProvider`; clean `{ success }` shapes. |

---

## Part 6 — Pages & root layout (`app/`)

Primary guide sections: **§7 (dates/Pacific time)**, **§10 (`'use client'`, imports)**, **§16 (design/icons/responsive)**, **§19 (use derived-data modules, don't re-derive)**, **§21 (loading/error/empty states)**.

| # | File | Key checks | Status | Findings / Notes |
|---|------|-----------|--------|------------------|
| 6.1 | `app/layout.tsx` | §11 server component; wraps in `ClientLayout`; fonts/metadata; `export default` (§20) | ✅ | Compliant. Server component, wraps `ClientLayout`, metadata set. (Uses Geist fonts vs the design guide's "system fonts" note — cosmetic, not a DEVELOPER_GUIDE violation.) |
| 6.2 | `app/page.tsx` | §7 Pacific-time `uploadDate`; §21 states; queue logic; §19 no re-derivation | ✅ | Fixed §9: 2× `catch (err: any)` → narrowed `catch (err)`; `handleItemChange(updatedItem: any)` → `ReceiptItem`. §7 Pacific-time `uploadDate` correct; §19 uses `getAllItemNames` (no re-derivation). Tech-debt: heavy `alert()` usage for save flow (UX). |
| 6.3 | `app/history/page.tsx` | §21 states; uses `useReceipts`; §16 responsive table→cards | ✅ | Fixed §8: `loading`→`isLoading`. Loading state present. Tech-debt: `alert()` on delete/update/export failures; `handleUpdate(updates: any)` tied to deferred §9 (Part 8). |
| 6.4 | `app/items/page.tsx` | §19 uses `itemsProcessor`; §21 states | ✅ | Fixed §8: `loading`→`isLoading`. Uses `processItemsFromReceipts` (§19). Minor: derivation runs each render (no `useMemo`) — perf tech-debt, not a violation. |
| 6.5 | `app/items/[name]/page.tsx` | §19 derived price history; rename flow; §21 states | ✅ | Fixed §8: `loading`→`isLoading` (incl. `receiptsLoading` prop value). §19 uses `getItemByName`. Tech-debt: rename flow does raw `fetch` PATCH loop in the page (business logic in a page); not-found fallback uses `.btn-secondary` class instead of `<Button>` (§3); `handleReceiptUpdate(updates: any)` deferred to Part 8. |
| 6.6 | `app/insights/page.tsx` | §19 uses `analyticsUtils`; Recharts; §16 no emojis | ✅ | Fixed §8: `loading`→`isLoading`. §19 uses `analyticsUtils` + `useMemo`; §16 Lucide icons + CSS vars; loading/empty states present. Long (341 lines) but cohesive (§5 OK). |
| 6.7 | `app/settings/page.tsx` | §21 uses `useStores`/`useUnits`/`useSettings`; provider switch | ✅ | Compliant thin wrapper. Fixed (Part 8): `handleClearAll` now `await`s `clearStores()/clearUnits()` via `Promise.all` and alerts on failure/success (was fire-and-forget). |
| 6.8 | (root) `app/favicon.ico` | Asset only — no code review needed | ✅ | Static asset, N/A |

---

## Part 7 — UI primitives (`app/components/` — atoms)

Primary guide sections: **§3 (one primitive per file, reuse)**, **§8 (PascalCase files)**, **§16 (retro tokens, 2px borders, Lucide only)**, **§17 (CSS variables not hex)**, **§20 (named exports)**.

| # | File | Key checks | Status | Findings / Notes |
|---|------|-----------|--------|------------------|
| 7.1 | `app/components/Button.tsx` | §16 variants (golden/secondary/green); §17 CSS vars; 44px targets | ✅ | Compliant. Delegates to `.btn .btn-${variant}` global classes; extends native button props; variants primary/secondary/success/danger. Uses `export default` (established convention — see §20 fix). |
| 7.2 | `app/components/Card.tsx` | §16 2px border + `--shadow-retro`; hover lift | ✅ | Compliant. Thin wrapper over `.card` global class; spreads `HTMLAttributes`. |
| 7.3 | `app/components/Input.tsx` | §16 focus outline `#D4AF37`; §17 vars | ✅ | Compliant. `.input-group`/`.input-label`/`.input-field` + error class; extends native input props. |
| 7.4 | `app/components/Select.tsx` | §16 dropdown styling; §17 vars | ✅ | Compliant. Reuses `.input-field`; supports `options` or `children`. Minor: inline `cursor: 'pointer'` could be a class (trivial). |
| 7.5 | `app/components/DatePicker.tsx` | §7 `YYYY-MM-DD`; §16 styling | ✅ | Compliant. Reuses `Input` (§3); native date input yields `YYYY-MM-DD`; `max` = today. |
| 7.6 | `app/components/BottomSheet.tsx` | §16 mobile overlay; animation ≤0.3s | ✅ | Functionally compliant: Lucide `X` + `aria-label`, animations ≤0.3s, body-scroll lock, drag-to-dismiss. Minor §16/§17 design deviations (tech-debt, not fixed): 16px top radius (>4px rule), soft blur `boxShadow` (non-retro), and `<style jsx>` keyframes instead of `globals.css`. Acceptable for a distinct mobile bottom-sheet pattern; flag for a design pass. |

---

## Part 8 — Feature components (`app/components/` — organisms)

Primary guide sections: **§3 (single responsibility, reuse primitives)**, **§5 (LOC)**, **§9 (`any` leakage)**, **§16 (design/icons/responsive)**, **§16 tech-debt items**.

| # | File | Key checks | Status | Findings / Notes |
|---|------|-----------|--------|------------------|
| 8.1 | `app/components/ClientLayout.tsx` | §16 sidebar→hamburger at ≤768px; `'use client'` | ✅ | Compliant. Hamburger button + `Sidebar`, Lucide `Menu`, `content-wrapper` layout. |
| 8.2 | `app/components/Sidebar.tsx` | §16 nav (Home/Items/Insights/History/Settings); active state; Lucide icons | ✅ | Compliant. All 5 nav links, Lucide icons, `usePathname` active state. Minor: the Home `active` check is a verbose `!pathname.includes(...)` chain — cosmetic, works. |
| 8.3 | `app/components/ReceiptUpload.tsx` | §3 file/camera input; multi-file staging; §15 error surfacing | ✅ | Compliant. Reuses `Button`/`Card` + Lucide; object-URL cleanup handled; 5-file limit. Tech-debt: `alert()` for validation (§15 UX), one raw `.btn-danger` button instead of `<Button>` (§3), `<style jsx>` spin keyframes instead of `globals.css`. |
| 8.4 | `app/components/ExtractedDataDisplay.tsx` | ⚠️ known debt: `window.innerWidth` at render + inline styles (§16); §5 LOC; reuses primitives | ✅ | Types now import from `@/lib/types` (Part 3). Reuses `EditableItemName`. Retained `tempValue: any`/`startEditing(currentValue: any)` — accepted, contained dynamic per-field editor (see finding). Tech-debt (unchanged): `window.innerWidth` read during render drives duplicate desktop/mobile markup (not responsive-CSS; §16), 625 LOC (§5). |
| 8.5 | `app/components/EditableItemName.tsx` | §3 autocomplete vs known items; reuse `Input` | ✅ | Fixed §16: `✓ Existing` glyph → Lucide `Check` icon. Autocomplete/create/dropdown modes work; keyboard nav + click-outside. Tech-debt: bespoke inline-styled inputs rather than the `Input` primitive (§3) — intentional for the 3-mode inline editor. |
| 8.6 | `app/components/StoreSelection.tsx` | §3 reuse `Select`; canonical store | ✅ | Compliant. Reuses `Select`/`Input`/`Button` + Lucide; validates empty/duplicate; `__add_new__` sentinel option. |
| 8.7 | `app/components/ReceiptHistory.tsx` | §16 responsive table→cards; §9 typed receipts | ✅ | Fixed §9: `onUpdate(updates: any)` → `Partial<SavedReceipt>`. Search/sort/filter via `useMemo`; delegates rows to `ReceiptDetailView`. Tech-debt: raw `.btn` buttons instead of `<Button>` for View/Delete (§3); hardcoded `color:'white'` on the filter badge (§17). |
| 8.8 | `app/components/ReceiptDetailView.tsx` | §3 detail/edit; reuse primitives | ✅ | Fixed §9: `onUpdate(updates: any)` → `Partial<SavedReceipt>` and `editedItems: any[]` → `ReceiptItem[]`. Retained `tempValue: any`/`startEditingField(currentValue: any)` — accepted dynamic per-field editor. Auto-recalcs `totalPrice`/`total` on edit. Tech-debt: raw `.btn` buttons (§3); inline-styled edit cells. |
| 8.9 | `app/components/ItemsList.tsx` | §3 catalog grid; §19 consumes `ProcessedItem` | ✅ | Compliant. Reuses `Card` + Lucide; `useMemo` search; consumes `ProcessedItem` (§19); §7 Pacific-time dates. Fixed §17 (Part 9 follow-up): accent hex `#2B5F8F`/`#2D5016`/`#8B3A3A` → `var(--info-main)`/`var(--green-main)`/`var(--error-text)`. |
| 8.10 | `app/components/ItemDetail.tsx` | §19 price-history display | ✅ | Fixed §9: `onReceiptUpdate(updates: any)` → `Partial<SavedReceipt>`. Reuses `Card`/`Button`/`BottomSheet`/`ReceiptDetailView`; trend arrows via Lucide; §7 Pacific-time dates. Tech-debt: `alert()` on rename errors. |
| 8.11 | `app/components/Settings.tsx` | §3 stores/units/provider UI; reuse primitives | ✅ | Fixed §16: `⚠️` glyph → Lucide `AlertTriangle`. Reuses `Card`/`Button`/`Input`; double-confirm on clear-all. Fixed §17 (Part 9 follow-up): warning `#fff3cd`/`#ffc107` → `var(--warning-bg)`/`var(--warning-border)`, and broken `var(--black-primary, #1a1a1a)` → `var(--black-text)`. Remaining tech-debt: 8px radii. Fixed §15/§21: now surfaces stores/units mutation failures (inline add-errors, `alert()` on delete) via the new `MutationResult` contract (deferred #3 closed). |

---

## Part 9 — Styling & global CSS

Primary guide sections: **§16 (design tokens)**, **§17 (Tailwind 4 + CSS vars, no CSS Modules)**.

| # | File | Key checks | Status | Findings / Notes |
|---|------|-----------|--------|------------------|
| 9.1 | `app/globals.css` | §17 all palette/spacing/shadow tokens defined; §16 utility/component classes; no dark-mode tokens | ✅ | Compliant. All palette/spacing/shadow tokens present; `--shadow-retro` = `4px 4px 0 #1A1A1A`; radius ≤4px; transitions ≤0.3s; focus ring `2px var(--golden-main)`; sidebar hamburger `@media ≤768px`; no dark-mode/gradient tokens. Fixed §17: `.btn-danger` used literal `color: white` while `.btn-success` uses `var(--ivory-bg)` → aligned to `var(--ivory-bg)`. Follow-up done: added `--info-main`/`--warning-bg`/`--warning-border`/`--error-pale` tokens (at existing values) and repointed all Part 8 component literals to them — no hardcoded hex remains in any `.tsx`. |

---

## Part 10 — Scripts & config

Primary guide sections: **§1 (tech stack/scripts)**, **§18 (env vars)**. Config files are audited for *consistency with the guide's stated stack*, not code style.

| # | File | Key checks | Status | Findings / Notes |
|---|------|-----------|--------|------------------|
| 10.1 | `scripts/test-gemini.js` | Standalone smoke test; not shipped; uses env key not hardcoded | ✅ | Fixed: script did `require('dotenv')` but `dotenv` is **not** a declared dependency (script was broken). → Removed the `dotenv` require and added a `test:gemini` npm script using Node 20's built-in `--env-file=.env.local` (zero new deps). `node --check` clean. Accepted notes: hardcoded `gemini-2.0-flash-exp` (standalone `.js` can't import the TS `GEMINI_MODEL` const); extra undocumented `GOOGLE_GEMINI_API_KEY` alias (harmless fallback); emoji in CLI logs (dev-log exempt per ruling). |
| 10.2 | `package.json` | §1 deps/versions match guide (Next 16, React 19, TS 5, Recharts 3, both AI SDKs) | ✅ | Compliant. All versions match §1: `next@16.0.8`, `react`/`react-dom@19.2.1`, `typescript@^5`, `recharts@^3.5.1`, `@google/genai@^1.32.0` + `openai@^6.49.0`, `tailwindcss@^4` + `@tailwindcss/postcss`, `lucide-react`, `eslint@^9` + `eslint-config-next@16.0.8`. Added `test:gemini` script (above). |
| 10.3 | `tsconfig.json` | §9 `strict: true`; §10 `@/*` alias | ✅ | Compliant. `strict: true`; `paths: { "@/*": ["./*"] }`; `moduleResolution: bundler`, `noEmit`, `jsx: react-jsx`, next plugin. |
| 10.4 | `next.config.ts` | §11 no legacy config; sane for Next 16 | ✅ | Compliant. Empty typed `NextConfig` — no legacy/middleware/proxy config (§11). |
| 10.5 | `eslint.config.mjs` | Lint config aligns with conventions | ✅ | Compliant. Flat config: `eslint-config-next/core-web-vitals` + `/typescript`, standard `globalIgnores`. |
| 10.6 | `postcss.config.mjs` | §17 Tailwind 4 PostCSS setup | ✅ | Compliant. Single `@tailwindcss/postcss` plugin — the Tailwind 4 (CSS-driven, no `tailwind.config.ts`) setup §17 describes. |

---

## Part 11 — Docs consistency

Not code, but the guide requires docs to stay in sync (§0, §2, §13 README correction). Audit that these agree with the code and each other.

| # | File | Key checks | Status | Findings / Notes |
|---|------|-----------|--------|------------------|
| 11.1 | `README.md` | §13: fix inaccurate "Local Storage (browser)"; update model refs (says Gemini 1.5); mention OpenAI provider | ✅ | Already accurate — server-side JSON persistence, OpenAI + Gemini (default OpenAI), correct models (`gpt-4o` / `gemini-2.0-flash-exp`), `test:gemini` not needed here. The audit's original concerns had already been resolved in a prior edit. No change needed. |
| 11.2 | `CONTEXT.md` | §2: directory map missing `lib/ai/`, `settingsStorage.ts`, `useSettings.ts`, `/api/settings` — bring in sync | ✅ | Reconciled: multi-provider AI (OpenAI + Gemini) throughout §1/§2/§4; directory map now includes `lib/ai/*`, `lib/defaults.ts`, `lib/settingsStorage.ts`, `lib/hooks/useSettings.ts`, `app/api/settings`, `data/settings/`; §4 flow + §4.4 point to `lib/ai/prompt.ts`/`runProvider`; §5 types moved to `lib/types.ts` (nullable) + `MutationResult`; §6 adds `/api/settings`; removed the now-stale "README says Local Storage" notes (§1, §7.5). |
| 11.3 | `DESIGN_GUIDE.md` | §17: "Use CSS Modules" contradicts actual inline-style reality — reconcile note | ✅ | Added a "Reconcile note" at §Implementation Guidelines: the project does **not** use CSS Modules — it uses Tailwind 4 + CSS vars + global classes + inline styles; replaced the misleading `.module.css` snippet and pointed to `DEVELOPER_GUIDE.md §17`. Also noted the semantic accent tokens (`--error-*`/`--info-main`/`--warning-*`). Left the rest of the generic template as-is. |
| 11.4 | `docs/PRD.md` | Confirm product scope still matches app (items/insights/provider settings) | ✅ | Scope matches (capture/queue, history, items, insights, settings). Updated: §2 overview + tech stack to multi-provider (switchable); §3.1 extraction routes to active provider; **§3.5 adds the AI-provider setting**; §6 adds `/api/settings`; removed the stale README-inaccuracy bullet in §8. |

---

## Cross-cutting checks (verify across all parts)

These recur throughout the guide; keep them in mind on every file:

- **§8 naming/casing:** PascalCase component files, camelCase lib files, `useX` hooks, UPPER_SNAKE_CASE constants.
- **§10 imports:** `@/` for cross-directory, `import type` for type-only, no deep `../../..`.
- **§16 no emojis in UI/code** — Lucide React only. **Ruling (closed):** no emojis in UI or any user-facing strings; server-side `console.log` status markers (`✅`) are **exempt**. UI glyphs found & fixed in Part 8 (`⚠️`, `✓`); dev-log emoji left as-is.
- **§9 no `any` leakage** past the storage/AI boundaries.
- **§20 exports:** `export default` only for pages/layouts; named exports elsewhere.
- **§5 LOC:** flag files well over ~300 lines that aren't legitimately cohesive.

---

## Findings log (running list of confirmed violations to fix)

> Populate as reviews complete. Format: `[Part.File] §Section — description → fix`.

- **[1.5/1.6 → 1.1] §18 — FIXED** — Model names were duplicated: `GEMINI_MODEL`/`OPENAI_MODEL` in the provider files *and* hardcoded again in `PROVIDERS` (`index.ts`). → Exported the constants from the provider files and referenced them in `PROVIDERS` so each model name has a single source of truth.
- **[1.5/1.6] §16 — RESOLVED** — `gemini.ts`/`openai.ts` (and storage libs) use `✅`/`🤖` emoji in server-side `console.log`. **Ruling: allowed.** §16's no-emoji rule is scoped to UI/user-facing strings; server dev logs are explicitly exempt (guide §16 + §13 updated to say so). No code change needed.
- **[2.1] §8/§13 — FIXED** — `receiptStorage.ts` exported `ensureDataDirExists` while the other three libs use `ensure<Domain>DataDirExists`. → Renamed to `ensureReceiptsDataDirExists` (internal-only; all 5 call sites updated). Lints clean.
- **[2.1] §— FIXED** — `exportReceipts` built CSV by naive `join(',')` with no field escaping; a store name containing a comma or quote would corrupt the CSV. → Added an RFC 4180 `escapeCsvField` helper (quote-wrap + double embedded quotes on comma/quote/newline) applied to every field.
- **[3.2] §18 — FIXED** — Inline `0.01` price tolerance in `applyPriceVariationRules` → named `PRICE_TOLERANCE` const at top of `itemsProcessor.ts`.
- **[3.1] §9/§2 — FIXED (cross-part refactor, approved)** — Consolidated the duplicate/misplaced `ExtractedData`/`ReceiptItem` types. Canonical definitions now live in `lib/types.ts` (nullable shape, since providers emit `null`). Updated 4 importers: `lib/ai/types.ts` (re-exports for internal `./types` consumers), `app/components/ExtractedDataDisplay.tsx` (imports, no longer defines), and `app/page.tsx` (imports `ExtractedData` from `@/lib/types`). Removed the lib→component import. Component read sites were already null-safe; `tsc --noEmit` passes clean. This pre-clears the type concern for Parts 6 & 8.
- **[3.2/3.3] §— TECH DEBT (not violations)** — (a) `itemsProcessor` reprocesses all receipts on every helper call + O(n²) name lookup; (b) `analyticsUtils.prepareChartData` same-day averaging is a running average, incorrect for 3+ same-store-same-day entries.
- **[4.2/4.3] §18/§4 — FIXED** — `DEFAULT_STORES`/`DEFAULT_UNITS` were duplicated in each hook AND its storage lib. → Extracted to new client-safe `lib/defaults.ts`; imported by `storesStorage`, `unitsStorage`, `useStores`, `useUnits`. Guide structure tree updated. `tsc --noEmit` clean.
- **[4.1/4.2/4.3/4.4] §8 — NEEDS DECISION** — `useReceipts` exposes `loading`; `useStores`/`useUnits`/`useSettings` expose `isLoading`. `loading` is consumed by 4 pages (items, items/[name], insights, history). Recommend standardizing on **`isLoading`** (rename in `useReceipts` + 4 page consumers, Part 6). Do now or at Part 6?
- **[4.4] §18 — FIXED (re-reconciled to OpenAI)** — Default AI provider disagreed across the codebase. **Ruling: the default is OpenAI** (product decision) — it's the seeded `settingsStorage.DEFAULT_SETTINGS.aiProvider = 'openai'`, switchable in Settings. → Set client `useSettings.DEFAULT_PROVIDER = 'openai'` to match; updated guide §1 (default row) + §18 env table to name OpenAI as default. `runProvider`'s `default:` switch case stays Gemini as a low-level safety fallback only (never hit for a valid persisted setting). `tsc` clean.
- **[4.1] §8 — DEFERRED → Part 6** — `useReceipts` exposes `loading`; the other 3 hooks use `isLoading`. Standardize on `isLoading` when auditing the 4 page consumers (items, items/[name], insights, history) so hook + call sites change together.
- **[4.2/4.3/4.4] §15/§21 — DEFERRED → Part 8 → FIXED** — stores/units/settings mutations no longer swallow failures; they return a shared `MutationResult` and `Settings.tsx`/`settings/page.tsx` surface errors (see the Part 8 entry below for details).
- **[4.1] §9 — DEFERRED → Part 8** — `useReceipts.updateReceipt(id, updates: any)` → tighten to `Partial<SavedReceipt>` with its Part 8 consumers.
- **[5.1] §9/§15 — FIXED** — `process-receipt` used `catch (error: any)` + `error.message?.includes(...)`. → `catch (error)` with `error instanceof Error ? error.message : 'Unknown error'` narrowing; typed-error branches (`MissingApiKeyError`, `ExtractionParseError`) run first, string-sniffing kept only as a fallback for untyped provider errors. `tsc` clean.
- **[4.1 → Part 6] §8 — FIXED** — `useReceipts` renamed `loading`→`isLoading`; updated 4 page consumers (`history`, `items`, `items/[name]` incl. `receiptsLoading` value, `insights`). All hooks now expose `isLoading`. `tsc` clean.
- **[6.2] §9 — FIXED** — `app/page.tsx`: 2× `catch (err: any)` → `catch (err)` with `instanceof Error` narrowing; `handleItemChange(updatedItem: any)` → `ReceiptItem`.
- **[6.x] §— TECH DEBT (not violations)** — widespread `alert()` for user feedback (Home save flow, history, items/[name]); `items/[name]` rename does a raw `fetch` PATCH loop in the page + uses `.btn-secondary` instead of `<Button>`; `settings` `handleClearAll` doesn't `await` the async clears; `items` derivation not memoized. Candidates for a UX/refactor pass; several tie into the deferred Part 8 hook-contract work.
- **[7.x] §20 — FIXED (guide correction, not code)** — The guide said components should use named exports, but 100% of components use `export default` (and are imported as such). Corrected `DEVELOPER_GUIDE.md §20` to state: `export default` for pages/layouts **and components**; named exports for hooks/lib/utils/types/constants. No code change (refactoring 17 components would be churn against a consistent convention).
- **[7.6] §16/§17 — TECH DEBT (not violations)** — `BottomSheet` uses a 16px top radius (>4px rule), a soft blur shadow (non-retro), and `<style jsx>` keyframes instead of `globals.css`. Acceptable for the bottom-sheet pattern; revisit in a design pass (move keyframes to `globals.css`, consider 12px radius).
- **[8.11/8.5] §16 — FIXED** — Two emoji glyphs in user-facing UI: `⚠️ Warning: Dangerous Action` in `Settings.tsx` and `✓ Existing` in `EditableItemName.tsx`. → Replaced with Lucide `AlertTriangle` / `Check` icons (per the ruling: no emoji/glyphs in UI, dev logs exempt). `tsc` clean.
- **[4.1 → 8.7/8.8/8.10] §9 — FIXED (deferred #4 closed)** — `updates: any` tightened to `Partial<SavedReceipt>` across the whole chain: `useReceipts.updateReceipt`, `app/history/page.tsx` `handleUpdate`, `app/items/[name]/page.tsx` `handleReceiptUpdate`, and the `onUpdate`/`onReceiptUpdate` props on `ReceiptHistory`/`ReceiptDetailView`/`ItemDetail`. Also tightened `ReceiptDetailView.editedItems: any[]` → `ReceiptItem[]`. `tsc` clean.
- **[8.4/8.8] §9 — ACCEPTED (contained `any`)** — `tempValue`/`currentValue` in the two inline field editors (`ExtractedDataDisplay`, `ReceiptDetailView`) stay `any`. The editors write heterogeneous field types via a dynamic `{ ...item, [field]: value }` assignment; a `string | number | null` union collides with React's `value` typing (no `null`) and the dynamic key, so tightening would require casts that are no cleaner than `any`. Contained to local edit state (public APIs are now typed). Flagged as accepted debt, not a violation.
- **[4.2/4.3/4.4 → 8.11] §15/§21 — FIXED (deferred #3 closed)** — Standardized the mutation contracts. Added a shared `MutationResult { success, error? }` to `lib/types.ts`; `useStores` (`addStore`/`deleteStore`/`clearAll`), `useUnits` (`addUnit`/`deleteUnit`/`clearAll`), and `useSettings` (`setProvider`) now return it instead of `void`. `Settings.tsx` surfaces failures: add-store/add-unit via the existing inline error state, delete-store/delete-unit via `alert()`; `settings/page.tsx` `handleClearAll` now `await`s both clears (via `Promise.all`) and alerts on failure. Provider switch keeps its optimistic-rollback UX. `tsc` + lints clean.

- **[9.1] §17 — FIXED** — `.btn-danger` hard-coded `color: white` while the sibling `.btn-success` uses `var(--ivory-bg)` for the same on-color text role. → Aligned `.btn-danger` to `var(--ivory-bg)` (imperceptible visual change; removes the lone literal color in `globals.css`).
- **[9.1 → 8.4/8.9/8.11] §17 — FIXED (approved)** — Closed the component hex tech-debt. Added tokens to `globals.css` at the existing literal values (zero visual change): `--info-main: #2B5F8F`, `--warning-bg: #FFF3CD`, `--warning-border: #FFC107`, `--error-pale: #FFEBEE`. Repointed all six literal sites: `ItemsList` (`#2B5F8F`→`--info-main`; `#2D5016`→`--green-main`; `#8B3A3A`→`--error-text` — the latter two were already exact token matches), `Settings` warning box (`#fff3cd`/`#ffc107`→`--warning-bg`/`--warning-border`), and `ExtractedDataDisplay` error box (`#ffebee`→`--error-pale`). Also fixed a broken reference in `Settings` (`var(--black-primary, #1a1a1a)` → `var(--black-text)`; `--black-primary` was never defined). No hardcoded hex remains in any `.tsx`; `tsc` + lints clean.

- **[10.1] §— FIXED** — `scripts/test-gemini.js` called `require('dotenv').config(...)` but `dotenv` was never declared in `package.json`, so the smoke test threw `Cannot find module 'dotenv'`. → Dropped the `dotenv` require and added `"test:gemini": "node --env-file=.env.local scripts/test-gemini.js"` (Node 20 built-in env loading; no new dependency). `node --check` clean.
- **[10.1] §18 — TECH DEBT (not a violation)** — script hardcodes the model string and accepts an undocumented `GOOGLE_GEMINI_API_KEY` alias. Left as-is: it's a standalone `.js` that can't import the TS `GEMINI_MODEL` const, and the alias is a harmless fallback.
- **[11.2/11.3/11.4] docs — FIXED** — Reconciled the docs with the post-audit code: `CONTEXT.md` (multi-provider AI, `lib/ai/`/`settingsStorage`/`useSettings`/`/api/settings`/`defaults.ts` in the map, types moved to `lib/types.ts` w/ nullable fields + `MutationResult`, prompt at `lib/ai/prompt.ts`), `docs/PRD.md` (multi-provider overview + AI-provider setting in §3.5 + `/api/settings`), and `DESIGN_GUIDE.md` (reconcile note: no CSS Modules; accent tokens exist). `README.md` was already accurate. Removed all stale "README says Local Storage" cross-references. (`gemini_imp.md` and other root scratch docs are explicitly non-authoritative per `CONTEXT §3` and were left untouched.)

---

## Audit complete

All 11 parts reviewed. Every source file, config, and authoritative doc has been checked against `DEVELOPER_GUIDE.md`, with violations fixed and deliberate exceptions/tech-debt documented above. Cross-cutting outcomes: no `any` leaks past the storage/AI boundaries (contained edit-state `any` documented); no hardcoded hex in any `.tsx`; no emojis in UI (dev-log `✅` exempt by ruling); consistent `isLoading` + `{ success, error }` hook contracts; single-source types in `lib/types.ts`; shared constants in `lib/defaults.ts`; and docs consistent with the code. Type-check (`tsc --noEmit`) and lints clean throughout.

---

*Living document. Update Status and Findings as each part is reviewed. When a Part is fully compliant, mark it ✅ in the Progress summary.*
