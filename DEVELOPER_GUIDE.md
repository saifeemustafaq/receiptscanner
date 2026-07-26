# Receipt Scanner — Developer Guide

Baseline rules for structure, reuse, and conventions. Follow these unless there's a clear reason to deviate.

This guide is the **engineering** companion to two other authoritative docs:

- [`CONTEXT.md`](CONTEXT.md) — what the app is, how it works technically, product intent.
- [`DESIGN_GUIDE.md`](DESIGN_GUIDE.md) — the visual language (retro, Gumroad-inspired) and UI patterns.
- [`docs/PRD.md`](docs/PRD.md) — authoritative product spec.

When those docs and the code disagree, trust the code and `CONTEXT.md`, then fix the stale doc in the same change.

---

## 0. What this app is (one paragraph)

Receipt Scanner is a **mobile-first, single-tenant web app** for **community kitchens and budget-conscious volunteer organizations**. Users scan or upload receipts (images or PDFs); an AI provider (Gemini or OpenAI) extracts structured line-item data; the app stores a receipt history and derives an **item catalog** and **price-insights** view so volunteers can see, per item, where it was cheapest and how prices trend over time. The core value loop is: **capture receipts → build price history per item → decide where to shop next.** There is **no authentication** and **no database** — persistence is server-side JSON files under `data/`.

---

## 1. Tech stack

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| Framework | Next.js (App Router) | 16 |
| UI runtime | React | 19 |
| Language | TypeScript (strict mode) | 5 |
| Styling | Tailwind CSS 4 + CSS variables in `app/globals.css` | Mostly inline styles + global utility classes; **no CSS Modules currently in use** |
| AI (default) | OpenAI via `openai` (Responses API) | model `gpt-4o` — seeded `DEFAULT_SETTINGS.aiProvider` |
| AI (alternate) | Google Gemini via `@google/genai` | model `gemini-2.0-flash-exp` |
| Charts | Recharts | 3 |
| Icons | Lucide React | Never emojis |
| Persistence | Node `fs` → JSON files under `data/` | No database, no ORM |
| Auth | **None** | Single-tenant; anyone with server access sees the same data |
| Path alias | `@/*` → repo root | See `tsconfig.json` |

Scripts: `npm run dev`, `npm run build`, `npm start`, `npm run lint`.

### No auth, no database — by design (for now)

Receipt Scanner is a **single-tenant local tool**. There is no login, no session, no user model, and no database. Every write is a whole-file rewrite of a JSON file under `data/`. Do **not** introduce auth or a database unless the product direction changes. `CONTEXT.md §7.5` notes a future **MongoDB migration** — keep IDs as strings and fields camelCase to stay migration-ready, but do not build the DB layer speculatively.

---

## 2. Project structure

