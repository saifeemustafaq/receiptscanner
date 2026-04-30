---
name: Smart Store Matching
overview: When a receipt is processed and a store name is detected by the AI, fuzzy-match it against the user's existing store list. If a close match is found, auto-select it but show a banner letting the user confirm or add the scanned name as a new store instead. If no match is found, prompt the user to add the detected name as a new store.
todos:
  - id: store-matching
    content: Create lib/storeMatching.ts with findClosestStore fuzzy matching function
    status: pending
  - id: store-banner
    content: Create StoreSuggestionBanner component with match-found and no-match modes
    status: pending
  - id: wire-page
    content: Wire matching logic and banner into app/page.tsx with useEffect and state
    status: pending
  - id: remove-passive
    content: Remove the passive 'Detected Store' label from ExtractedDataDisplay.tsx
    status: pending
isProject: false
---

# Smart Store Name Matching

## Current behavior

1. AI extracts `storeNameScanned` (e.g. "WALMART SUPERCENTER #1234")
2. It shows as a passive "Detected Store" label in `ExtractedDataDisplay`
3. The store dropdown (`StoreSelection`) is completely independent -- user must manually select

## Proposed behavior

```mermaid
flowchart TD
  Scan["AI returns storeNameScanned"] --> Check{Fuzzy match\nagainst store list?}
  Check -->|Close match found| Banner["Auto-select match\n+ show confirmation banner"]
  Check -->|No match| Suggest["Show 'Add as new store?' prompt"]
  Banner --> Confirm["User confirms existing store"]
  Banner --> Override["User chooses 'Add as new store'\nwith scanned name"]
  Suggest --> Add["User clicks 'Add' → store added + selected"]
  Suggest --> Manual["User picks manually from dropdown"]
```



## Implementation

### 1. Add fuzzy matching utility -- new file `lib/storeMatching.ts`

A simple scoring function that checks if a scanned name contains or closely matches an existing store name (case-insensitive substring + normalized comparison). No external library needed.

```typescript
export function findClosestStore(
  scannedName: string,
  stores: string[]
): { match: string; confidence: 'exact' | 'high' | 'none' } 
```

Logic:

- Normalize both strings (lowercase, trim, strip common suffixes like "supercenter", "#1234", "inc", "llc")
- **Exact**: normalized scanned name equals a normalized store name
- **High**: one contains the other (e.g. "walmart supercenter" contains "walmart")
- **None**: no meaningful overlap

### 2. Add a `StoreSuggestionBanner` component -- new file `app/components/StoreSuggestionBanner.tsx`

Renders between the "Detected Store" label and the store dropdown. Two modes:

**Mode A -- Match found** (confidence is `exact` or `high`):

> "Detected **WALMART SUPERCENTER #1234** -- matches your existing store **Walmart**."
> [Use Walmart] [Add "WALMART SUPERCENTER #1234" as new store]

**Mode B -- No match**:

> "Detected **PATEL BROTHERS** -- not in your store list."
> [Add "Patel Brothers" as new store] [Select manually]

Clicking "Use [existing]" auto-selects the matched store in the dropdown.
Clicking "Add as new store" calls `onAddStore` with the scanned name and selects it.
Clicking "Select manually" dismisses the banner.

### 3. Wire it up in `app/page.tsx`

After `extractedData` is set (in the `useReceiptProcessing` flow), run the matching:

```typescript
useEffect(() => {
  if (extractedData?.storeNameScanned && stores.length > 0) {
    const result = findClosestStore(extractedData.storeNameScanned, stores);
    if (result.confidence !== 'none') {
      setSelectedStore(result.match); // auto-select the match
    }
    setStoreMatch(result); // store the result so the banner can render
  }
}, [extractedData, stores]);
```

New state: `storeMatch` (the result from `findClosestStore`), plus a `storeBannerDismissed` boolean.

The `StoreSuggestionBanner` renders inside the "Receipt Details" `Card`, between the store label and the `StoreSelection` dropdown, only when `extractedData?.storeNameScanned` exists and the banner hasn't been dismissed.

### 4. Remove the passive "Detected Store" display from `ExtractedDataDisplay`

The "Detected Store: ..." line at [app/components/ExtractedDataDisplay.tsx lines 88-94](app/components/ExtractedDataDisplay.tsx) becomes redundant since the banner in `page.tsx` now shows the detected name with actionable options. Remove it.

## Files changed

- **New:** `lib/storeMatching.ts` -- fuzzy match function (~30 lines)
- **New:** `app/components/StoreSuggestionBanner.tsx` -- the UI banner (~80 lines)
- **Modified:** `app/page.tsx` -- add `useEffect` for matching, render the banner, pass callbacks
- **Modified:** `app/components/ExtractedDataDisplay.tsx` -- remove the passive "Detected Store" display

