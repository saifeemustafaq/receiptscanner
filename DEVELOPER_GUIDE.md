# Developer Guide — Receipt Scanner

This guide defines coding standards and best practices for the Receipt Scanner codebase. Every contributor should read this before writing or reviewing code.

---

## 1. File Size Limits

| Scope | Soft Limit | Hard Limit |
|-------|-----------|------------|
| React components | 200 lines | 300 lines |
| Hooks | 150 lines | 250 lines |
| Utility / lib modules | 200 lines | 300 lines |
| API route handlers | 200 lines | 300 lines |
| CSS files | No limit | — |

**When a file exceeds the soft limit**, look for extraction opportunities:

- Long components → extract sub-components or custom hooks.
- Long API routes → extract prompt templates, parsers, or validation to `lib/`.
- Long hooks → split into smaller, composable hooks.

**Exceptions** are allowed when splitting would create artificial seams (e.g., a complex multi-mode component like a drag-and-drop uploader). Document the reason in a brief comment at the top of the file.

---

## 2. Type Safety

### Rules

1. **Zero tolerance for `any`.** Every variable, parameter, and return type must be explicitly typed or inferrable. Use `unknown` with type guards when the shape is truly unknown.
2. **Domain types live in `lib/types.ts`** (or files under `lib/types/`). UI components import from `lib/`, never the reverse.
3. **Never import domain types from a component file.** If a type is needed by both a component and a library module, it belongs in `lib/`.
4. **API responses** should have typed interfaces (e.g., `ApiResponse<T>`).
5. **Catch blocks** should type errors as `unknown`, not `any`:

```typescript
// Bad
catch (err: any) {
  console.error(err.message);
}

// Good
catch (err: unknown) {
  const message = err instanceof Error ? err.message : 'Unknown error';
  console.error(message);
}
```

### Type File Organization

```
lib/
  types.ts          — Core domain types (ReceiptItem, ExtractedData, SavedReceipt, etc.)
  constants.ts      — App-wide constants (defaults, config values)
  formatting.ts     — Shared formatting utilities
```

---

## 3. DRY (Don't Repeat Yourself)

### Where shared code lives

| Kind | Location |
|------|----------|
| Constants & defaults | `lib/constants.ts` |
| Formatting / display helpers | `lib/formatting.ts` |
| Domain types & interfaces | `lib/types.ts` |
| Data-fetching hooks | `lib/hooks/` |
| Server-side storage | `lib/*Storage.ts` |
| Reusable UI primitives | `app/components/` (`Button`, `Card`, `Input`, `Select`, `EmptyState`) |

### Rules

1. **If the same logic appears in two or more files, extract it.** Common candidates:
   - Date formatting functions
   - Price formatting (`formatPrice`, `formatCurrency`)
   - Array toggle utilities (`toggleArrayItem`)
   - Loading / empty state UI
2. **Constants must have a single source of truth.** Never duplicate default arrays (stores, units) or magic numbers (thresholds, tolerances) across files.
3. **Hooks that share 80%+ structure** should be generalized (e.g., `useStores` and `useUnits` should share a base `useStringListResource`).
4. **CSS keyframes** belong in `globals.css`, not in component-level `<style jsx>` blocks.

---

## 4. Component Guidelines

### Single Responsibility

Each component should do **one thing**. Signs a component needs splitting:

- It manages more than 5 `useState` calls.
- It renders both a list and a detail view.
- It contains inline editing logic AND display logic for different contexts.

### Composition over duplication

When two components share editing behavior (e.g., editable table rows), extract:

1. A **custom hook** for the editing state machine (`useEditableItems`).
2. A **shared presentational component** for the repeated UI pattern.

### Prop naming

- Callbacks: `onXxx` (e.g., `onSave`, `onDelete`, `onChange`).
- Booleans: `isXxx` or `hasXxx` (e.g., `isLoading`, `hasError`).
- Data: descriptive nouns (e.g., `receipt`, `stores`, `items`).

### Keys

Never use array index as `key` for lists that can be reordered, filtered, or mutated. Use a stable identifier (e.g., `receipt.id`, `item.name`).

---

## 5. API Layer

### Client-side

