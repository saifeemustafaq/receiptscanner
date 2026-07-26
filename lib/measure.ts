/**
 * The measure layer: resolve every line item to a canonical base-unit quantity
 * so loose, bulk-bag, and packaged purchases of the same product are directly
 * comparable in Insights.
 *
 * This is the single funnel every shape flows through (DEVELOPER_GUIDE §19 —
 * derived at read time, never stored). Because it reads only as-printed values,
 * old-prompt rows (`qty 226, unit g`) and new slim-prompt rows
 * (`qty 1, unit null, name "...226 G"`) converge on the same base quantity, so
 * existing receipts get corrected analytics with no migration.
 */

import type { ReceiptItem } from './types';
import { BASE_UNIT, toBaseQuantity, unitDimension, type Dimension } from './units';
import { parsePackSize } from './packSize';

export interface Measure {
  /** Purchased amount expressed in the base unit of `dimension`. */
  baseQuantity: number;
  /** Base unit label (lb / l / ea). */
  baseUnit: string;
  dimension: Dimension;
  /** Which branch of the ladder produced this measure (diagnostics/UI). */
  source: 'unit' | 'packSize' | 'count' | 'fallback';
}

export interface UnitPrice {
  price: number;
  baseUnit: string;
  dimension: Dimension;
}

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : NaN;
}

function isUsable(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

/**
 * Resolve an item to a base-unit quantity via a strict, total priority ladder:
 *
 *   (a) printed unit is mass/volume  -> trust it as the purchased measure
 *   (b) else a pack size parses from the name -> quantity is a COUNT of packages
 *   (c) else count dimension (quantity || 1)
 *
 * Guarded so a zero / NaN / non-finite result can never escape: it degrades to
 * a count of `quantity || 1`, and ultimately to 1 ea.
 */
export function resolveMeasure(item: ReceiptItem): Measure {
  const qty = toNumber(item.quantity);
  const dim = item.unit ? unitDimension(item.unit) : null;

  // (a) Printed weight/volume unit — the purchased measure is explicit.
  if (dim === 'mass' || dim === 'volume') {
    const baseQuantity = toBaseQuantity(qty, item.unit);
    if (isUsable(baseQuantity)) {
      return { baseQuantity, baseUnit: BASE_UNIT[dim], dimension: dim, source: 'unit' };
    }
  }

  // (b) Pack size encoded in the name — quantity counts packages.
  const pack = parsePackSize(item.name);
  if (pack) {
    const packDim = unitDimension(pack.packUnit);
    let count = isUsable(qty) ? qty : 1;
    // Double-count guard for count packs: when the printed quantity equals the
    // pack's count (e.g. qty 24 AND name "24 ct"), the quantity IS the count,
    // not a number of packages — treat it as a single package to avoid 24×24.
    if (packDim === 'count' && isUsable(qty) && Math.abs(qty - pack.packSize) < 1e-9) {
      count = 1;
    }
    const baseQuantity = count * toBaseQuantity(pack.packSize, pack.packUnit);
    if (isUsable(baseQuantity)) {
      return { baseQuantity, baseUnit: BASE_UNIT[packDim], dimension: packDim, source: 'packSize' };
    }
  }

  // (c) Count dimension.
  const countQty = isUsable(qty) ? qty : 1;
  if (isUsable(countQty)) {
    return { baseQuantity: countQty, baseUnit: BASE_UNIT.count, dimension: 'count', source: 'count' };
  }

  // Final guard — never emit an unusable base quantity.
  return { baseQuantity: 1, baseUnit: BASE_UNIT.count, dimension: 'count', source: 'fallback' };
}

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

/**
 * Price per base unit for an item ($/lb, $/l, $/ea), tagged with its base unit
 * and dimension. Pass a precomputed `measure` to avoid resolving twice. Falls
 * back to the raw total (at 1 unit) if the total is unusable, never NaN.
 */
export function pricePerBaseUnit(item: ReceiptItem, measure: Measure = resolveMeasure(item)): UnitPrice {
  const total = toNumber(item.totalPrice);
  const base = { baseUnit: measure.baseUnit, dimension: measure.dimension };

  if (!Number.isFinite(total)) {
    return { price: 0, ...base };
  }
  if (!isUsable(measure.baseQuantity)) {
    return { price: round4(total), ...base };
  }
  return { price: round4(total / measure.baseQuantity), ...base };
}

/**
 * A per-unit price for DISPLAY ONLY. Prefers the as-printed `unitPrice`; when
 * the receipt printed none, falls back to totalPrice / quantity. Returns null
 * when neither is usable. Never feed this to analytics — use pricePerBaseUnit.
 */
export function displayUnitPrice(item: ReceiptItem): number | null {
  if (item.unitPrice != null && Number.isFinite(item.unitPrice)) {
    return item.unitPrice;
  }
  const total = toNumber(item.totalPrice);
  const qty = toNumber(item.quantity);
  if (!Number.isFinite(total)) return null;
  const divisor = isUsable(qty) ? qty : 1;
  return round4(total / divisor);
}