```
receiptscanner/
├── app/
│   ├── layout.tsx                    # Root layout: fonts, metadata, wraps children in ClientLayout
│   ├── page.tsx                      # HOME — upload/scan, AI extraction, edit, save (multi-receipt queue)
│   ├── globals.css                   # CSS variables (retro theme tokens), layout, component + utility classes
│   ├── favicon.ico
│   ├── history/page.tsx              # Receipt history (search / sort / filter / edit / delete / export)
│   ├── items/page.tsx                # Items catalog (unique items derived from receipts)
│   ├── items/[name]/page.tsx         # Item detail — price history, rename, linked receipts
│   ├── insights/page.tsx             # Insights — per-item stats + Recharts price chart
│   ├── mappings/page.tsx             # Mappings — manage raw→canonical item associations
│   ├── settings/page.tsx             # Manage stores, units, and AI provider
│   ├── api/
│   │   ├── process-receipt/route.ts  # POST — dispatch file to selected AI provider, return extracted JSON
│   │   ├── receipts/route.ts         # GET/POST/PATCH/DELETE receipts (+ GET ?action=export)
│   │   ├── stores/route.ts           # GET/POST/DELETE/PUT stores
│   │   ├── units/route.ts            # GET/POST/DELETE/PUT units (+ GET ?action=discover)
│   │   ├── settings/route.ts         # GET/PUT app settings (active AI provider)
│   │   ├── mappings/route.ts         # GET/POST/DELETE/PUT item mappings (raw → canonical)
│   │   └── ai-mappings/route.ts      # POST — AI-suggested canonical mappings for a batch (read-only)
│   └── components/                   # Presentational + interactive UI components (see below)
│       ├── ClientLayout.tsx          # 'use client' shell: Sidebar + mobile hamburger + main content
│       ├── Sidebar.tsx               # Fixed nav: Home, Items, Mappings, Insights, Receipt History, Settings
│       ├── ReceiptUpload.tsx         # File/camera input, drag-drop, multi-file staging
│       ├── ExtractedDataDisplay.tsx  # Inline click-to-edit table of extracted items
│       ├── EditableItemName.tsx      # Item-name field with autocomplete against known items
│       ├── ItemMappingControl.tsx    # Inline "map raw → canonical" control (Home review + Settings)
│       ├── ItemMappingsManager.tsx   # Mappings page: list/edit/delete mappings + discover unmapped
│       ├── AiMappingPanel.tsx        # AI batch mapping: suggest → editable preview → apply
│       ├── StoreSelection.tsx        # Store picker (canonical store per receipt)
│       ├── ReceiptHistory.tsx        # History list/table with search/sort/filter
│       ├── ReceiptDetailView.tsx     # Single-receipt detail/edit view
│       ├── ItemsList.tsx             # Items catalog grid/list
│       ├── ItemDetail.tsx            # Item price-history detail
│       ├── Settings.tsx              # Stores/units/provider management UI
│       ├── Button.tsx                # Retro button (variants)
│       ├── Card.tsx                  # Retro card (2px border + drop shadow)
│       ├── Input.tsx                 # Text input
│       ├── Select.tsx                # Dropdown
│       ├── DatePicker.tsx            # Date field (YYYY-MM-DD)
│       └── BottomSheet.tsx           # Mobile bottom-sheet overlay
├── lib/
│   ├── types.ts                      # SavedReceipt, QueueItem, ReceiptItem, ExtractedData (canonical shared types)
│   ├── defaults.ts                   # DEFAULT_STORES / DEFAULT_UNITS — client-safe seed lists shared by storage libs + hooks
│   ├── ai/                           # AI provider abstraction (see §12)
│   │   ├── index.ts                  # PROVIDERS metadata + extractReceipt() orchestrator (text-first + fallback)
│   │   ├── types.ts                  # ReceiptItem, ExtractedData, ProcessInput, ExtractionSource, ExtractionMode, ProviderResult, MissingApiKeyError
│   │   ├── pdfText.ts                # extractPdfText() — unpdf text-layer extraction + classification (text vs vision)
│   │   ├── prompt.ts                 # buildExtractionPrompt({ isPDF, sourceText? }) — shared text/vision prompt
│   │   ├── mappingPrompt.ts          # buildMappingPrompt() — AI item-mapping prompt (conservative)
│   │   ├── mapping.ts                # suggestMappings() — text→JSON mapping via active provider
│   │   ├── parseResponse.ts          # parseAndValidate() + ExtractionParseError (provider-agnostic)
│   │   ├── gemini.ts                 # extractWithGemini() — text mode OR Files API vision (JSON mode)
│   │   └── openai.ts                 # extractWithOpenAI() — text mode OR image inline / PDF via Files API (JSON mode)
│   ├── receiptStorage.ts             # File CRUD for receipts_data.json (+ export)
│   ├── storesStorage.ts              # File CRUD for stores + defaults
│   ├── unitsStorage.ts               # File CRUD for units + defaults + discovery
│   ├── settingsStorage.ts            # File CRUD for app settings (AI provider) + isValidProvider guard
│   ├── mappingsStorage.ts            # File CRUD for item mappings (upsert/delete raw → canonical)
│   ├── itemMappings.ts               # Pure raw→canonical resolution (type, normalize, index, applyItemMappings)
│   ├── units.ts                      # Unit dimensions + base-unit conversion (mass→lb, volume→l, count→ea)
│   ├── packSize.ts                   # parsePackSize() + deriveCoreName() — read pack size from item names
│   ├── measure.ts                    # resolveMeasure()/pricePerBaseUnit()/displayUnitPrice() — normalize to $/base-unit
│   ├── receiptMath.ts                # Pure receipt-math validation (line + two-tier totals reconciliation)
│   ├── itemsProcessor.ts             # Derive unique items + $/base-unit price history from receipts
│   ├── analyticsUtils.ts             # Chart data + statistics for Insights (+ getStoreColor)
│   └── hooks/
│       ├── useReceipts.ts            # Client hook: load / delete / update / export receipts
│       ├── useStores.ts              # Client hook: stores
│       ├── useUnits.ts               # Client hook: units
│       ├── useSettings.ts            # Client hook: read/update active AI provider
│       └── useMappings.ts            # Client hook: item mappings (raw → canonical)
├── data/                             # Server-side JSON persistence (see §13)
│   ├── README.md
│   ├── receipts/receipts_data.json   # Saved receipts (sample committed; other receipt JSON gitignored)
│   ├── stores/stores_data.json       # Store list
│   ├── units/units_data.json         # Unit list
│   ├── settings/settings_data.json   # App settings (auto-created; gitignored)
│   └── mappings/mappings_data.json   # Learned raw→canonical item mappings (auto-created)
├── scripts/
│   ├── test-gemini.js                # Standalone Gemini smoke-test script
│   └── test-pdf-extract.js           # Corpus text-layer classifier + filename-total oracle (npm run test:pdf)
├── docs/PRD.md                       # Authoritative product requirements
├── CONTEXT.md                        # Single source of truth: what/how/rules
├── DESIGN_GUIDE.md                   # Visual language + UI patterns
├── DEVELOPER_GUIDE.md                # This file — structure & engineering conventions
├── README.md                         # Quick start (persistence correctly described as server-side JSON — see §13)
├── tsconfig.json
├── next.config.ts
├── eslint.config.mjs
├── postcss.config.mjs
└── package.json
```

