# Receipt Scanner — Project Context

> Single source of truth for what this app is, how it works technically, and the rules we follow during development. Read this before starting any work. Keep it updated as the project evolves.

---

## 1. What the app is

**Receipt Scanner** is a mobile-first web app that lets users scan or upload receipts (images or PDFs), automatically extract structured line-item data using a pluggable **AI provider (OpenAI or Google Gemini, switchable in Settings)**, and manage a history of receipts. On top of that history it builds an **item catalog** and a **price-insights** view so users can see, per item, where it was cheapest / most expensive and how prices trend over time.

### Who it's for and why
The primary audience is **community kitchens and similar budget-conscious, volunteer-run organizations**. Volunteers are responsible for buying each item wherever it's cheapest (e.g. onions cheapest at Walmart, tomatoes cheapest at Costco). The app solves three real problems:

- **No historical memory** — people forget where an item was cheapest.
- **No single place to document/compare** — no shared record of receipts and prices.
- **Manual comparison is error-prone** — relying on memory or ad-hoc notes.

So the core value loop is: **capture receipts → build price history per item → use Insights to decide where to shop next.**

### Key characteristics
- **No authentication.** Single-tenant; anyone with server access sees the same data.
- **File-based persistence.** Data lives in JSON files under `data/` (no database yet).
- **Mobile-first**, retro-styled UI (see design rules in §6).

> Persistence is **server-side JSON files** under `data/` via Next.js API routes + `lib/*Storage.ts` — there is no browser storage and no database. (`README.md` now states this correctly too.)

---

## 2. Tech stack

| Area | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router) |
| UI runtime | **React 19** |
| Language | **TypeScript** (strict mode on) |
| Styling | **Tailwind CSS 4** + centralized CSS variables in `app/globals.css` (mostly inline styles + global utility classes; no CSS Modules currently in use) |
| AI | Pluggable provider abstraction in `lib/ai/`: **OpenAI** via `openai` (`gpt-4o`) and **Google Gemini** via `@google/genai` (`gemini-2.0-flash-exp`). Active provider is stored in settings and switchable in Settings; default is **OpenAI**. |
| Charts | **Recharts** |
| Icons | **Lucide React** (never emojis) |
| Path alias | `@/*` → repo root (see `tsconfig.json`) |

Scripts: `npm run dev`, `npm run build`, `npm start`, `npm run lint`, `npm run test:gemini` (standalone API-key smoke test).

Environment: `.env.local` should contain a key for each provider you plan to use — `OPENAI_API_KEY` and/or `GEMINI_API_KEY` (the Gemini path also accepts `GOOGLE_GEMINI_API_KEY`). `.env*` is gitignored.

---

## 3. Directory map

