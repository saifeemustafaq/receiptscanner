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


Maintain proper DRY principle, proper data recall from respective files, keep UI UX experience in mind, dont forget the @DESIGN_GUIDE.md 
maintain centralized css as we have been doing until now.