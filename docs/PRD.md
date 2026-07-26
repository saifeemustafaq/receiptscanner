# Receipt Scanner - Product Requirements Document (PRD)

## 1. Purpose and problem

Receipt Scanner was built to support **community kitchens and similar organizations** that run on tight budgets and rely on volunteers for grocery management. In that context, it is the volunteers’ responsibility to compare prices across stores and buy each item where it is cheapest, for example, onions might be cheaper at Walmart while tomatoes are cheaper at Costco. Making those choices saves money and stretches limited funds.

The problem this app solves:

- **No historical memory:** Volunteers often did not know where a given item had been cheapest in the past, or forgot after a few weeks.
- **No single place to document and compare:** Without a shared record of receipts and prices, it was hard to see which store had the best price for a specific item over time.
- **Manual comparison is error-prone:** Relying on memory or ad-hoc notes made it difficult to consistently buy from the right store for each item.

Receipt Scanner addresses this by providing an interface that:

- Captures receipts (scan or upload) and extracts line items and prices automatically.
- Stores receipt history so every purchase is recorded by store and date.
- Builds an item-level view and **Insights** so volunteers can see, per item, where it was cheapest, most expensive, and how prices trend over time, making it easier to decide where to shop for each item on the next run.

---

## 2. Product overview

**Receipt Scanner** is a mobile-first web application that lets users scan or upload receipts (images or PDFs), extract structured data using a configurable AI provider (**OpenAI or Google Gemini**), and manage receipt history with search, filtering, and export. The app also builds an item catalog from all receipts and provides price insights (stats and trends) per item, with optional store filtering. There is no user authentication; data is stored on the server in JSON files under `data/`.

**Tech stack (for context):** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, OpenAI (`gpt-4o`) and Google Gemini (`gemini-2.0-flash-exp`) — switchable in Settings, Recharts, Lucide React.

---

## 3. User-facing features (by area)

### 3.1 Receipt capture and AI extraction (Home - `/`)

- **Capture methods**
  - **Camera:** Use device camera to capture a receipt (via file input `accept="image/*"`).
  - **File upload:** Choose one or more files from the device. Supports **images** (e.g. JPG, PNG) and **PDFs** (including multi-page); all pages are processed.
- **Multi-receipt queue:** User can select up to **5 files** at once. When multiple files are selected, they are processed in parallel; the user steps through each receipt to confirm store/date, edit items, and save. Queue status (current index, total, per-item status) is shown.
- **AI extraction:** Each file is sent to `POST /api/process-receipt`, which routes to the active AI provider (OpenAI or Gemini). It extracts:
  - Store name (as seen on receipt)
  - Receipt date
  - Line items: name (including any pack-size text), quantity, unit, unit price, total price — all recorded **exactly as printed**
  - Receipt total, plus **subtotal and tax** when printed
  - Prompt handles multi-line items, discounted/promo line totals, and date normalization to `YYYY-MM-DD`. It does **not** decide bulk-vs-packaged or compute per-unit prices — pack sizes are parsed from item names and normalized to a comparable price-per-base-unit by deterministic code afterward.
  - **Text-first PDFs:** digital PDFs (e.g. Instacart/Amazon receipts) are read from their embedded text layer for faster, cheaper, more accurate extraction; image-only PDFs and photos automatically fall back to vision/OCR. This is transparent to the user.
- **Store selection:** User picks a store from a managed list (with option to add a new store). When the AI detected a store name, a **one-click action** appears beneath the picker: if that store already exists it selects it ("Use detected store …"); if it's new it creates and selects it in one tap ("Add & use …") — no trip through the manual add-store form. Both scanned store name and selected store are stored.
- **Date:** Billing date is pre-filled from the extracted receipt date when available; user can change it. Upload date is set automatically (Pacific time) when saving.
- **Extracted data display and editing:** After processing, the user sees a list of line items and can:
  - Edit **item name** (with autocomplete from existing item names across receipts).
  - Edit **quantity**, **unit** (from a list of known units), **unit price**; **total price** is auto-calculated when quantity or unit price changes.
  - See **non-blocking math checks**: a line is flagged when quantity × unit price doesn't match its printed total, and a banner notes when the items + tax don't reconcile with the grand total (fees/deposits/coupons are called out as "unaccounted adjustments"). Warnings never prevent saving and clear as the user corrects values.
  - **Map an item** to a canonical name right on the review screen (e.g. a cryptic "AXFFDJ" → "Ginger"). Mapping is **non-destructive** (the receipt keeps its raw scanned name) and is **learned**: the mapped item shows a "mapped from &lt;raw&gt;" badge, and the same raw name resolves automatically on future scans and across past receipts. For readable names the control offers a **one-tap suggestion** (e.g. "Cilantro 24 ct" pre-proposes "Cilantro"); opaque codes stay manual.