```
app/
  layout.tsx                 Root layout, fonts, wraps children in ClientLayout
  page.tsx                   HOME — upload/scan, AI extraction, edit, save (incl. multi-receipt queue)
  history/page.tsx           Receipt history (search/sort/filter/edit/delete/export)
  items/page.tsx             Items catalog (unique items from receipts)
  items/[name]/page.tsx      Item detail — price history, rename, linked receipts
  insights/page.tsx          Insights — per-item stats + Recharts price chart
  mappings/page.tsx          Mappings — manage raw→canonical item associations
  settings/page.tsx          Manage stores, units, and AI provider
  globals.css                CSS variables, layout, component + utility classes
  api/
    process-receipt/route.ts POST — send file to the active AI provider, return extracted JSON
    receipts/route.ts        GET/POST/PATCH/DELETE receipts (+ ?action=export)
    stores/route.ts          GET/POST/DELETE/PUT stores
    units/route.ts           GET/POST/DELETE/PUT units (+ GET ?action=discover)
    settings/route.ts        GET/PUT app settings (active AI provider)
    mappings/route.ts        GET/POST/DELETE/PUT item mappings (raw → canonical)
    ai-mappings/route.ts     POST — AI-suggested canonical mappings for a batch (read-only)
  components/                Presentational + interactive UI components

lib/
  types.ts                   SavedReceipt, QueueItem, ReceiptItem, ExtractedData, MutationResult (canonical shared types)
  defaults.ts                DEFAULT_STORES / DEFAULT_UNITS (client-safe, shared by hooks + storage libs)
  receiptStorage.ts          File CRUD for receipts_data.json
  storesStorage.ts           File CRUD for stores + defaults
  unitsStorage.ts            File CRUD for units + defaults + discovery
  settingsStorage.ts         File CRUD for settings_data.json (active AI provider)
  mappingsStorage.ts         File CRUD for item mappings (raw → canonical)
  itemMappings.ts            Pure raw→canonical resolution (type, normalize, index, applyItemMappings)
  units.ts                   Unit dimensions + base-unit conversion (mass→lb, volume→l, count→ea)
  packSize.ts                parsePackSize() + deriveCoreName() — read pack size from item names
  measure.ts                 resolveMeasure/pricePerBaseUnit/displayUnitPrice — normalize to $/base-unit
  receiptMath.ts             Pure receipt-math validation (line + two-tier totals reconciliation)
  itemsProcessor.ts          Derive unique items + $/base-unit price history from receipts
  analyticsUtils.ts          Chart data + statistics for Insights (dimension-scoped)
  ai/
    index.ts                 Provider registry (PROVIDERS) + extractReceipt orchestrator (text-first + fallback)
    pdfText.ts               unpdf text-layer extraction + text-vs-vision classification
    gemini.ts / openai.ts    Per-provider extraction: text OR vision (shared prompt + validation, JSON mode)
    prompt.ts                Single shared extraction prompt for text + vision (domain semantics)
    mappingPrompt.ts         AI item-mapping prompt (conservative: preserve product distinctions)
    mapping.ts               suggestMappings() — text→JSON mapping via the active provider
    parseResponse.ts         Response cleaning + runtime validation → ExtractedData
    types.ts                 AI-layer types incl. ExtractionSource/ExtractionMode (re-exports canonical receipt shapes)
  hooks/
    useReceipts.ts           Client hook: load/delete/update/export receipts
    useStores.ts             Client hook: stores
    useUnits.ts              Client hook: units
    useSettings.ts           Client hook: active AI provider + PROVIDER_OPTIONS
    useMappings.ts           Client hook: item mappings (raw → canonical)

data/
  receipts/receipts_data.json  Saved receipts (committed sample; other json gitignored)
  stores/stores_data.json      Store list
  units/units_data.json        Unit list
  settings/settings_data.json  App settings (active AI provider)
  mappings/mappings_data.json  Learned raw→canonical item mappings

docs/PRD.md                  Full product requirements (authoritative product spec)
DESIGN_GUIDE.md              Full design system (authoritative visual spec)
```

There are also several planning/scratch docs at the root (`plan.md`, `new plan.md`, `thoughts.md`, `gemini_imp.md`, `INSIGHTS_FEATURE.md`, `ITEMS_FEATURE.md`, `REFACTORING_SUMMARY.md`) — historical/working notes, not authoritative.

---

## 4. Technical inner workings

### 4.1 Data flow (capture → save)
1. **Home (`app/page.tsx`)** — user selects 1+ files via `ReceiptUpload`.
   - **Single file:** processed immediately.
   - **Multiple files (up to 5):** put into a `receiptQueue`, processed **in parallel**; user steps through each (`currentQueueIndex`) to confirm store/date, edit items, and save one at a time.
