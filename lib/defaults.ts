/**
 * Default seed lists shared by the server storage libs and the client hooks.
 *
 * This module is intentionally free of `fs` and any server-only SDK imports so
 * it can be bundled on both the server (`lib/*Storage.ts`) and the client
 * (`lib/hooks/*`). Keep it that way — it is the single source of truth for
 * these defaults (§18: no duplicated constants).
 */
export const DEFAULT_STORES = ['Walmart', 'Target', 'Costco', 'Whole Foods', 'Kroger'];

export const DEFAULT_UNITS = ['g', 'kg', 'oz', 'lb', 'lbs', 'ml', 'l', 'ea', 'pcs', 'ct'];

/**
 * Fallback unit for a line item with no printed weight/volume. Grocery items
 * without a measured unit are counted individually, so "each" is the sensible
 * default the unit pickers pre-select (the measure layer treats a null unit the
 * same way, so this is purely a clearer UI default).
 */
export const DEFAULT_UNIT = 'ea';