- **Actions:** **Save receipt** (requires store and billing date), or **Reset** to clear the form and queue.

### 3.2 Receipt history (`/history`)

- **List:** All saved receipts are listed with key info (store, dates, total, etc.).
- **Search:** Text search on store name (both scanned and selected).
- **Sort:** Sort by billing date, upload date, total, or store name (ascending or descending).
- **Filters:** Filter by one or more stores, billing date range (from/to), and amount range (min/max total).
- **Receipt detail:** Expand a receipt to see full details (store, dates, all line items, total).
- **Edit:** Edit store, dates, and line items from the detail view; changes are persisted via `PATCH /api/receipts`.
- **Delete:** Delete a receipt (with confirmation flow in the UI).
- **Export:** Download all receipts as **JSON**. The API also supports **CSV** export (`/api/receipts?action=export&format=csv`), but the current UI only triggers JSON.

### 3.3 Items catalog (`/items` and `/items/[name]`)

- **Items list (`/items`):** Shows all **unique items** derived from saved receipts (via `lib/itemsProcessor`). Each item is clickable and links to its detail page.
- **Items list (`/items`):** items fold together variants that differ only by pack size (e.g. loose "Red Onion" and "Red Onion 25 LB"), and prices are shown per **base unit** ($/lb, $/l, $/ea) so different sizes are comparable at a glance. **Count packs** are normalized to a per-each price too — "Cilantro 24 ct" at $11.99 is shown and compared as ≈$0.50/ea.
- **Item detail (`/items/[name]`):**
  - **Price history:** All purchases of that item across receipts (store, price-per-base-unit, date, receipt). Purchases sold in a different unit type (e.g. by-each vs by-weight) are kept but compared only within their own unit, never averaged together.
  - **Rename item:** User can rename the item. Renaming is **non-destructive** — instead of rewriting receipts, it updates the mapping layer so every raw name that resolved to the old name now resolves to the new one (then redirects to the new item URL). Renaming to match another item merges their price histories.
  - **Linked receipts:** User can open, edit, or delete receipts that contain this item.

### 3.4 Insights (`/insights`)

- **Item selection:** User selects one item from a dropdown (items that have price data).
- **Store filter (optional):** User can filter by one or more stores; "Clear filters" shows all stores again.
- **Statistics (when item and data exist):** all expressed **per base unit** ($/lb, $/l, $/ea), so a bulk bag and a loose purchase compare directly.
  - **Cheapest:** Lowest price and which store.
  - **Highest:** Highest price and which store.
  - **Average:** Average price and total number of purchases.
  - **Price trend:** Percentage change and direction (up / down / stable), based on first vs last purchase.
  - When an item was bought in more than one unit type, a **"mixed units" note** appears and only the dominant unit's purchases are compared.
- **Price history chart:** Recharts line chart of price-per-base-unit over time. One series per store (when multiple stores have data); optional store filter applies. X-axis: date; Y-axis: $/base-unit; tooltips and legend by store.

### 3.5 Settings (`/settings`)

- **AI provider:** Choose the active extraction provider (**OpenAI** or **Google Gemini**); only one is active at a time. The selection is persisted server-side (`/api/settings`) and used by `/api/process-receipt`. Default is OpenAI.
- **Stores:** Add store, delete store. "Clear all" resets stores (and units) to defaults.
- **Units:** Add unit, delete unit. Units can also be **discovered** from receipt data (API: `GET /api/units?action=discover`), merging receipt units into the saved list. "Clear all" resets units to defaults along with stores.

### 3.6 Mappings (`/mappings`)

A dedicated area (its own nav tab, separate from Settings) for managing learned associations between raw scanned item names and canonical items.