> Several root-level docs (`plan.md`, `new plan.md`, `thoughts.md`, `gemini_imp.md`, `INSIGHTS_FEATURE.md`, `ITEMS_FEATURE.md`, `REFACTORING_SUMMARY.md`) are **historical/working notes**, not authoritative. Do not treat them as specs.

### Grouping philosophy

- **Group by domain** (`lib/ai/` for extraction, `lib/*Storage.ts` for persistence, `lib/hooks/` for client data) rather than only by type.
- **Co-locate** related code. Types, helpers, and sub-components that belong to one feature live with that feature.
- **Don't extract to shared** unless there are **2+ distinct consumers**.

### Keeping the structure diagram current

When you add a route, storage lib, hook, AI provider, or component, **update this tree in the same change**. The structure diagram is the first thing a new contributor reads — if it's stale, it's useless. Also update `CONTEXT.md §3` (Directory map) if the change affects the mental model of the app.

---

## 3. Structure & components

- **One component/feature per file** — Each component lives in its own file under `app/components/`. No dumping unrelated UI or logic into a single file.
- **Clear ownership** — Every file has a single, nameable responsibility. Ask: "What is this file's job?"
- **No component library** — This project uses **hand-built retro components** (`Button`, `Card`, `Input`, `Select`, `DatePicker`, `BottomSheet`). There is **no ShadCN / MUI / Chakra**. Build new primitives in the same style rather than pulling in a UI kit.
- **Reuse the primitives** — Before hand-rolling a styled `<button>` or `<input>`, use the existing `Button` / `Input` / `Select` / `Card`. Extend the primitive if it's missing a variant; don't fork a one-off.

---

## 4. DRY (Don't Repeat Yourself)

- **Reuse first** — Before adding new code, check for an existing component, hook, storage lib, or util you can reuse.
- **Shared code** — Extract only when used by **2+ distinct modules**. If used by one module, keep it there.
- **Watch for duplication across storage libs.** `receiptStorage.ts`, `storesStorage.ts`, `unitsStorage.ts`, and `settingsStorage.ts` all follow the same `getXDataDir()` / `ensureDirExists()` / read-JSON / write-JSON shape. When adding a fifth store, mirror the existing pattern exactly. If the boilerplate ever becomes painful, extract a shared `readJsonFile()/writeJsonFile()` helper rather than copy-pasting a fourth variation.
- **Derived data is computed once.** Item catalog and analytics come from `lib/itemsProcessor.ts` and `lib/analyticsUtils.ts`. Extend those — never re-derive per-unit pricing or price-history logic inside a page component.

---

## 5. File size (LOC)

- **Target:** Most source files **≤ 300 lines**.
- **LOC is a signal, not the goal** — Going over 300 is allowed when it improves cohesion or readability (the extraction prompt in `lib/ai/prompt.ts` and some page components are legitimately long).
- **Do not split only to hit 300** if the result is worse: more files to open, duplicated types, or pass-through wrappers.
- **Heuristic:** If you need to open **3+ files** to understand one flow, you probably split too much.

---

## 6. When to split a file

Split only when there's a **real boundary**:

- Different responsibilities (e.g. provider dispatch vs. per-provider call vs. response parsing — see how `lib/ai/` is decomposed).
- Stable interfaces (e.g. storage lib vs. API route).
- A reusable component with a clear owner.
- A domain sub-area you can name clearly (e.g. item derivation vs. chart/statistics).

Every new file must answer: **"What is its single responsibility?"**

The `lib/ai/` folder is the reference example of good splitting: `index.ts` dispatches, `gemini.ts`/`openai.ts` own one provider each, `prompt.ts` owns the prompt, `parseResponse.ts` owns validation, `types.ts` owns shared shapes.

---

## 7. Helpers & shared code

- **Prefer vertical slices over generic helpers** — Avoid `utils/helpers/common/misc` files that exist only to move lines out.
- A helper is valid only if it's either **domain-specific** (e.g. `analyticsUtils.ts` for chart math, `itemsProcessor.ts` for price history) or **truly general** and used by **2+ distinct modules**.
- **Single consumer → keep it co-located** (same folder or same file).
- **Dates** — Store as `YYYY-MM-DD`. Display/`uploadDate` computed in **Pacific time** (`America/Los_Angeles`). Keep date handling consistent; don't scatter ad-hoc `new Date()` formatting across pages.

---

## 8. Naming conventions

