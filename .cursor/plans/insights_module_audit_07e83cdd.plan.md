---
name: Insights Module Audit
overview: Comprehensive audit of the Insights module revealing 6 data/logic bugs, 8 UI/UX issues, and 5 architectural concerns ranging from incorrect average calculations to misleading store filters and missing error handling.
todos:
  - id: fix-store-filter-source
    content: Fix store filter to show only stores where the selected item was actually purchased, not all stores globally
    status: pending
  - id: fix-average-calculation
    content: Fix running-average bug in prepareChartData for same-day duplicate purchases
    status: pending
  - id: reset-stores-on-item-change
    content: Add useEffect to clear selectedStores when selectedItem changes
    status: pending
  - id: fix-error-handling
    content: Destructure error from useReceipts and show error state instead of 'No Data Yet'
    status: pending
  - id: fix-store-filter-visual
    content: Fix store filter button styling so unfiltered state looks neutral, not highlighted
    status: pending
  - id: fix-chart-tooltip
    content: Fix tooltip formatter to include store name instead of empty string
    status: pending
  - id: fix-chart-margins
    content: Fix negative left margin on LineChart that clips Y-axis labels
    status: pending
  - id: fix-chart-date-labels
    content: Use medium date format (with year) on chart X-axis labels
    status: pending
  - id: add-dates-to-stats
    content: Display cheapestDate and mostExpensiveDate in InsightsStatsCards
    status: pending
  - id: optimize-recomputation
    content: Compute processItemsFromReceipts once and derive both itemNames and itemData from it
    status: pending
  - id: add-searchable-picker
    content: Replace plain select with searchable autocomplete for item selection
    status: pending
  - id: add-date-range-filter
    content: Add date range filter to narrow insights to a specific time window
    status: pending
isProject: false
---

# Insights Module Audit

## Critical Data/Logic Bugs

### 1. Store filter shows irrelevant stores (wrong data source)

In [app/insights/page.tsx](app/insights/page.tsx) line 24, `allStores` is derived from **all receipts globally**, not from the selected item's price history:

```24:24:app/insights/page.tsx
  const allStores = useMemo(() => getUniqueStores(receipts), [receipts]);
```

If a user selects "Bananas" (only purchased at Walmart and Target), they still see Costco, Kroger, Whole Foods in the filter -- stores where that item was never bought. Filtering by those stores yields an empty result with no explanation.

**Fix:** Derive the store list from `itemData.priceHistory` instead of all receipts. Show only stores where the selected item was actually purchased.

---

### 2. Incorrect running-average calculation for same-day duplicates

In [lib/analyticsUtils.ts](lib/analyticsUtils.ts) lines 50-53, when multiple purchases from the same store happen on the same day, the "average" is computed incorrectly:

```49:54:lib/analyticsUtils.ts
    const existing = storeMap.get(entry.store);
    if (existing) {
      storeMap.set(entry.store, (existing + entry.price) / 2);
    } else {
      storeMap.set(entry.store, entry.price);
    }
```

This is a running average, not a true average. For three prices [1, 2, 3]:

- Step 1: value = 1
- Step 2: value = (1+2)/2 = 1.5
- Step 3: value = (1.5+3)/2 = 2.25

Correct average is 2.0. The error grows with more entries.

**Fix:** Track both the sum and count, then compute `sum / count` at the end.

---

### 3. Chart date labels lose year information

In [lib/analyticsUtils.ts](lib/analyticsUtils.ts) line 63:

```63:63:lib/analyticsUtils.ts
      date: formatReceiptDate(date, 'short'),
```

The `'short'` preset formats dates as "Apr 17" (no year). If receipts span multiple years, "Apr 17, 2025" and "Apr 17, 2026" appear as the same label "Apr 17" on the chart. Additionally, same-date entries from different years would collide in the `dateMap` key since the key is the raw ISO date -- wait, the key IS the raw ISO date, but the *display label* loses the year. This means the X-axis could show two distinct data points both labeled "Apr 17" with no way to distinguish them.