- Lists every distinct scanned name (split into **Mapped** and **Unmapped**), with a filter.
- Map an unmapped name to an existing item, **create a brand-new canonical item** by typing a name that doesn't exist yet (e.g. map "Apple Fuji" → new item "Apple"), change a mapping's target, or remove one.
- A one-tap smart suggestion is offered only when it would actually change grouping (redundant size-only suggestions are hidden, since the app already groups by core name).
- **AI batch mapping:** For large backlogs of unmapped items, an **AI Mapping** action processes a batch at once. The user picks a size (**up to 10** or **up to 20**), a random set of unmapped items is sent to the active AI provider (with existing items + mappings as context), and it proposes a canonical for each — creating a new item where none fits. Suggestions are **conservative** (it never collapses genuinely different products, e.g. Red vs Yellow vs White Onion stay separate) and appear in an **editable preview**: the user edits any canonical, unticks any to skip, then applies. Nothing is written until the user approves.
- Mappings are non-destructive and apply retroactively so an item's full price history stays under one canonical name.

---

## 4. User journeys

The following journeys describe how a volunteer (or staff) uses the app in a community kitchen context. Each journey has a **goal**, **actor**, and **steps**.

### 4.1 Recording a receipt after shopping

**Actor:** Volunteer who just returned from a store (e.g. Walmart, Costco).  
**Goal:** Get the receipt into the system so prices can be compared later and history is complete.

1. Volunteer opens the app and goes to **Home**.
2. They **scan** the receipt with the device camera, or **upload** a photo/PDF (e.g. from email or phone gallery).
3. The app extracts store, date, and line items. Volunteer sees the extracted data.
4. They **select the store** from the list (or add it in Settings first if new). They **confirm or correct the receipt date** if needed.
5. They **review and edit** any line items (e.g. fix a misread name, set unit, correct price). Item names can use autocomplete from existing items.
6. They tap **Save receipt**. The receipt is stored and appears in Receipt History.
7. *(Optional)* If they have multiple receipts (e.g. from several stores in one day), they **select up to 5 files** at once; the app processes them in parallel and they step through each one to confirm and save.

**Outcome:** Receipt is saved with store, date, and item-level data; it will feed Items and Insights for future price comparison.

---

### 4.2 Planning the next shop using Insights

**Actor:** Volunteer planning the next grocery run.  
**Goal:** Decide where to buy each key item (e.g. onions, tomatoes) so the kitchen spends the least.

1. Volunteer goes to **Insights**.
2. They **select an item** from the dropdown (e.g. "Onions").
3. They see **statistics:** cheapest price and store, highest price and store, average price, and price trend (up/down/stable). They note which store has the best price for this item.
4. They optionally **filter by store** (e.g. only Walmart and Costco) to compare a subset. They can **clear filters** to see all stores again.
5. They use the **price history chart** to see how the item’s price has changed over time at each store.
6. They repeat for other items (e.g. Tomatoes, Rice) and build a mental or written list: "Buy onions at Walmart, tomatoes at Costco, …"

**Outcome:** Volunteer knows where each item has been cheapest (and how prices are trending) and can plan which store to visit for which items.

---

### 4.3 Checking receipt history (store or date)

**Actor:** Volunteer or coordinator.  
**Goal:** See what was bought at a given store, in a date range, or find a specific receipt.

1. Volunteer goes to **Receipt History**.
2. They use **search** to find receipts by store name, and/or **filters:** store(s), billing date range (from/to), amount range (min/max total).
3. They **sort** by billing date, upload date, total, or store (asc/desc) to find the right receipts.
4. They **expand** a receipt to see full details: store, dates, all line items, total.
5. If they need to **correct** something, they **edit** store, date, or line items in the detail view; changes are saved.
6. *(Optional)* They **export** all receipts as JSON (e.g. for backup or sharing with the team).

**Outcome:** Volunteer can answer "What did we buy at Costco last month?" or "What was that $200 receipt?" and keep history accurate.

---

### 4.4 Browsing and consolidating items

**Actor:** Volunteer or coordinator keeping the item catalog clean.  
**Goal:** See all items we track, fix naming (e.g. "Onions" vs "Yellow Onions"), or see where an item was bought and at what price.

1. Volunteer goes to **Items** and sees the list of **unique items** from all receipts.
2. They **click an item** (e.g. "Onions") to open its **detail page**.
3. On the detail page they see **price history:** each purchase with store, price, unit, date, and linked receipt.
4. If the same product appears under different names across receipts, they **rename the item**; the change is applied to every receipt that contains it. They are redirected to the new item name.
5. From the item detail they can **open, edit, or delete** any linked receipt.

