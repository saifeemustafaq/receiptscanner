# Items Page - Price Variation Tracking

## Overview

The **Items** page shows all items extracted from scanned receipts and tracks their price variations over time across different stores and purchases.

## Features

### 1. **Items List View**
- Grid layout showing all detected items
- Each item card displays:
  - Item name
  - Latest price (with unit)
  - Store where last purchased
  - Last purchase date
  - Number of price variations (if > 1)
- Search functionality to filter items
- Click any item to view detailed price history

### 2. **Item Detail View**
- Complete price history timeline
- Visual indicators for price changes:
  - 🔴 Red arrow for price increases
  - 🟢 Green arrow for price decreases
  - ➖ Gray line for same price different store
- Percentage and absolute change calculations
- Summary statistics:
  - Lowest price ever recorded
  - Highest price ever recorded
  - Number of unique stores

### 3. **Smart Price Variation Logic**

The system intelligently tracks price changes following these rules:

#### Rule 1: Price Changed at Same Store
**Create new entry**
- Store A: $3.00/lb → Store A: $3.20/lb ✅ New entry created

#### Rule 2: Price Unchanged at Same Store
**Ignore (no new entry)**
- Store A: $3.00/lb → Store A: $3.00/lb ❌ Skipped (duplicate)

#### Rule 3: Same Price but Different Store
**Create new entry**
- Store A: $3.00/lb → Store B: $3.00/lb ✅ New entry created

#### Rule 4: Price Changed at Different Store
**Create new entry**
- Store A: $3.00/lb → Store B: $3.20/lb ✅ New entry created

## Implementation Details

### Data Processing (`lib/itemsProcessor.ts`)

**Key Functions:**

1. `processItemsFromReceipts(receipts)` - Main processor
   - Extracts all items from receipts
   - Normalizes item names (lowercase for comparison)
   - Applies deduplication rules
   - Returns processed items array

2. `applyPriceVariationRules(entries)` - Deduplication logic
   - Tracks last price per store
   - Compares new entries against last entry from same store
   - Only adds if price changed OR store changed

3. `getItemByName(receipts, itemName)` - Single item retrieval
   - Fetches complete price history for one item
   - Used for item detail view

### Components

1. **ItemsList** (`app/components/ItemsList.tsx`)
   - Grid layout with search
   - Responsive card design
   - Hover effects following design guide

2. **ItemDetail** (`app/components/ItemDetail.tsx`)
   - Timeline visualization
   - Price change indicators
   - Statistics cards
   - Back navigation

### Integration Points

- **Sidebar**: New "Items" menu option (🛍️ icon)
- **Main Router**: Added 'items' view state
- **Data Source**: Reads from saved receipts (server-side JSON)

## Usage

1. **Scan receipts** through the Home page
2. Navigate to **Items** from sidebar
3. **Search** for specific items
4. **Click** an item to see price history
5. **Track** price variations across stores and time

## Price Calculation

- For items with quantity: `unitPrice = totalPrice / quantity`
- For items without quantity: Uses total price directly
- Handles various units: lb, kg, ea, gal, etc.

## Data Storage

- No additional storage required
- Processes data on-the-fly from existing receipts
- All calculations happen in memory
- DRY principle: Single source of truth (receipts data)

## Design Compliance

✅ **Golden** accents for latest prices and active states
✅ **Green** for lowest prices and price decreases
✅ **Red** for highest prices and price increases  
✅ **Ivory** backgrounds and cards
✅ **Retro** drop shadows (4px 4px 0px)
✅ **2px borders** everywhere
✅ **System fonts** for typography
✅ **Lucide React** icons (no emojis)
✅ **Centralized CSS** (globals.css)
✅ **Pacific Time** for all dates

## Performance

- Efficient O(n) processing of receipts
- Items cached during view (no recalculation on scroll)
- Smart deduplication reduces data size
- Grid layout with auto-sizing for responsiveness

## Future Enhancements

Potential additions:
- Price charts/graphs
- Store price comparison
- Price alerts (notify when price drops)
- Export item history
- Filter by store or date range
- Average price calculations