| Category | Convention | Examples |
|----------|-----------|----------|
| Component files | PascalCase `.tsx` | `ReceiptUpload.tsx`, `ExtractedDataDisplay.tsx`, `Card.tsx` |
| Lib / util files | camelCase `.ts` | `itemsProcessor.ts`, `analyticsUtils.ts`, `receiptStorage.ts` |
| Hooks | `useX.ts` (camelCase) | `useReceipts.ts`, `useSettings.ts` |
| AI provider files | lowercase in `lib/ai/` | `gemini.ts`, `openai.ts`, `prompt.ts` |
| Components | PascalCase | `ReceiptHistory`, `StoreSelection` |
| Functions / variables | camelCase | `saveReceipt`, `buildExtractionPrompt`, `getStoreColor` |
| Types / interfaces | PascalCase | `SavedReceipt`, `ExtractedData`, `ProcessedItem` |
| Constants | UPPER_SNAKE_CASE | `GEMINI_MODEL`, `OPENAI_MODEL`, `AI_PROVIDERS` |

- **Be consistent within a group.** Every storage lib is `<domain>Storage.ts`; every hook is `use<Domain>.ts`. New additions must follow the same pattern.
- **Note the two file-casing conventions:** components in `app/components/` are **PascalCase**; everything in `lib/` is **camelCase**. Match the folder you're in.

---

## 9. TypeScript & type safety

- **Strict mode is on** (`strict: true` in `tsconfig.json`). Do not weaken it.
- **Prefer real types in new code.** Props, return values, and hook return shapes should be typed.
- **The JSON storage boundary is the one accepted `any` zone.** `lib/*Storage.ts` use `any` for the raw JSON they read/write (documented in `CONTEXT.md §7.3`). This is tolerated at that boundary only — **do not let `any` leak upward** into components, hooks, or analytics. Convert to a real type (`SavedReceipt`, `ProcessedItem`, etc.) as soon as data crosses out of the storage lib.
- **Validate AI output at runtime.** Never trust the shape of a model response. `parseAndValidate()` in `lib/ai/parseResponse.ts` is the single choke point: it strips markdown fences, extracts the JSON object, checks `items[]` and `total`, and normalizes `subtotal`/`tax` to number-or-null. It deliberately **keeps `unitPrice` strictly as-printed (no backfill)** so downstream math validation has an honest input. Any new provider MUST route its raw text through `parseAndValidate()` — do not hand-roll a second parser.
- **Shared types** live in `lib/types.ts` (app-level) and `lib/ai/types.ts` (extraction). Feature-specific types can be co-located with the feature (e.g. `ProcessedItem` in `itemsProcessor.ts`).

---

## 10. Imports

- **Use `@/` for cross-directory imports.** The alias `@/*` maps to the repo root.

  ```ts
  // Good
  import { SavedReceipt } from '@/lib/types';
  import { extractReceipt, PROVIDERS } from '@/lib/ai';

  // Bad
  import { SavedReceipt } from '../../lib/types';
  ```

- **Relative imports** are fine within the **same directory** (e.g. `lib/ai/gemini.ts` importing `./prompt`, `./types`).
- **React imports** — Use direct named imports: `import { useState, useEffect } from 'react'`.
- **`import type`** — Use `import type` when importing only types, to keep runtime bundles clean (see `lib/ai/*` for the pattern).
- **Client components** — Any file using hooks, browser APIs, or event handlers needs the `'use client'` directive at the top. Most pages here are client components because they fetch via hooks and derive data with `useMemo`.

---

## 11. Next.js 16 conventions

This project uses **Next.js 16** (App Router). If you hit an unfamiliar API, check the docs in `node_modules/next/dist/docs/` before assuming older-version behavior.

### No `middleware.ts` / no `proxy.ts`

There is **no auth guard**. This app has no `middleware.ts` and no `proxy.ts`, and it should stay that way unless auth is introduced. Do not add a request guard for a single-tenant local tool.

### Route handlers (`app/api/*/route.ts`)

- Use named method exports (`GET`, `POST`, `PATCH`, `DELETE`, `PUT`).
- **Any route that touches the filesystem or an AI SDK must set `export const runtime = 'nodejs'`.** All current routes do. Never let a data/AI route run on the Edge runtime — `fs` and the provider SDKs require Node.
- **`process-receipt` sets `export const maxDuration = 60`** because AI extraction (especially multi-page PDFs) is slow. Keep this; don't lower it.
- Routes are **thin controllers**: validate input → call a storage lib or `extractReceipt()` → return JSON. No business logic in routes (see §12–13).

### Server vs. client components

- **Default to server components.** Add `'use client'` only when you need hooks, browser APIs, or event handlers.
- Route handlers and storage libs run server-side only. Client code reaches data exclusively through `fetch` (usually via a `lib/hooks/*` hook).

---

## 12. AI extraction architecture (`lib/ai/`)

Receipt extraction is **provider-abstracted**. The active provider is a user setting; the route dispatches to it. This is the most important domain subsystem — understand it before touching extraction.

### Flow