**Outcome:** One consistent name per product where possible, and a clear view of where that item was bought and at what price over time.

---

### 4.5 Setting up stores and units

**Actor:** New volunteer, coordinator, or someone adding a new store.  
**Goal:** Ensure the app knows which stores and units to use when saving receipts.

1. Volunteer goes to **Settings**.
2. **Stores:** They **add** any new store name (e.g. a new supplier or grocery store). They can **delete** stores that are no longer used. If needed, they use **Clear all** to reset the store list to defaults.
3. **Units:** They **add** units (e.g. "lb", "dozen") that appear in receipts, or rely on **unit discovery** (from receipt data) to merge in units found in saved receipts. They can **delete** units or **Clear all** to reset to defaults.
4. When they next save a receipt on **Home**, the store dropdown and unit dropdowns reflect these settings.

**Outcome:** Store and unit lists match how the kitchen shops and records items, so data stays consistent.

---

## 5. Data and persistence

- **Receipts:** Stored in `data/receipts/receipts_data.json` (read/write via `lib/receiptStorage.ts`).
- **Stores:** `data/stores/stores_data.json` (`lib/storesStorage.ts`). Missing file is initialized with default store list.
- **Units:** `data/units/units_data.json` (`lib/unitsStorage.ts`). Missing file is initialized with default units; discovery merges in units found in receipts.
- **Item mappings:** `data/mappings/mappings_data.json` (`lib/mappingsStorage.ts`). Learned raw→canonical associations; a non-destructive overlay resolved at read time (`lib/itemMappings.ts`). Missing file is initialized empty.

**Key types:**

- **SavedReceipt:** `id`, `storeNameScanned`, `storeNameSelected`, `billingDate`, `uploadDate`, `extractedData`, `timestamp`.
- **ExtractedData:** `items[]` (name, quantity, unitPrice?, totalPrice, unit?), `total`, `storeNameScanned?`, `receiptDate?`, `subtotal?`, `tax?`.
- **ProcessedItem** (items catalog): `name`, `normalizedName`, `latestPrice` ($/base-unit), `latestStore`, `latestDate`, `latestBaseUnit`, `dimension`, `dimensions[]`, `priceHistory[]`.
- **ItemMapping** (learned association): `normalizedRaw`, `rawName`, `canonicalName`, `createdAt`, `updatedAt`.

---

## 6. API summary

| Endpoint               | Methods                  | Purpose                                                                                            |
| ---------------------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| `/api/process-receipt` | POST                     | Upload file (image/PDF); returns extracted receipt data via the active AI provider. `maxDuration: 60`. |
| `/api/receipts`        | GET, POST, PATCH, DELETE  | CRUD receipts. GET supports `?action=export&format=json` or `format=csv` for download.               |
| `/api/stores`          | GET, POST, DELETE, PUT   | List, add, delete store; PUT replaces full list (e.g. reset).                                      |
| `/api/units`           | GET, POST, DELETE, PUT   | List, add, delete unit; GET `?action=discover` merges units from receipts; PUT replaces full list.  |
| `/api/settings`        | GET, PUT                 | Read / update app settings (active AI provider); PUT body `{ aiProvider }`, validated.              |
| `/api/mappings`        | GET, POST, DELETE, PUT   | List / upsert (`{ rawName, canonicalName }`) / delete (`?normalizedRaw=`) / replace-all learned item mappings. |
| `/api/ai-mappings`     | POST                     | AI-suggested canonical mappings for a batch of raw names (read-only; returns suggestions). `maxDuration: 60`. |

---

## 7. Navigation and layout

- **Layout:** `ClientLayout` wraps the app with a **sidebar** and mobile **hamburger menu**. Navigation links: Home, Items, Mappings, Insights, Receipt History, Settings.
- **Routing:** App Router with `app/page.tsx` (home), `app/history/page.tsx`, `app/items/page.tsx`, `app/items/[name]/page.tsx`, `app/insights/page.tsx`, `app/mappings/page.tsx`, `app/settings/page.tsx`.

---

## 8. Out of scope / limitations (for PRD clarity)

- **No authentication:** Single-tenant; anyone with access to the server sees the same data.
- **Storage:** File-based JSON only; no database. Persistence is **server-side file storage** in `data/` (not browser storage).
