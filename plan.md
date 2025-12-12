

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






# **Feature Request: Items Page With Price Variation Tracking**

## **Overview**

We want to introduce an **Items** page in the app where users can view all items that have been detected through scanning. Each item should display its historical price variations across purchases, based on store and price changes.

The goal:

* Show users how item prices fluctuate over time.
* Avoid duplicate entries when price hasn’t changed at the same store.

---

## **Requirements**

### **1. Items Page**

* Create a dedicated page called **Items**.
* Display a **list of all items** detected through scanning (e.g., Onion, Milk, Eggs, etc.).
* Each list entry should show:

  * Item name
  * Latest known price
  * Store associated with latest purchase
* Clicking an item should navigate to **Item Detail View**.

---

## **2. Item Detail View – Price History**

When a user clicks on an item, they should see a chronological list of price variations.

### **Each entry should contain:**

* Store name (e.g., Store A)
* Price (e.g., $3.00/lb)
* Date/time stamp of purchase 

Entries should appear in descending order (most recent first).

---

## **3. Rules for Creating Price Variation Entries**

This is the core logic that must be implemented.

### **A new price entry should be recorded ONLY IF:**

#### **Case 1 — Price changed at the same store**

Example:

* First scan at Store A: $3.00/lb → Create entry
* Second scan at Store A: $3.20/lb → Create entry
* Third scan at Store A: $3.00/lb → *Do NOT create entry* (same price at same store)

**Rule:**

> If a new scan shows the same store AND same price as the last entry for that store, **ignore** it.

---

#### **Case 2 — Same price but at a different store**

Example:

* Third scan as above (Store A, $3.00/lb) is ignored
* Fourth scan at Store B: $3.00/lb → This **should create a new entry**, even though the price is the same, because the store is different.

**Rule:**

> A same-price entry is allowed if it comes from a different store.

---

### **Summary of Rules**

| Condition                        | Action           |
| -------------------------------- | ---------------- |
| Price changed at same store      | Create new entry |
| Price unchanged at same store    | Ignore           |
| Same price but different store   | Create new entry |
| Price changed at different store | Create new entry |

---

Maintain proper DRY principle, proper data recall from respective files, keep UI UX experience in mind, dont forget the @DESIGN_GUIDE.md 
maintain centralized css as we have been doing until now.



# Feature Request: Item Name Editing During Upload

## Overview

When a receipt is scanned and items are extracted, each line item currently uses the name as it appears on the receipt.

We now want to give the user control to **modify the item name during upload**, either by:

1. Selecting an existing item name from our data store, or
2. Creating a new custom item name.

This will help normalize item names (e.g., “ONION YELLOW LB”, “YEL ONN LB” → “Onion”) and avoid cluttering the Items list with small variations from receipts.

---

## Scope

This feature only covers **item naming behavior during upload/scan flow**.
The existing **Items page and price variation logic remain unchanged** and should use the final, chosen item name.

---

## User Flow

### 1. Default Behavior After Scanning

* When a receipt is scanned and items are parsed:

  * For each line item, we **populate the item name field by default** using the text extracted from the receipt (OCR result).
  * If this exact name already exists as an item in our data store:

    * Automatically associate it with that existing item.
    * User can still change it if they want.

### 2. Editing the Item Name

For each scanned item in the upload screen, the user should be able to click/tap the item name field to edit it.

When editing, the user has two options:

#### Option A – Select from Existing Item Names

* As the user types in the item name field:

  * Show a **searchable dropdown / typeahead** of existing item names from our data store.
  * User can **select one of the existing names**.
* Once the user selects an existing name:

  * The item will be associated with that existing item.
  * No new item record should be created.

#### Option B – Create a New Item Name

* If the user types a name that does **not** match any existing item name:

  * Allow them to **confirm this as a new item name**.
  * On confirmation, treat this as a **new item** going forward.
* This new item name should then:

  * Appear in the Items page.
  * Be available in future searches/typeahead as an existing item name.

---

## Naming & Matching Rules

1. **Exact Match → Use Existing Item**

   * If the scanned name is exactly the same as an existing item name in our data store:

     * Automatically link to that existing item.
     * Do **not** create a new item.

2. **Different Name → New Item (Unless User Overrides)**

   * If the scanned name is different from any existing item name:

     * By default, this would become a **new item** (with that new name).
     * However, before finalizing, the user can:

       * Manually override the name by selecting an existing item from the dropdown.
       * Or confirm this new name as a brand-new item.

3. **Manual Override for Variations**

   * Use case: Receipt shows “ONION YELLOW LB” but user thinks it’s a variation of “Onion”.
   * User can:

     * Click the name field.
     * Search for “Onion” in existing items.
     * Select “Onion”.
   * Result:

     * This purchase is linked to the existing “Onion” item.
     * No new “ONION YELLOW LB” item is created.

