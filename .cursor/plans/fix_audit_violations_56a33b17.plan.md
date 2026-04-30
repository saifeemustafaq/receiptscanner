---
name: Fix Audit Violations
overview: Systematically fix all ~55 violations across 9 audit rules to bring the codebase into full compliance with the Developer Guide. Work is ordered P0 (correctness) then P1 (quality) then P2 (maintainability).
todos:
  - id: toast-setup
    content: Install sonner, add <Toaster /> to ClientLayout, replace all 21 alert() calls across 6 files
    status: pending
  - id: response-ok
    content: Add response.ok checks to 8 fetch mutation calls in useStores, useUnits, and page.tsx
    status: pending
  - id: move-fetch
    content: Add saveReceipt to useReceipts hook; refactor page.tsx and items/[name]/page.tsx to use hooks instead of raw fetch
    status: pending
  - id: fix-keys
    content: Replace 4 index-as-key violations with stable identifiers
    status: pending
  - id: css-vars
    content: Add new CSS variables to globals.css, replace ~20 hardcoded hex colors, move chart colors to constants.ts
    status: pending
  - id: string-list-hook
    content: Create useStringListResource base hook, rewrite useStores and useUnits as thin wrappers
    status: pending
  - id: split-route
    content: Extract prompt template and parser from process-receipt/route.ts into lib/
    status: pending
  - id: split-extracted
    content: Extract ExtractedDataItemRow from ExtractedDataDisplay.tsx
    status: pending
  - id: split-history
    content: Extract useReceiptFilters hook and ReceiptFilters component from ReceiptHistory.tsx
    status: pending
  - id: split-detail-view
    content: Extract ReceiptStoreHeader from ReceiptDetailView.tsx
    status: pending
  - id: split-item-detail
    content: Extract PriceHistoryTimeline from ItemDetail.tsx
    status: pending
  - id: split-editable-name
    content: Extract SuggestionDropdown from EditableItemName.tsx
    status: pending
  - id: audit-update
    content: Re-verify line counts and update AUDIT_REPORT.md with all violations resolved
    status: pending
isProject: false
---

# Fix All Audit Report Violations

## P0 -- Correctness / UX Blockers

### 1. Replace all `alert()` calls with toast notifications

The audit reported 10 but the actual count is **21** across 6 files. No toast library exists yet.

- **Install `sonner`** (lightweight, works natively with Next.js App Router, no context provider needed -- just a `<Toaster />` component in the layout).
- **Add `<Toaster />` to `app/layout.tsx`** inside `<body>`, via `ClientLayout` since it's a client component.
- **Replace every `alert()` call** with `toast.success()`, `toast.error()`, or `toast.info()` from sonner:


| File                                                                 | alert() count | Notes                                              |
| -------------------------------------------------------------------- | ------------- | -------------------------------------------------- |
| [app/page.tsx](app/page.tsx)                                         | 10            | Mix of validation, success, queue progress, errors |
| [app/history/page.tsx](app/history/page.tsx)                         | 3             | All error alerts                                   |
| [app/items/[name]/page.tsx](app/items/[name]/page.tsx)               | 3             | 1 success, 2 errors                                |
| [app/settings/page.tsx](app/settings/page.tsx)                       | 1             | Success confirmation                               |
| [app/components/ItemDetail.tsx](app/components/ItemDetail.tsx)       | 2             | 1 validation, 1 error                              |
| [app/components/ReceiptUpload.tsx](app/components/ReceiptUpload.tsx) | 2             | Both validation                                    |


### 2. Add `response.ok` checks to all fetch mutations

8 fetch calls skip the `response.ok` check before calling `.json()`. Add the guard pattern:

```typescript
if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
```

Files to fix:

- [lib/hooks/useStores.ts](lib/hooks/useStores.ts) -- lines 54, 72, 95 (POST, DELETE, PUT)
- [lib/hooks/useUnits.ts](lib/hooks/useUnits.ts) -- lines 45, 73, 90, 114 (GET discover, POST, DELETE, PUT)
- [app/page.tsx](app/page.tsx) -- line 88 (POST save receipt)

### 3. Move raw `fetch` out of page components into hooks

Two page files call `fetch` directly:

- **[app/page.tsx](app/page.tsx) line 82** -- `POST /api/receipts` to save a receipt. Add a `saveReceipt` method to `useReceipts` hook (which already has load/delete/update/export). Then call it from the page.
- **[app/items/[name]/page.tsx](app/items/[name]/page.tsx) line 55** -- `PATCH /api/receipts` in a loop for item rename. The hook already has `updateReceipt(id, updates)` -- refactor the page to use that instead of raw fetch.

---

## P1 -- Code Quality

### 4. Fix 4 index-as-key violations