```
app/page.tsx (or queue) → POST FormData(file[, provider]) → /api/process-receipt
  → resolve provider (form field override ?? settingsStorage.getSettings().aiProvider)
  → extractReceipt(provider, { file, isPDF })          // lib/ai/index.ts (orchestrator)
      ├── image (non-PDF)          → VISION source { kind: 'file' }
      └── PDF → extractPdfText()   // lib/ai/pdfText.ts (unpdf)
              ├── hasTextLayer     → TEXT source { kind: 'text' }  (cheaper/faster, no OCR)
              │      └── on parse failure / 0 items → fall back once to VISION
              └── image-only/garbled → VISION source { kind: 'file' }
  → runProvider(provider, source, isPDF)               // pure dispatcher
      ├── extractWithGemini(source, isPDF)  → text OR Files API vision → generateContent (gemini-2.0-flash-exp)
      └── extractWithOpenAI(source, isPDF)  → text OR image inline / PDF via Files API → Responses API (gpt-4o)
  → each provider builds prompt via buildExtractionPrompt({ isPDF, sourceText? })  // lib/ai/prompt.ts
  → each provider runs in JSON mode (Gemini responseMimeType / OpenAI json_object)
  → each provider validates raw text via parseAndValidate()        // lib/ai/parseResponse.ts
  → returns { data: ExtractedData, modelUsed, mode }
→ route returns { data, metadata: { processingTime, modelUsed, provider, mode, pageCount, itemCount } }
```

**Text-first strategy:** digital PDFs carry a real text layer (Instacart/Amazon HTML-to-PDF receipts), so `extractReceipt` sends **text** to the model instead of uploading page images — cheaper, faster, and free of OCR misreads. Image-only PDFs (photo saved as PDF), scans, garbled text layers, and raw images use the existing **vision** path. Both converge on `parseAndValidate()` and the same `ExtractedData` shape, so storage/items/insights are unchanged. Classification thresholds live in `lib/ai/pdfText.ts`.

### Rules for adding or changing a provider

1. **New provider = new file** in `lib/ai/` exporting `extractWithX(source: ExtractionSource, isPDF: boolean): Promise<ProviderResult>`. Branch on `source.kind`: `'text'` sends `source.text` inline (return `mode: 'text'`); `'file'` uploads/inlines the file for vision (return `mode: 'vision'`).
2. **Register it** in `PROVIDERS` and the `runProvider` switch in `lib/ai/index.ts`, add its id to `AI_PROVIDERS` in `lib/settingsStorage.ts`, and surface it in the settings UI. The `extractReceipt` orchestrator and the text/vision routing are provider-agnostic — you get them for free.
3. **Reuse the shared prompt** (`buildExtractionPrompt`) and the shared validator (`parseAndValidate`). Do not fork either — downstream analytics depend on the exact per-unit pricing model the prompt encodes.
4. **Throw `MissingApiKeyError(envVar, label)`** when the key is absent, so the route can return a clear "add X to .env.local" message.
5. **Throw `ExtractionParseError`** (via `parseAndValidate`) for malformed responses; the route surfaces a truncated `rawResponse` for debugging. In text mode this also triggers the orchestrator's one-shot fallback to vision.
6. **Keep `temperature: 0.1`** and **request JSON mode** (Gemini `responseMimeType: 'application/json'`, OpenAI `text.format.type: 'json_object'`) — this is factual extraction, not creative generation.

### The prompt encodes domain semantics (don't casually edit)

`lib/ai/prompt.ts` enforces the JSON output shape and an **as-printed contract**: the model records only what the receipt shows (name *including* any size text, quantity from the count column defaulting to 1, printed `unit`/`unitPrice` or `null`, `totalPrice`, plus `subtotal`/`tax`). It must **not** decide bulk-vs-packaged, convert units, or compute per-unit prices — all pack-size parsing and price normalization happen in deterministic code (`lib/measure.ts`) downstream. It also has multi-page PDF handling, a **discounted-line-total rule** (use the actually-charged price when a promo shows two amounts, with `unitPrice: null` on those lines — critical for text mode, which has no strikethrough cue), and a `sourceText` branch for text-mode input. The same rules apply to both text and vision modes — do not fork them. If you change extraction behavior, keep it as-printed — the measure layer and insights math assume that contract. See `CONTEXT.md §4.4`.

---

## 13. Persistence & storage libs (`lib/*Storage.ts`)

- **File-based JSON only.** All persistence is **synchronous Node `fs`** reads/writes of JSON files under `data/`, wrapped in `lib/*Storage.ts`. There is no database.
- **Layering is strict:** `client → API route → lib/*Storage.ts → fs`. Client code must **never** import `fs` or a storage lib directly; it goes through the API routes (usually via a `lib/hooks/*` hook).
- **Auto-create + seed.** Each storage lib ensures its directory exists; missing store/unit/settings files are seeded with defaults.
- **Writes are whole-file rewrites (no locking).** Fine for single-user/local use. Keep this limitation in mind before adding anything concurrent or high-frequency.

### Storage lib shape (mirror this for any new store)

Every storage lib exposes the same skeleton:

```ts
export function getXDataDir(): string { /* path.join(process.cwd(), 'data', 'x') */ }
export function ensureXDataDirExists(): void { /* mkdir recursive if missing */ }
export function getAllX(): X[] { /* read + JSON.parse, [] on miss/error */ }
export function saveX(...): boolean { /* read, mutate, writeFileSync, log ✅, false on error */ }
// ...update / delete / export as needed
```