---

## UI/UX Requirements

* On the upload/scan review screen:

  * Each line item shows:

    * Item name (editable)
    * Price, quantity, store, etc. (as currently implemented).
* Item name field behavior:

  * Default text: value from receipt scan.
  * When focused:

    * Show suggestions dropdown with existing item names as the user types.
    * Provide a clear way to:

      * **Select a suggestion** (use existing item).
      * **Confirm custom text** (create new item).
* Indicate clearly when:

  * User is using an **existing item name**, vs.
  * Creating a **new item name**.

---

## Interaction Examples

### Example 1 – Exact Match, No User Change

* Receipt text: “Onion”
* “Onion” already exists in our item data store.
* Behavior:

  * Field shows “Onion”.
  * System auto-links to existing “Onion” item.
  * No new item created.
  * User can still override if desired.

### Example 2 – Variation, User Normalizes Name

* Receipt text: “ONION YEL LB”
* No exact match in existing items.
* Existing items include: “Onion”.
* Behavior:

  * Field shows “ONION YEL LB” by default.
  * User clicks name, types “Onion”.
  * Dropdown suggests existing “Onion”.
  * User selects “Onion”.
  * Result: Linked to existing “Onion” item; no new item created.

### Example 3 – Truly New Item

* Receipt text: “Dragon Fruit”
* No existing “Dragon Fruit” item.
* Behavior:

  * Field shows “Dragon Fruit”.
  * User accepts the field as is.
  * Result: A new item “Dragon Fruit” is created and used going forward.

---

## Acceptance Criteria

1. During upload, each scanned item shows the name extracted from the receipt by default.
2. If the scanned name exactly matches an existing item name, it is automatically linked to that existing item (no duplicate item).
3. User can click/tap the item name to:

   * Search and select from existing item names.
   * Or enter a completely new name.
4. If the user chooses an existing name, the upload links to that item, and no new item is created.
5. If the user chooses a new name, a new item is created and appears on the Items page.
6. Existing price variation logic works as before but now uses the **final chosen item name**.



# Feature Request: Multi-Receipt Upload Support

## Overview

Users should be able to upload **multiple receipts at once**.
If the user selects more than one receipt during upload, the system should:

1. Accept all selected files.
2. Scan each receipt individually.
3. Present each scanned receipt to the user one at a time for review and confirmation.
4. Return the user to the normal upload/scan interface once all receipts have been reviewed and saved.

This feature enhances convenience for users who often have several receipts to upload in one session.

---

## User Flow

### 1. Upload Action

* User taps **Upload Receipt**.
* The device’s file picker or photo picker opens.
* User can **multi-select multiple receipt images** (e.g., choosing 3 receipts instead of one).

### 2. Handling Multiple Selected Files

* If the user selects **one** receipt → current behavior (single scan flow).
* If the user selects **multiple** receipts:

  * Accept all selected files.
  * Each receipt should be treated as a separate scanning task.
  * Begin scanning them sequentially or in parallel (developer’s choice).

---

## 3. Post-Scan Review Interface

After scanning each receipt, the app should display the parsed data for user confirmation.

### Display Logic

* Receipts should be presented **one at a time**, following the order the system processes them.
* For each receipt, user sees:

  * Extracted items
  * Editable item names (per the previously defined naming feature)
  * Prices, quantities, store, and date details
  * Ability to save/confirm the receipt

### User Actions per Receipt

For each scanned receipt:

* **Save / Confirm** → Moves to the next receipt in the queue
* Optional: **Discard / Delete receipt** (if this action already exists or you want to support it)

The user should not exit the flow until all selected receipts are handled.

---

## 4. Completion Behavior

After the user has reviewed and saved all receipts:

* The multi-receipt flow is considered complete.
* The app returns the user to the **default upload/scan interface**, same as today after a single receipt upload.

There should be **no additional steps** required from the user.

---

## Key Requirements Summary

1. **Multi-select support** in the upload picker (images or PDFs).
2. If more than one file is selected, system processes each as a separate receipt scan.
3. Receipts appear **one-by-one** for user review.
4. User must **save each receipt** before moving to the next.
5. Once all receipts are reviewed and saved → return user to the main upload interface.
6. All existing features (item rename/editing, price variation rules, etc.) should work identically within each receipt review screen.

---

## Acceptance Criteria

1. User can select 1 or more receipt files when initiating an upload.
2. When multiple receipts are selected:

   * Each receipt is scanned individually.
   * Each receipt has its own review screen.
   * The user navigates receipt-by-receipt until done.
3. Saving the last receipt returns the user to the standard upload interface.
4. No loss of data occurs between receipts.
5. Single-receipt behavior remains unchanged.
