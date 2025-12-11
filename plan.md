

### **Project Overview**

We are building a simple mobile-first web application (also accessible via desktop browsers) with a clean and minimal interface. The core functionality of the app is to allow users to **scan or upload receipts** and automatically extract itemized purchase details.

---

### **Receipt Upload & Storage Workflow**

1. **Input Options**

   * The user can either **scan a receipt using their device camera** or **upload an existing receipt image**.
   * Once uploaded or scanned, the receipt file will be **stored in cloud storage**, preferably **Google Drive** (initially chosen due to its free-tier availability).

2. **Store Selection**

   * After the receipt is captured, the user will be prompted to **select the store** where the purchase was made.
   * The user can choose from a **dropdown list** of existing stores.
   * If the store is not listed, the user can **add a new store**, which will then be saved for future use.
   * the date when this purchase was made.

---

### **Receipt Processing with Gemini**

3. **Automated Data Extraction**

   * Simultaneously with storage, the receipt image will be sent to **Google Gemini** for processing.
   * Gemini should extract:

     * Item names
     * Item prices
     * Quantity purchased
     * Line totals
     * Any unit‐based pricing (e.g., price per unit, weight-based prices)
     * The total amount of the receipt
   * The extraction logic must handle cases where:

     * Both **price per unit** and **total price** appear
     * Quantities are written in different formats (e.g., units, weight, packs)

The scanned information will then be stored in JSON for now, with store name scanned, store name selected by the user, and the item details which is as mentioned above.






# Feature Request: Items Page, Price Variation Tracking & Item Name Normalization

## 1. Overview

We want:

1. An **Items** page listing all items that exist in our system (created from scanned receipts).
2. For each item, a **Price History** that tracks price variations over time, with specific rules about when a new entry is created.
3. During **upload/scanning**, the ability for the user to **modify the item name**:

   * Either by **choosing from existing items** (canonicalizing to an existing name), or
   * By **creating a new item name** manually.
   * The default name comes from the scanned receipt text.

The key goals:

* Avoid duplicate items with slightly different names unless the user explicitly wants that.
* Let users map messy receipt names to clean, canonical item names.
* Maintain correct price history per *canonical* item.

---

## 2. Items Page (Same as Before)

**Page Name**: `Items`

### 2.1 Items List

* Show **all items** in the system.
* For each item row, display:

  * Item name (canonical name)
  * Latest known price
  * Store of latest purchase
  * Optional: number of total purchases / variations

**Action**:

* Clicking an item → open **Item Detail View**.

---

## 3. Item Detail View – Price History (Same as Before)

For a given item (canonical item):

* Show a list (timeline) of **Price Entries**.

Each entry includes:

* Store name (e.g., “Store A”)
* Price (e.g., `$3.00 / lb`)
* Timestamp (time of purchase / scan)

Sorted **most recent first**.

---

## 4. Price Entry Creation Logic (Unchanged)

When a purchase is scanned and tied to a given **item** (after name normalization logic below), we decide whether to create a new price entry.

### 4.1 Rules

**A new price entry should be created only if:**

1. **Price changed at the same store**

   * Example:

     * Store A, $3.00/lb → create entry
     * Store A, $3.20/lb → create entry
     * Store A, $3.00/lb again → **do NOT create** entry
   * Rule:

     > If the new scan has the same store **and** same price as the **last recorded entry for that store** for this item, ignore it (no new entry).

2. **Same price but different store**

   * Example:

     * Store A, $3.00/lb (latest is $3.00/lb, already recorded)
     * Store B, $3.00/lb → **create new entry**
   * Rule:

     > If the store is different, we always create a new entry, even if the price matches some other store.

3. **Price changed at different store**

   * Always create a new entry.

### 4.2 Summary Table

| Condition                        | Action           |
| -------------------------------- | ---------------- |
| Price changed at same store      | Create new entry |
| Price unchanged at same store    | Ignore           |
| Same price but different store   | Create new entry |
| Price changed at different store | Create new entry |

---

## 5. Item Name Normalization During Upload

### 5.1 Trigger

Whenever we **scan a receipt** and detect one or more line items, for each line item we have:

* Raw, scanned item name (from OCR), e.g. `"YELLOW ONIONS 3LB BAG"`.
* Store info
* Price
* (Optional) Quantity / unit, etc.

### 5.2 Default Behavior

1. The **default value** for item name is exactly the **scanned name** from the receipt.
2. Before creating a new item in the database:

   * Check if the scanned name **exactly matches** an existing item’s canonical name.
   * If **exact match**:

     * Link this purchase to the **existing item**, do **not** create a new item.
   * If **no exact match**:

     * A **new item** is proposed to be created with this scanned name.
     * User is given an option to **modify/override** the item name.