| File                                                                               | Line | Fix                                                                         |
| ---------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------- |
| [app/components/ExtractedDataDisplay.tsx](app/components/ExtractedDataDisplay.tsx) | 156  | Use `item.name + '-' + index` or a generated ID from the editableItems hook |
| [app/components/ExtractedDataDisplay.tsx](app/components/ExtractedDataDisplay.tsx) | 376  | Same approach                                                               |
| [app/components/ReceiptUpload.tsx](app/components/ReceiptUpload.tsx)               | 126  | Use `file.name + '-' + file.size`                                           |
| [app/components/ReceiptDetailView.tsx](app/components/ReceiptDetailView.tsx)       | 194  | Use `item.name + '-' + idx`                                                 |


### 5. Replace hardcoded hex colors with CSS variables

Add new CSS custom properties to [app/globals.css](app/globals.css) and replace inline hex values:

**New CSS variables to add:**

- `--warning-bg: #fff3cd` and `--warning-border: #ffc107` (used in Settings.tsx)
- `--trend-up: #2B5F8F`, `--trend-down: #2D5016`, `--trend-warn: #8B3A3A` (used in ItemsList.tsx)
- `--error-bg-light: #ffebee` (used in ExtractedDataDisplay.tsx)
- `--text-muted: #666` (used in global-error.tsx)

**Files to update:**

- [app/components/Settings.tsx](app/components/Settings.tsx) -- lines 225-226
- [app/components/ItemsList.tsx](app/components/ItemsList.tsx) -- lines 137, 157, 180
- [app/components/ExtractedDataDisplay.tsx](app/components/ExtractedDataDisplay.tsx) -- line 67
- [app/global-error.tsx](app/global-error.tsx) -- lines 21, 26, 35-36 (use existing vars: `--ivory-bg`, `--golden-main`, `--black-text`)
- [lib/analyticsUtils.ts](lib/analyticsUtils.ts) -- lines 147-154, 159-163: move chart color arrays and store brand colors to [lib/constants.ts](lib/constants.ts) as typed constants (these are data, not CSS, so a constants file is the right home)

### 6. Extract shared `useStringListResource` hook

[lib/hooks/useStores.ts](lib/hooks/useStores.ts) and [lib/hooks/useUnits.ts](lib/hooks/useUnits.ts) share ~85% identical structure: load, add, delete, clearAll, reload.

- Create `lib/hooks/useStringListResource.ts` with config params: `endpoint`, `itemKey` (e.g. `'store'` vs `'unit'`), `listKey` (e.g. `'stores'` vs `'units'`), `defaults`.
- Rewrite `useStores` as a thin wrapper calling `useStringListResource('/api/stores', 'store', 'stores', DEFAULT_STORES)`.
- Rewrite `useUnits` as a thin wrapper that adds the `discoverUnitsFromReceipts` method on top of the base hook.

---

## P2 -- Maintainability (File Size)

### 7. Split `process-receipt/route.ts` (376 lines)

The prompt template alone is ~180 lines. Extract:

- `lib/receiptPrompt.ts` -- the prompt template string (exported function that returns the prompt)
- `lib/receiptParser.ts` -- JSON extraction, parsing, validation, and post-processing logic

Keep `route.ts` as thin orchestration: validate request, upload to Gemini, call prompt builder, call parser, return response.

### 8. Split `ExtractedDataDisplay.tsx` (565 lines)

- Extract `app/components/ExtractedDataItemRow.tsx` -- the per-row edit UI (used in both desktop table and mobile cards; currently duplicated inline). This is the single biggest win.
- The remaining chrome (loading/error/empty states, table wrapper, totals) stays in `ExtractedDataDisplay`.

### 9. Split `ReceiptHistory.tsx` (439 lines)

- Extract `lib/hooks/useReceiptFilters.ts` -- the filter/sort state + `useMemo` logic (lines 31-130).
- Extract `app/components/ReceiptFilters.tsx` -- the search/sort/filter panel UI (lines 141-362).

### 10. Split `ReceiptDetailView.tsx` (434 lines)

- Extract `app/components/ReceiptStoreHeader.tsx` -- the store display/edit header section (lines 92-165).

### 11. Split `ItemDetail.tsx` (416 lines)

- Extract `app/components/PriceHistoryTimeline.tsx` -- the vertical timeline + trend icons section (lines 197-320).

### 12. Split `EditableItemName.tsx` (408 lines)

- Extract `app/components/SuggestionDropdown.tsx` -- the dropdown/create mode UI (lines 218-405).
- The display mode + hook wiring stays in `EditableItemName`.

---

## Post-fix

- Re-run line counts on all split files to confirm they're under 300 lines.
- Update the AUDIT_REPORT.md with corrected findings and mark all violations as resolved.