- Return `boolean` success from mutating functions; log errors with `console.error` and return `false` (don't throw across the fs boundary).
- Log successes with a `console.log('✅ ...')` line (existing convention). This `✅` in server logs is the **one explicit exemption** to the no-emoji rule (§16) — it never reaches the UI.

### Data safety

- `data/receipts/receipts_data.json` is **committed as sample data** (force-included in `.gitignore`); other receipt JSON is ignored. **Never commit real/private receipt data.**
- **Never commit secrets.** `GEMINI_API_KEY` (and optionally `GOOGLE_GEMINI_API_KEY` / `OPENAI_API_KEY`) live only in `.env.local`, which is gitignored.

### Persistence is server-side (not browser storage)

Persistence is **server-side JSON files under `data/`**, never browser/local storage. `README.md` now states this correctly (a "Data & persistence" section); if you ever see a "Local Storage (browser)" claim resurface anywhere, it's wrong — trust the code and `CONTEXT.md`.

---

## 14. API route conventions

Every route handler **must** be wrapped in a top-level try/catch and log errors with context.

```ts
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // validate required fields → return 400 with { success: false, error } if missing
    // call storage lib / extractReceipt
    return NextResponse.json({ success: true, /* ...data */ });
  } catch (error) {
    console.error('Error <doing X>:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to <do X>' },
      { status: 500 }
    );
  }
}
```

### The response-shape convention (important — differs from a plain `{ error }`)

- **CRUD/data routes** (`receipts`, `stores`, `units`, `settings`) return **`{ success: boolean, ... }`**:
  - Success: `{ success: true, receipts }` / `{ success: true, message }`.
  - Failure: `{ success: false, error: string }` with an appropriate status (`400` validation, `500` server).
- **`process-receipt` is the exception**: it returns `{ data, metadata }` on success and `{ error, details? }` on failure (no `success` flag). This mirrors what the Home page expects — keep it as-is.
- Client hooks branch on `data.success` for CRUD routes. If you add a CRUD route, follow the `{ success }` shape so the hooks stay uniform.

### Mandatory rules

1. **Top-level try/catch** wrapping the entire handler body.
2. **`console.error` in every catch**, with a message identifying the operation.
3. **Validate inputs first** — check required fields / file presence / file type and return `400` before doing work.
4. **`runtime = 'nodejs'`** on every route (all touch `fs` or an AI SDK).
5. **No business logic in routes** — orchestrate only. Persistence goes to a storage lib; extraction goes to `extractReceipt`; derivation goes to `itemsProcessor`/`analyticsUtils`.
6. **File export** (`GET /api/receipts?action=export`) returns a raw `NextResponse` with `Content-Type` + `Content-Disposition` headers, not JSON.

---

## 15. Error handling

### Server-side

- Wrap handlers and storage mutations; **always `console.error`** the failure.
- Storage libs return `false` on failure rather than throwing across the fs boundary.
- The AI subsystem uses **typed errors** (`MissingApiKeyError`, `ExtractionParseError`) so the route can produce specific, actionable messages. Prefer typed errors over string-sniffing for new failure modes.

### Client-side

- **Every `fetch` must handle failure.** Client hooks (`useReceipts`, `useStores`, `useUnits`, `useSettings`) already: check `data.success`, `console.error` on catch, and return `{ success: false, error }` to the caller.
- **Never silently swallow a failed request.** Surface it to the user (inline message / error state). The user just scanned a receipt — they must know if save/extraction failed.
- Follow the existing hook pattern (loading / error state + `{ success, error }` return) rather than calling `fetch` ad-hoc inside a component.

---

## 16. UI & design conventions

The full visual language is in [`DESIGN_GUIDE.md`](DESIGN_GUIDE.md). Engineering-relevant rules:

- **Retro, warm, Gumroad-inspired.** Chunky look: **2px+ borders everywhere**, retro drop shadow `--shadow-retro` (`4px 4px 0 #1A1A1A`), border-radius max 4px (pills/badges 12px).
- **Use the CSS variables**, never hard-coded hex, for new UI. Palette tokens (`--golden-*`, `--green-*`, `--ivory-*`, `--black-*`, `--error-*`, etc.) live in `app/globals.css`.
- **Icons: Lucide React only. NEVER emojis in UI or user-facing strings.** This is a hard rule (2px stroke; sizes 16/20/24/32). Icon-only buttons need an `aria-label`. **One explicit exemption:** the `✅` status marker in server-side `console.log` lines (the storage-lib convention, §13) — those are dev logs, never rendered to the user, and may keep it.
- **Light mode only.** No dark mode, no gradients, no glassmorphism/neumorphism, no thin borders, no animations > 0.3s.
- **Mobile-first & responsive.** Breakpoints: Mobile <640px, Tablet 640–1024px, Desktop >1024px. Sidebar collapses to a hamburger at ≤768px (`ClientLayout`). Tables become stacked cards on mobile.
- **Copy:** clear, direct, action-oriented, community-focused ("we", "our kitchen").
- **Accessibility:** WCAG AA contrast, 44px+ touch targets, visible focus (`2px solid #D4AF37`), semantic HTML.

### Known UI tech debt (candidates for refactor, per `CONTEXT.md §7.5`)

- `ExtractedDataDisplay` reads `window.innerWidth` at render for desktop/mobile switching — **not resize-reactive**. Prefer a resize-aware approach when reworking it.
- It uses inline styles rather than the documented CSS-Grid table pattern from the design guide.
- CSV export exists in the API but the UI only triggers JSON export.

---

## 17. Styling approach

- **Tailwind CSS 4** + a large set of **CSS variables and global utility/component classes** in `app/globals.css`. There is **no `tailwind.config.ts`** (v4 config is CSS-driven) and **no CSS Modules** currently in use, despite what `DESIGN_GUIDE.md §Implementation` suggests. Match the code: inline styles + global classes + CSS variables.
- **Design tokens are CSS custom properties.** Reference `var(--golden-main)` etc.; do not hard-code `#D4AF37` in components.
- When adding shared visual patterns, prefer a **global utility class in `globals.css`** or a **reusable component** over repeating inline style objects across files.

---

## 18. Constants & magic values

- **No magic numbers/strings in domain logic.** If a literal carries meaning or repeats, name it.
- **Model names, provider ids, and defaults are already centralized** — `GEMINI_MODEL`/`OPENAI_MODEL` in their provider files, `PROVIDERS` in `lib/ai/index.ts`, `AI_PROVIDERS`/`DEFAULT_SETTINGS` in `lib/settingsStorage.ts`, and default store/unit lists in their storage libs. Extend these; do not scatter duplicate literals.
- **Price float tolerance** (`0.01`) used in dedup logic lives with `itemsProcessor.ts` — keep price-comparison tolerances there, not inline in pages.

### Environment variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `OPENAI_API_KEY` | OpenAI API key (default provider) | Yes, to use OpenAI |
| `GEMINI_API_KEY` | Google Gemini API key (alternate provider) | Yes, to use Gemini |
| `GOOGLE_GEMINI_API_KEY` | Accepted fallback name for the Gemini key | Optional |

These live only in `.env.local` (gitignored). At least one provider's key must be present for extraction to work; the active provider is chosen in Settings and defaults to **OpenAI** (the seeded `DEFAULT_SETTINGS.aiProvider`).

---

## 19. Derived data: items & analytics

A chain of pure modules turns the flat receipt list into everything the Items and Insights pages show. **Extend these — never re-derive in a page.** The governing rule: **only as-printed values are stored; every measurement, comparison, and validation is derived at read time.** This is why analytics self-heal — correcting the derivation retroactively fixes all existing receipts with no migration.

- **`lib/itemMappings.ts`** → the **non-destructive mapping overlay** applied *before* everything below. `applyItemMappings(receipts, mappings)` returns receipts with each raw line-item name resolved to its canonical name (raw names are never rewritten in storage). Every read surface (Items, Item detail, Insights, Home autocomplete) wraps its receipts with this first, so a mapping like `AXFFDJ → Ginger` retroactively consolidates history and is reversible. `suggestCanonicalName(rawName, candidates)` powers the **one-tap smart suggestion** on the map control: it scores the raw's size-stripped core against existing canonical names *and the core itself* (exact / specific-variant→general / strong-typo), so `"Cilantro 24 ct"` proposes `"Cilantro"` while opaque codes (`"AXFFDJ"`) return `null`. Keep it pure (no `fs`) — it is bundled on the client.
- **`lib/units.ts` + `lib/packSize.ts` + `lib/measure.ts`** → the **measure layer**. `resolveMeasure(item)` normalizes any line to a base-unit quantity (mass→lb, volume→l, count→ea) via a total, guarded ladder: (a) trust a printed weight/volume unit, else (b) parse a pack size from the name (`parsePackSize` — count × size), else (c) count. `parsePackSize` also recognizes **count packs** (`"24 ct"`, `"12 pk"`, `"8 pieces"` → 24/12/8 ea) but always ranks a mass/volume token above a count token (a `$/lb` comparison beats `$/ea`); `resolveMeasure` guards against double-counting when the printed quantity equals the parsed count (e.g. `qty 24` **and** name `"24 ct"`). `pricePerBaseUnit()` divides `totalPrice` by that quantity to yield `$/base-unit`, tagged with its `dimension`. Old rows (`qty 226, unit g`) and new rows (`qty 1, name "…226 G"`) converge on the same result. `displayUnitPrice()` is for UI display only — never feed it to analytics.
- **`lib/itemsProcessor.ts`** → `ProcessedItem[]`: groups the (mapping-resolved) line items by **`groupKey(name) = normalizeItemName(deriveCoreName(name))`** (size tokens stripped so loose/bulk/packaged variants fold together), prices each entry via `pricePerBaseUnit`, and dedups per **store + dimension** (`applyPriceVariationRules`: keep on price change at same store/dimension or on store/dimension change; skip same within `0.01`). Each item carries a **primary `dimension`** = the *dominant* (most-frequent) one; `primaryDimensionHistory(item)` is the single guard every consumer uses so comparisons never mix `$/lb` with `$/ea`. `getItemByName` looks up by `groupKey`, so display names round-trip from the URL.
- **`lib/analyticsUtils.ts`** → chart data + statistics, both restricted to the primary dimension; `PriceStatistics` exposes `baseUnit` and `mixedDimensions` so the UI can label `$/lb` and warn when an item spans units. `getStoreColor` gives known chains brand colors and cycles a palette otherwise.
- **`lib/receiptMath.ts`** → pure, non-blocking validation surfaced on the Home review screen (`ExtractedDataDisplay`). `validateLineItem` checks `round(qty × unitPrice)` vs the printed total **only when a unit price was actually printed** (never against a computed value). `validateReceiptTotals` reconciles in two tiers (lines vs subtotal; subtotal + tax vs total) and reports any residual as an informational "unaccounted adjustments" note. Findings never block saving (§15).

Keep these functions deterministic and free of I/O so pages can `useMemo` over them safely. **Item mappings are learned, not destructive:** the Home review screen and item-detail rename create/update mappings (via `useMappings` / `/api/mappings`) rather than rewriting receipt line-item names.

---

## 20. Exports

- **`export default`** — Next.js pages and layouts (framework requirement) **and React components** in `app/components/`. This is the established, 100%-consistent convention in this codebase: every component is a default export and is imported as such (`import Button from './components/Button'`). Keep it — do not mix named component exports in.
- **Named exports** — Everything else: hooks (`useReceipts`), storage functions, AI providers, `lib/` utilities, types, and constants.
- **One default export per component file.** Co-located helper types/subcomponents that a file needs internally can be named exports in the same file, but the component itself is the default export.

---

## 21. Client-side data fetching

- **No global state library.** Pages use `useState` + `useEffect` + `fetch`, usually wrapped in a `lib/hooks/*` hook, and derive views with `useMemo`.
- **Prefer the hooks.** `useReceipts`, `useStores`, `useUnits`, and `useSettings` own load/mutate/refetch and expose `{ data, loading, error, ...actions }`. Add data access there rather than calling `fetch` inline in a component.
- **Always handle loading, error, and empty states** on every fetch-driven page.

---

## Quick checklist

| Do | Don't |
|----|-------|
| One clear responsibility per file | Dump unrelated UI/logic into one file |
| Reuse `Button`/`Card`/`Input`/`Select` and the `lib/hooks/*` hooks | Hand-roll one-off styled inputs or inline `fetch` |
| Route all extraction through `extractReceipt` + shared prompt + `parseAndValidate` | Fork the prompt or write a second response parser |
| Add a new provider as a `lib/ai/*` file + register in `PROVIDERS`/`AI_PROVIDERS` | Hardcode a provider inside the route or component |
| Throw `MissingApiKeyError` / `ExtractionParseError` for AI failures | String-sniff error messages for new AI failure modes |
| Keep persistence in `lib/*Storage.ts`; go client → API → storage → fs | Import `fs` or a storage lib from client code |
| Mirror the storage-lib skeleton (dir/ensure/get/save, return boolean) | Invent a new persistence shape per store |
| Set `runtime = 'nodejs'` on every route; keep `maxDuration = 60` on process-receipt | Run data/AI routes on the Edge runtime |
| Return `{ success, ... }` from CRUD routes; keep process-receipt's `{ data, metadata }` | Mix response shapes so hooks can't branch on `success` |
| Wrap handlers in try/catch and `console.error` with context | Leave routes without error handling |
| Convert JSON `any` to real types as it leaves a storage lib | Let `any` leak into components/hooks/analytics |
| Extend `itemsProcessor`/`analyticsUtils` for derived data | Re-derive price history or stats inside a page |
| Store dates as `YYYY-MM-DD`; display/uploadDate in Pacific time | Scatter ad-hoc date formatting across pages |
| Use CSS variables + global classes + Lucide icons | Hard-code hex, add CSS Modules, or use emojis |
| PascalCase component files, camelCase lib files, `useX` hooks | Invent new naming/casing per file |
| Use `@/` for cross-directory imports; `import type` for type-only | Use deep relative paths (`../../..`) |
| Keep `.env.local` out of git; document any new env var here | Commit secrets or real receipt data |
| Update this tree + `CONTEXT.md §3` when structure changes | Let the structure diagram or CONTEXT go stale |
| Read `node_modules/next/dist/docs/` for Next.js 16 APIs | Assume older Next.js conventions |

---

*Keep this guide open when making structure or refactor decisions. It is a living document — update it whenever the architecture or conventions change, alongside `CONTEXT.md`.*