1. **All `fetch` calls go through hooks** (`lib/hooks/`) or a typed API module (`lib/api/`). Page components must not contain raw `fetch`.
2. **Always check `response.ok`** before calling `response.json()`:

```typescript
const response = await fetch('/api/receipts');
if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${response.statusText}`);
}
const data = await response.json();
```

3. **Typed responses**: define interfaces for every API response shape.

### Server-side (Route Handlers)

1. Wrap handler bodies in `try/catch`.
2. Return a consistent envelope: `{ success: boolean, data?: T, error?: string }`.
3. Use proper HTTP status codes (400 for bad input, 404 for not found, 500 for server errors).

---

## 6. Error Handling

### Rules

1. **No `alert()` for user feedback.** Use a toast/notification component or inline error messages.
2. **Error boundaries are required.** The app must have `app/error.tsx` (route-level) and optionally `app/global-error.tsx`.
3. **Always check `response.ok`** before parsing JSON (see API Layer above).
4. **Surface errors to users.** `console.error` alone is insufficient — the user must see feedback.
5. **Catch blocks** use `unknown`, not `any` (see Type Safety above).

### Error display hierarchy

1. **Field-level**: validation errors next to the input.
2. **Section-level**: inline error banner within the relevant card/section.
3. **Page-level**: `app/error.tsx` catches unhandled render errors.
4. **Global**: `app/global-error.tsx` as the last resort.

---

## 7. Styling

### Principles

1. **Prefer CSS classes** (from `globals.css` or Tailwind utilities) over inline `style={{}}` objects.
2. **Design tokens** live as CSS custom properties (`--golden-main`, `--ivory-bg`, etc.). Never hardcode hex colors in components.
3. **Responsive design** uses CSS media queries or Tailwind breakpoints, **not** `window.innerWidth` in JavaScript.
4. **No duplicated keyframes** — shared animations go in `globals.css`.
5. **Reuse existing CSS classes** (`card`, `btn`, `input-field`, `page-header`, `page-title`, etc.) before creating new ones.

### Inline styles

Inline styles are acceptable only for:

- Truly dynamic values computed at runtime (e.g., `width: ${percentage}%`).
- One-off layout adjustments that don't warrant a class.

If the same inline style object appears 2+ times, extract it to a CSS class or a constant.

---

## 8. State Management

### Current approach

- **Local state** via `useState` in components and hooks.
- **Data-fetching hooks** (`useReceipts`, `useStores`, `useUnits`) encapsulate load/mutate cycles.

### Rules

1. **Hooks own data lifecycle.** Pages call hooks; pages do not call `fetch` directly.
2. **Avoid redundant state.** If a value can be derived from existing state, use `useMemo` instead of a separate `useState`.
3. **Keep queue/processing logic in hooks**, not in page components.

---

## 9. ID Generation

- Do **not** use `Date.now().toString()` for entity IDs — collisions are possible during rapid saves (e.g., queue processing).
- Use `crypto.randomUUID()` (available in modern browsers and Node 19+):

```typescript
const id = crypto.randomUUID(); // "550e8400-e29b-41d4-a716-446655440000"
```

---

## 10. Code Review Checklist

Before merging any PR, verify:

- [ ] **No `any` types** — all parameters, returns, and state are typed.
- [ ] **No `alert()`** — user feedback uses toast/inline messages.
- [ ] **No raw `fetch` in page components** — all API calls go through hooks or `lib/api/`.
- [ ] **`response.ok` checked** before `.json()` in every fetch call.
- [ ] **No duplicated logic** — shared code is extracted to `lib/` or hooks.
- [ ] **No duplicated constants** — defaults and config in `lib/constants.ts`.
- [ ] **File size under 300 lines** — or exception documented.
- [ ] **Domain types in `lib/types.ts`** — not exported from component files.
- [ ] **No `window.*` in render path** — use CSS or hooks for responsive logic.
- [ ] **Error boundaries present** — `app/error.tsx` exists.
- [ ] **Consistent error envelope** — API routes return `{ success, data?, error? }`.
- [ ] **No hardcoded colors** — use CSS variables.
- [ ] **Stable keys on lists** — no `index` as key for mutable lists.
- [ ] **Documentation up to date** — README, Settings UI, and comments match actual behavior.
