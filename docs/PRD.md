# Receipt Scanner – Product Requirements Document (PRD)

## 1. Purpose and problem

Receipt Scanner was built to support **community kitchens and similar organizations** that run on tight budgets and rely on volunteers for grocery management. In that context, it is the volunteers’ responsibility to compare prices across stores and buy each item where it is cheapest—for example, onions might be cheaper at Walmart while tomatoes are cheaper at Costco. Making those choices saves money and stretches limited funds.

The problem this app solves:

- **No historical memory:** Volunteers often did not know where a given item had been cheapest in the past, or forgot after a few weeks.
- **No single place to document and compare:** Without a shared record of receipts and prices, it was hard to see which store had the best price for a specific item over time.
- **Manual comparison is error-prone:** Relying on memory or ad‑hoc notes made it difficult to consistently buy from the right store for each item.

Receipt Scanner addresses this by providing an interface that:

- Captures receipts (scan or upload) and extracts line items and prices automatically.
- Stores receipt history so every purchase is recorded by store and date.
- Builds an item-level view and **Insights** so volunteers can see, per item, where it was cheapest, most expensive, and how prices trend over time—making it easier to decide where to shop for each item on the next run.

---

## 2. Product overview

**Receipt Scanner** is a mobile-first web application that lets users scan or upload receipts (images or PDFs), extract structured data using Google Gemini AI, and manage receipt history with search, filtering, and export. The app also builds an item catalog from all receipts and provides price insights (stats and trends) per item, with optional store filtering. There is no user authentication; data is stored on the server in JSON files under `data/`.

**Tech stack (for context):** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Google Gemini (`gemini-2.0-flash-exp`), Recharts, Lucide React.

---

## 3. User-facing features (by area)

### 3.1 Receipt capture and AI extraction (Home – `/`)

- **Capture methods**
  - **Camera:** Use device camera to capture a receipt (via file input `accept="image/*"`).
  - **File upload:** Choose one or more files from the device. Supports **images** (e.g. JPG, PNG) and **PDFs** (including multi-page); all pages are processed.
- **Multi-receipt queue:** User can select up to **5 files** at once. When multiple files are selected, they are processed in parallel; the user steps through each receipt to confirm store/date, edit items, and save. Queue status (current index, total, per-item status) is shown.
- **AI extraction:** Each file is sent to `POST /api/process-receipt`. Gemini extracts:
  - Store name (as seen on receipt)
  - Receipt date
  - Line items: name, quantity, unit, unit price, total price
  - Receipt total
  - Prompt handles multi-line items, bulk vs packaged units, and date normalization to `YYYY-MM-DD`.
- **Store selection:** User picks a store from a managed list (with option to add a new store). Both scanned store name and selected store are stored.
- **Date:** Billing date is pre-filled from the extracted receipt date when available; user can change it. Upload date is set automatically (Pacific time) when saving.
- **Extracted data display and editing:** After processing, the user sees a list of line items and can:
  - Edit **item name** (with autocomplete from existing item names across receipts).
  - Edit **quantity**, **unit** (from a list of known units), **unit price**; **total price** is auto-calculated when quantity or unit price changes.
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
- **Item detail (`/items/[name]`):**
  - **Price history:** All purchases of that item across receipts (store, price, unit, date, receipt).
  - **Rename item:** User can rename the item; the change is propagated to every receipt that contains it (multiple `PATCH` calls, then redirect to the new item URL).
  - **Linked receipts:** User can open, edit, or delete receipts that contain this item.

### 3.4 Insights (`/insights`)

- **Item selection:** User selects one item from a dropdown (items that have price data).
- **Store filter (optional):** User can filter by one or more stores; "Clear filters" shows all stores again.
- **Statistics (when item and data exist):**
  - **Cheapest:** Lowest price and which store.
  - **Highest:** Highest price and which store.
  - **Average:** Average price and total number of purchases.
  - **Price trend:** Percentage change and direction (up / down / stable), based on first vs last purchase.
- **Price history chart:** Recharts line chart of price over time. One series per store (when multiple stores have data); optional store filter applies. X-axis: date; Y-axis: price; tooltips and legend by store.

### 3.5 Settings (`/settings`)

- **Stores:** Add store, delete store. "Clear all" resets stores (and units) to defaults.
- **Units:** Add unit, delete unit. Units can also be **discovered** from receipt data (API: `GET /api/units?action=discover`), merging receipt units into the saved list. "Clear all" resets units to defaults along with stores.

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

**Key types:**

- **SavedReceipt:** `id`, `storeNameScanned`, `storeNameSelected`, `billingDate`, `uploadDate`, `extractedData`, `timestamp`.
- **ExtractedData:** `items[]` (name, quantity, unitPrice?, totalPrice, unit?), `total`, `storeNameScanned?`, `receiptDate?`.
- **ProcessedItem** (items catalog): `name`, `normalizedName`, `latestPrice`, `latestStore`, `latestDate`, `latestUnit`, `priceHistory[]`.

---

## 6. API summary

| Endpoint               | Methods                  | Purpose                                                                                            |
| ---------------------- | ------------------------ | -------------------------------------------------------------------------------------------------- |
| `/api/process-receipt` | POST                     | Upload file (image/PDF); returns extracted receipt data via Gemini. `maxDuration: 60`.             |
| `/api/receipts`        | GET, POST, PATCH, DELETE  | CRUD receipts. GET supports `?action=export&format=json` or `format=csv` for download.               |
| `/api/stores`          | GET, POST, DELETE, PUT   | List, add, delete store; PUT replaces full list (e.g. reset).                                      |
| `/api/units`           | GET, POST, DELETE, PUT   | List, add, delete unit; GET `?action=discover` merges units from receipts; PUT replaces full list.  |

---

## 7. Navigation and layout

- **Layout:** `ClientLayout` wraps the app with a **sidebar** and mobile **hamburger menu**. Navigation links: Home, Items, Insights, Receipt History, Settings.
- **Routing:** App Router with `app/page.tsx` (home), `app/history/page.tsx`, `app/items/page.tsx`, `app/items/[name]/page.tsx`, `app/insights/page.tsx`, `app/settings/page.tsx`.

---

## 8. Out of scope / limitations (for PRD clarity)

- **No authentication:** Single-tenant; anyone with access to the server sees the same data.
- **Storage:** File-based JSON only; no database.
- **README inaccuracy:** README says "Local Storage"; actual persistence is **server-side file storage** in `data/`.