### 5.3 User Options on Upload

When a new (non-exact-match) item name is detected, the user can:

1. **Keep the scanned name as-is**

   * Result: Create a **new item record** with this name and link this purchase to it.

2. **Select an existing item name** (canonicalize)

   * UI: show a searchable dropdown / list of existing item names from our data store, e.g.:

     * “Onion”
     * “Yellow Onion”
     * “Red Onion”
     * “Onion (Organic)”
   * Result: Do **not** create a new item.
   * Link this purchase to the **selected existing item**.

3. **Manually create a custom item name**

   * User edits the text field and enters a new name, e.g. changing `"YELLOW ONIONS 3LB BAG"` → `"Onion"`, or `"Onion - 3 lb bag"`.
   * If the manually entered name:

     * **Exactly matches** an existing item name:

       * Treat as **select existing item**, do **not** create a new item.
     * **Does not match** any existing item:

       * Create a **new item** with that name.
   * Link this purchase to that item.

### 5.4 Behavior Rules for Item Creation

Given a **final chosen name** (after user edits / selection):

1. **If final name matches an existing item name**
   → Use existing item (no new item created).

2. **If final name does not match any existing item**
   → Create a new item with that name.

**Important:**
This logic applies whether the name came:

* Direct from scan (no user change),
* From user selecting an existing item,
* Or from user manually editing the name.

### 5.5 Example Flows

#### Example 1: New variant name, user keeps it

* Scan: `"YELLOW ONIONS 3LB BAG"`
* Existing items: `"Onion"`, `"Red Onion"`
* No exact match → UI prompts user
* User keeps the scanned name → `"YELLOW ONIONS 3LB BAG"`
* Result:

  * New item `"YELLOW ONIONS 3LB BAG"` is created.
  * Purchase linked to this new item.
  * Price history belongs to `"YELLOW ONIONS 3LB BAG"`.

#### Example 2: Scanned variation, user canonicalizes

* Scan: `"YELLOW ONIONS 3LB BAG"`
* Existing items: `"Onion"`, `"Red Onion"`
* No exact match → UI prompts user
* User selects `"Onion"` from existing items list.
* Result:

  * No new item created.
  * Purchase linked to `"Onion"`.
  * Price history updated for `"Onion"` item.

#### Example 3: User manually types a “clean” name

* Scan: `"ONION YLW 3LB"`
* Existing items: `"Onion"`, `"Yellow Onion"`
* No exact match → UI prompts user
* User edits text and types `"Yellow Onion"` (which exists in DB)
* Result:

  * Treat as existing item.
  * No new item created.
  * Purchase linked to existing `"Yellow Onion"`.

#### Example 4: User creates a completely new canonical name

* Scan: `"ONION YLW 3LB"`
* Existing items: `"Onion"`, `"Red Onion"`
* User edits name to `"Onion - 3 lb Bag"` (does not exist)
* Result:

  * Create new item `"Onion - 3 lb Bag"`.
  * Purchase linked to this new item.

---



### 6.3 Logic Hooks

* During receipt upload:

  1. OCR → raw_item_name.
  2. Let user confirm/modify final_item_name via UI.
  3. Resolve final_item_name to an Item:

     * If exact match → use existing item.id.
     * Else → create new Item with this name.
  4. Apply **price entry rules** for this item + store + price.

---

## 7. UI/UX Notes

### 7.1 Upload Screen

For each scanned line item:

* Show:

  * Detected name (editable text field)
  * A dropdown / “link to existing item” selector, which:

    * Auto-suggests existing items as user types.
    * If they select an existing item, that overrides the text to that canonical item.
* Clearly indicate:

  * “Use as new item name” vs “Link to existing item”.

### 7.2 Items Page & Item Detail

* No change from previous spec, except item names shown are the **canonical names** determined by the above logic.
* Price variations are always per canonical item.

---

## 8. Acceptance Criteria

1. **Name Normalization**

   * On upload, each scanned item line shows a default name from OCR.
   * User can:

     * Leave it as-is,
     * Select an existing item,
     * Or manually type a different name.
   * If final name matches an existing item name, no new item is created.
   * If final name does not match any existing item, a new item is created.

2. **Price Tracking**

   * Every purchase is associated with exactly one item (canonical).
   * Price entries obey:

     * No duplicate entry when **store and price are same as last entry for that store**.
     * Same price at different stores always creates new entries.

3. **Items Page & Detail**

   * Items page lists all item names (canonical).
   * Clicking an item shows its price history entries with store, price, timestamp according to rules.

---

If you want, next I can:

* Turn this into a sequence diagram (upload → name resolution → item/price creation), or
* Propose API endpoints/contracts for the upload & item resolution flow.