2. Each file is POSTed as `FormData` to **`/api/process-receipt`**.
3. That route (`runtime: 'nodejs'`, `maxDuration: 60`):
   - Validates file type (image/* or application/pdf).
   - Reads the active provider from settings and calls the **`extractReceipt` orchestrator** in `lib/ai`, which picks a **text-first** strategy: a digital PDF's text layer (via `lib/ai/pdfText.ts` / unpdf) is sent to the model as **text** (cheaper/faster, no OCR misreads); image-only/garbled PDFs and raw images use the **vision** path. If a text attempt fails to parse or returns 0 items, it falls back once to vision.
   - The selected provider (OpenAI or Gemini) runs at `temperature: 0.1` in **JSON mode** (Gemini `responseMimeType`, OpenAI `json_object`).
   - Both providers and both modes use the **single shared prompt** (`lib/ai/prompt.ts`) that enforces the output JSON shape, the **as-printed contract** (no per-unit math in the model), and the **discounted-line-total** rule (see §4.4). PDFs get multi-page handling instructions.
   - The shared `parseResponse` (`lib/ai/parseResponse.ts`) cleans the response (strips ``` fences, regex-extracts the `{...}`), `JSON.parse`s it, validates `items[]` and `total`, normalizes `subtotal`/`tax` to number-or-null, and **keeps `unitPrice` strictly as-printed (no back-fill)** so downstream math validation has an honest input.
   - Returns `{ data, metadata }` — `metadata` includes `mode` (`text`/`vision`) and, for PDFs, `pageCount`.
4. User reviews/edits items in **`ExtractedDataDisplay`** (inline click-to-edit for quantity, unit, unit price, total; item name via `EditableItemName` with autocomplete). Editing quantity or unit price **auto-recomputes total**.
5. On **Save**, `app/page.tsx` builds a `SavedReceipt` (id = `Date.now().toString()`, `uploadDate` computed in **Pacific time**, `timestamp` = ISO now) and POSTs to **`/api/receipts`**, which appends it to `receipts_data.json`.

### 4.2 Persistence layer
- All persistence is **synchronous Node `fs`** reads/writes of JSON files under `data/`, wrapped in `lib/*Storage.ts`. Directories are auto-created; missing store/unit files are seeded with defaults.
- API routes are thin controllers that validate input and delegate to the storage libs.
- Client code never touches `fs`; it goes through the API routes (via the `lib/hooks/*` hooks or direct `fetch`).

### 4.3 Items & analytics derivation
- **Item mappings (`lib/itemMappings.ts`)** are a **non-destructive** overlay applied *before* derivation: `applyItemMappings(receipts, mappings)` returns receipts with each raw line-item name resolved to its canonical name (raw names in storage are never rewritten). Every read surface (Items, Item detail, Insights, Home autocomplete) resolves receipts through this first, so mapping `AXFFDJ → Ginger` retroactively folds those purchases into "Ginger" and is reversible by deleting the mapping. Mappings are learned on the Home review screen and managed on the dedicated **Mappings page** (`app/mappings/page.tsx`); the map control offers a **one-tap smart suggestion** (`suggestCanonicalName`) that pre-proposes a canonical name for readable raw names (e.g. `"Cilantro 24 ct" → "Cilantro"`) — but only when accepting it would actually change the grouping (a proposal that resolves to the same core-name group as the raw is suppressed as a no-op). The picker also lets you **type a brand-new canonical name to create it** (e.g. map `"Apple Fuji"` → new item `"Apple"`) when no existing item matches. The Mappings page also offers **AI batch mapping** (`AiMappingPanel` → `POST /api/ai-mappings` → `lib/ai/mapping.ts` on the active provider): pick a batch size (up to 10 / 20), a random set of unmapped items is sent to the AI with the existing items + mappings as context, and it proposes a canonical for each. Suggestions are **conservative** (never collapse Red/Yellow/White Onion into "Onion") and land in an **editable preview** — the user reviews/edits/skips each row, then applies (creating new canonicals as needed). The route is read-only; approved rows are written via the normal `/api/mappings` (sequentially, to avoid file-write races). The item-detail **rename** is also mapping-based (it re-points/creates mappings rather than editing receipts).
- **Measure layer (`lib/units.ts`, `lib/packSize.ts`, `lib/measure.ts`)** normalizes each line to a **price-per-base-unit** ($/lb, $/l, $/ea) at read time. `resolveMeasure(item)` picks the purchased amount via a guarded ladder — (a) trust a printed weight/volume unit, else (b) parse a pack size from the name (count × size), else (c) count — so loose, bulk-bag, and packaged buys of one product become comparable. `parsePackSize` also reads **count packs** (`"24 ct"`/`"12 pk"`/`"8 pieces"` → per-each pricing), ranked below any mass/volume token, with a double-count guard when the quantity already equals the parsed count. Everything is **derived, not stored**, so old receipts get corrected analytics with no migration.
- **`lib/itemsProcessor.ts`** turns the (mapping-resolved) receipt list into `ProcessedItem[]`:
  - Groups line items by **`groupKey = normalize(deriveCoreName(name))`** (pack-size text stripped) so size variants fold together.
  - Computes each entry's **price-per-base-unit** via `pricePerBaseUnit`, tagged with its `dimension`.
  - Applies **price-variation dedup** per **store + dimension** (`applyPriceVariationRules`, float tolerance `0.01`); chronological by `timestamp`. `$/lb` and `$/ea` points never collapse together.
  - Produces `latestPrice/Store/Date/BaseUnit`, a primary **`dimension`** (the dominant/most-frequent one), a `dimensions[]` set, and a most-recent-first `priceHistory[]`. `primaryDimensionHistory(item)` is the shared guard that keeps comparisons single-dimension.
- **`lib/analyticsUtils.ts`** builds chart data + statistics **restricted to the primary dimension** (never mixes units); `PriceStatistics` exposes `baseUnit` and `mixedDimensions` for labelling/notes. `getStoreColor` gives known chains brand colors and cycles a palette otherwise.
- **`lib/receiptMath.ts`** provides pure, non-blocking validation (per-line `qty × unitPrice` vs printed total — only when a unit price was printed; two-tier subtotal/tax/total reconciliation) surfaced on the Home review screen.

### 4.4 AI extraction rules (important domain logic)
The shared prompt in `lib/ai/prompt.ts` (used by both providers) records values **exactly as printed** — it does no pricing math:
- Output is **strict JSON only** with `storeNameScanned`, `receiptDate` (YYYY-MM-DD), `items[]` (`name`, `quantity`, `unitPrice|null`, `totalPrice`, `unit|null`), `subtotal|null`, `tax|null`, `total`.
- **As-printed contract:** keep the full `name` including any size text; `quantity` from the count column (default 1); `unit`/`unitPrice` only when printed (else `null`); `totalPrice` as charged. The model must **not** decide bulk-vs-packaged, convert units, or compute per-unit prices — the measure layer (`lib/measure.ts`) parses pack sizes and normalizes prices downstream.
- **Multi-line item combining** (e.g. `"Thai Chilli per lb"` + `"0.10 lb @ $2.99/lb"` → one item).
- **Discounts/promotions:** when a line shows both an original and a promo price (e.g. "Buy 6 for $80.60"), use the **actually-charged (lower)** amount as `totalPrice` and set `unitPrice: null` (the charged per-unit isn't printed). Required for **text mode**, which loses the strikethrough visual cue vision mode sees.
- Dates normalized to `YYYY-MM-DD`; currency as plain numbers.
- **Text vs vision:** the same prompt drives both; text mode embeds the extracted PDF text (`sourceText`) with `=== Page N ===` markers, vision mode attaches the file. Both return `mode` for observability.

If you change extraction behavior, keep it **as-printed** — the measure layer and insights math assume that contract.

### 4.5 Layout & navigation
- `app/layout.tsx` → `ClientLayout` (`'use client'`) renders a fixed **Sidebar** + mobile hamburger. Nav: **Home, Items, Mappings, Insights, Receipt History, Settings**.
- Pages are largely **client components** (`'use client'`) that fetch via hooks and `useMemo` derived data.

---

## 5. Core data types

```ts
// lib/types.ts
interface SavedReceipt {
  id: string;
  storeNameScanned: string;   // store name as read from the receipt
  storeNameSelected: string;  // store the user picked (canonical)
  billingDate: string;        // date on the receipt (YYYY-MM-DD)
  uploadDate: string;         // date saved (Pacific time, YYYY-MM-DD)
  extractedData: ExtractedData;
  timestamp: string;          // ISO — used for ordering/dedup
}

type QueueItem = {
  file: File;
  status: 'pending' | 'processing' | 'ready' | 'error';
  data?: ExtractedData;
  error?: string;
};

// lib/types.ts (canonical — imported by the AI layer, API, and UI)
interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice?: number | null; // providers emit null when absent/N/A
  totalPrice: number;
  unit?: string | null;
}
interface ExtractedData {
  items: ReceiptItem[];
  total: number;
  storeNameScanned?: string | null;
  receiptDate?: string | null; // YYYY-MM-DD
  subtotal?: number | null;    // pre-tax subtotal as printed (reconciliation)
  tax?: number | null;         // tax as printed (reconciliation)
}

// lib/types.ts — shared client-hook mutation result
interface MutationResult { success: boolean; error?: string }

// lib/itemsProcessor.ts
interface ProcessedItem {
  name: string; normalizedName: string; // normalizedName = groupKey (core name)
  latestPrice: number; latestStore: string; latestDate: string; latestBaseUnit: string;
  dimension: Dimension; dimensions: Dimension[]; // primary + all present ('mass'|'volume'|'count')
  priceHistory: ItemPriceEntry[]; // { store, price ($/base-unit), baseUnit, dimension, date, receiptId, timestamp }
}

// lib/itemMappings.ts — learned raw→canonical association (non-destructive overlay)
interface ItemMapping {
  normalizedRaw: string;  // rawName.toLowerCase().trim() — unique key
  rawName: string;        // original casing of the raw scanned name
  canonicalName: string;  // e.g. "Ginger"
  createdAt: string; updatedAt: string; // ISO
}
```

---

## 6. API reference

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/process-receipt` | POST | Upload image/PDF (`FormData` `file`); returns `{ data, metadata }` from Gemini. `maxDuration: 60`. |
| `/api/receipts` | GET, POST, PATCH, DELETE | CRUD receipts. `GET ?action=export&format=json\|csv` downloads. `PATCH` body `{ id, updates }`. `DELETE ?id=`. |
| `/api/stores` | GET, POST, DELETE, PUT | List / add / delete (`?store=`) / replace-all stores. Defaults: Walmart, Target, Costco, Whole Foods, Kroger. |
| `/api/units` | GET, POST, DELETE, PUT | List / add / delete (`?unit=`) / replace-all units. `GET ?action=discover` merges units found in receipts. Defaults: g, kg, oz, lb, lbs, ml, l, ea, pcs, ct. |
| `/api/settings` | GET, PUT | Read / update app settings (active AI provider). `PUT` body `{ aiProvider }`, validated against the known providers. |
| `/api/mappings` | GET, POST, DELETE, PUT | List / upsert (`{ rawName, canonicalName }`) / delete (`?normalizedRaw=`) / replace-all learned item mappings. |

All routes run on `runtime: 'nodejs'` and return `{ success, ... }` (except `process-receipt`, which returns `{ data, metadata }` / `{ error }`).

---

## 7. Rules we follow

### 7.1 Product principles
- The north star is **helping volunteers buy each item where it's cheapest.** When in doubt, favor features that make price comparison across stores/time clearer.
- Keep it **usable on a phone** and by non-technical volunteers. Prefer clarity over cleverness.
- `docs/PRD.md` is the **authoritative product spec**. Read it before adding/changing features.

### 7.2 Design system (authoritative: `DESIGN_GUIDE.md`)
Retro, warm, Gumroad-inspired aesthetic. Highlights:
- **Palette (CSS vars in `globals.css`):** Golden (`--golden-*`, primary actions), Green (`--green-*`, success/add), Ivory (`--ivory-*`, backgrounds/cards), Black (`--black-*`, text/borders). Accents red/`--error-*`, blue, orange, purple used **sparingly** for semantic meaning.
- **Always use the CSS variables**, not hard-coded hex, for new UI.
- **Chunky retro look:** 2px+ borders everywhere, retro drop shadow `--shadow-retro` (`4px 4px 0 #1A1A1A`), border-radius max 4px (pills/badges 12px).
- **NEVER use emojis** — use **Lucide React** icons (2px stroke, sizes 16/20/24/32). This applies to UI *and* is a hard rule.
- **Don'ts:** no gradients, no glassmorphism/neumorphism, no dark mode (light only), no thin borders, no animations > 0.3s, no HTML `<table>` for new layout tables (prefer CSS Grid; note some existing code still uses `<table>`).
- **Mobile-first & responsive:** breakpoints Mobile <640px, Tablet 640–1024px, Desktop >1024px; sidebar collapses to hamburger at ≤768px; tables become stacked cards on mobile.
- **Copy:** clear, direct, action-oriented; community-focused ("we", "our kitchen").
- **Accessibility:** WCAG AA contrast, 44px+ touch targets, visible focus (`2px solid #D4AF37`), semantic HTML, ARIA labels on icon-only buttons.

### 7.3 Code conventions
- **TypeScript strict.** Prefer typed props/returns. (Storage libs currently use `any` for the JSON boundary — acceptable there, but prefer real types in new code.)
- **Naming:** PascalCase components, camelCase functions/vars, UPPER_CASE constants.
- **Imports:** use the `@/` alias for cross-directory imports.
- **Data access separation:** client → API routes → `lib/*Storage.ts` → `fs`. Never use `fs` in client components. Keep `runtime = 'nodejs'` on routes that touch the filesystem or Gemini.
- **Derived data** (items, analytics) is computed from receipts in `lib/itemsProcessor.ts` / `lib/analyticsUtils.ts` — extend these rather than duplicating logic in pages.
- **Dates:** store as `YYYY-MM-DD`; `uploadDate`/display use **Pacific time** (`America/Los_Angeles`) — stay consistent.
- **No new comments that just narrate code.** Comment only non-obvious intent/constraints.

### 7.4 Persistence & data safety
- Receipts JSON is committed as sample data (`data/receipts/receipts_data.json` is force-included in `.gitignore`; other receipt JSON is ignored). Be careful not to commit real/private receipt data.
- Never commit secrets. `OPENAI_API_KEY` / `GEMINI_API_KEY` live only in `.env.local`.
- Writes are whole-file rewrites (no locking) — fine for single-user/local, but keep this limitation in mind for any concurrency or scaling work.

### 7.5 Known limitations / tech debt (context for future work)
- File-based JSON storage, no DB, no auth, single-tenant. The design guide notes a future **MongoDB migration** — keep IDs as strings and field naming camelCase to stay migration-ready.
- `ExtractedDataDisplay` uses `window.innerWidth` at render for desktop/mobile switching (not resize-reactive) and inline styles rather than the documented CSS-Grid table pattern — candidates for refactor.
- CSV export exists in the API but the UI only triggers JSON.

---

## 8. Where to look first for common tasks
- **Change extraction / prompt / model / provider** → `lib/ai/` (`prompt.ts` for the shared prompt, `gemini.ts`/`openai.ts` per provider, `index.ts` for the registry); `app/api/process-receipt/route.ts` is the thin controller.
- **Add/adjust a receipt field** → `lib/types.ts`, `ExtractedDataDisplay.tsx`, save logic in `app/page.tsx`, storage in `lib/receiptStorage.ts`.
- **Item catalog / price history logic** → `lib/itemsProcessor.ts`.
- **Insights stats/chart** → `lib/analyticsUtils.ts`, `app/insights/page.tsx`.
- **Stores/units management** → `app/settings/page.tsx`, `app/api/{stores,units}/route.ts`, `lib/{stores,units}Storage.ts`.
- **Global styling / theme tokens** → `app/globals.css` + `DESIGN_GUIDE.md`.

---

*Living document. Update it whenever the architecture, product scope, or rules change.*