**Fix:** Use `'medium'` preset (includes year) for chart labels, or at minimum include year when data spans more than one calendar year.

---

### 4. Trend calculation depends on fragile array ordering

In [lib/analyticsUtils.ts](lib/analyticsUtils.ts) lines 107-108:

```106:109:lib/analyticsUtils.ts
  const firstPrice = filteredHistory[filteredHistory.length - 1].price; // Oldest (history is reversed)
  const lastPrice = filteredHistory[0].price; // Newest
  const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;
```

This assumes `filteredHistory` is in **reverse chronological order** (newest first). This comes from `itemsProcessor.ts` line 82 which reverses the array. But the code comment says "history is reversed" without any runtime check. If `filteredHistory` is filtered by `selectedStores`, the `.filter()` preserves order -- so this works today but is fragile.

Additionally, the trend is computed between the **very first** and **very last** purchase ever. A more meaningful trend would compare recent prices to a rolling average, or use a window (e.g., last 3 months vs. prior 3 months).

---

### 5. Store filter state persists across item changes

In [app/insights/page.tsx](app/insights/page.tsx), when the user changes `selectedItem` via the dropdown, `selectedStores` is **not reset**. If you had "Walmart" selected while viewing "Bananas", then switch to "Milk" which was never purchased at Walmart, you get the empty state "No price data available" with no indication of why.

**Fix:** Add a `useEffect` that clears `selectedStores` when `selectedItem` changes.

---

### 6. Massive redundant recomputation on every interaction

`getItemByName()` in [lib/itemsProcessor.ts](lib/itemsProcessor.ts) calls `processItemsFromReceipts(receipts)` which iterates **all receipts and all items** just to find one item. `getItemNamesForAnalytics` (which is `getAllItemNames`) also calls `processItemsFromReceipts`. On the Insights page, these are called via `useMemo` but every time `selectedItem` changes, `getItemByName` reprocesses the entire dataset from scratch.

**Fix:** Compute `processItemsFromReceipts` once and derive both `itemNames` and `itemData` from it.

---

## UI/UX Issues

### 7. Store filter visual state is misleading

When no stores are selected (meaning "show all"), **every button appears highlighted** (golden border + golden background):

```104:105:app/insights/page.tsx
                      border: `2px solid ${selectedStores.includes(store) || selectedStores.length === 0 ? 'var(--golden-main)' : 'var(--ivory-border)'}`,
                      backgroundColor: selectedStores.includes(store) || selectedStores.length === 0 ? 'var(--golden-light)' : 'var(--ivory-bg)',
```

The condition `selectedStores.length === 0` makes all buttons appear "active." This means "no filter" and "everything selected" look identical. Users cannot tell if filtering is applied or not.

**Fix:** When no filter is applied, show all buttons in the neutral (unselected) style. Only highlight actively toggled stores. Consider adding an "All Stores" chip/button as an explicit option.

---

### 8. No searchable item selection

The item picker is a plain `<select>` dropdown. With hundreds of grocery items, finding a specific one requires scrolling through an unsorted (alphabetically sorted, but still long) list. There is no type-ahead, search, or autocomplete.

**Fix:** Replace with a searchable combobox/autocomplete component that filters as the user types.

---

### 9. Error state is completely unhandled

The `useReceipts` hook returns an `error` state, but [app/insights/page.tsx](app/insights/page.tsx) never checks it:

```19:19:app/insights/page.tsx
  const { receipts, loading } = useReceipts();
```

If the API call fails, `loading` becomes `false`, `receipts` is an empty array, and the page shows "No Data Yet" -- which is misleading. The user thinks they have no receipts when in fact the fetch failed.

**Fix:** Destructure `error` and show an error banner when present.

---

### 10. Cheapest/highest stats don't show dates

The `PriceStatistics` interface includes `cheapestDate` and `mostExpensiveDate`, but [app/components/InsightsStatsCards.tsx](app/components/InsightsStatsCards.tsx) only shows the store name, not when that price occurred. Users want to know "Where AND when was the cheapest price?"

---

### 11. Chart tooltip strips the store name

In [app/components/InsightsPriceChart.tsx](app/components/InsightsPriceChart.tsx) line 41:

```41:41:app/components/InsightsPriceChart.tsx
            formatter={(value: number) => [`$${Number(value).toFixed(2)}`, '']}
```

The second parameter (the label/name) is an empty string. When hovering over a data point, the tooltip shows the price but not which store it belongs to. Since each line represents a store, this is essential information that's being suppressed.

**Fix:** Remove the custom formatter or return the store name as the second element: `[formatted_price, name]`.

---

### 12. Chart Y-axis labels clipped by negative left margin

```18:18:app/components/InsightsPriceChart.tsx
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
```

The `left: -20` margin pushes the Y-axis labels (dollar values) off the left edge of the container. At best they're clipped; at worst they overlap with content outside the chart.

**Fix:** Use a small positive margin (e.g., `left: 10`) and adjust `YAxis` width if needed.

---

### 13. No date range filter on Insights

The receipt history page has date filtering via `useReceiptFilters`, but Insights has no way to narrow the time window. Users can't answer "How have prices changed in the last 3 months?" vs. looking at all-time data that may span years.

---

### 14. Inline styles throughout instead of design system

The entire Insights module uses inline `style={{}}` objects instead of CSS classes from `globals.css` or the design system components (`Card`, `Button`, `Select`). The store filter buttons, stats cards grid, and empty states are all hand-styled. This makes the UI inconsistent and hard to maintain.

---

## Architectural Concerns

### 15. PriceHistoryTimeline exists but is unused in Insights

[app/components/PriceHistoryTimeline.tsx](app/components/PriceHistoryTimeline.tsx) is a well-designed timeline component showing individual price entries with trend indicators, store names, and clickable dates. It's used on the item detail page but **not** on the Insights page. The Insights page only shows the chart -- adding the timeline below the chart would give users a detailed, scannable view of every price point.

### 16. No unit-aware price comparison

Items can have different units (lb, oz, kg, ea, etc.) stored in `ReceiptItem.unit`. The chart and stats compare raw `totalPrice / quantity` without normalizing units. If "Chicken Breast" was $4.99/lb at one store and $0.31/oz at another, these are roughly the same price but the chart would show them as wildly different.

### 17. Store brand colors only cover 5 stores

`STORE_BRAND_COLORS` in [lib/constants.ts](lib/constants.ts) has entries for Walmart, Target, Costco, Whole Foods, and Kroger. All other stores use the generic `CHART_COLORS` palette, which cycles through 8 colors. The matching uses `.includes()`, which could false-match (e.g., a store named "Walmartville" gets Walmart's blue).

### 18. No data export or sharing from Insights

Unlike the history page which has export functionality, the Insights page has no way to export the chart or statistics for a selected item. Users can't save or share their findings.

### 19. getAllReceipts loads everything with no pagination

Every page load fetches the entire receipt collection from MongoDB. For users with thousands of receipts, this will degrade performance significantly. The Insights page compounds this by reprocessing all receipts client-side on every interaction.

---

## Summary: Priority Matrix

**P0 (Bugs causing wrong data):**

- Store filter shows irrelevant stores (issue 1)
- Incorrect average calculation (issue 2)
- Store filter state not reset on item change (issue 5)
- Error state silently swallowed (issue 9)

**P1 (Misleading UI / bad UX):**

- Store filter visual ambiguity (issue 7)
- Chart tooltip strips store name (issue 11)
- Y-axis labels clipped (issue 12)
- Date labels lose year (issue 3)

**P2 (Missing features / improvements):**

- Searchable item picker (issue 8)
- Date range filter (issue 13)
- Show dates on stats cards (issue 10)
- Use PriceHistoryTimeline (issue 15)
- Unit-aware comparison (issue 16)

**P3 (Architecture / tech debt):**

- Redundant recomputation (issue 6)
- Inline styles (issue 14)
- No pagination (issue 19)

