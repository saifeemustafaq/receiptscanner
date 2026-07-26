/**
 * Unit dimensions and canonical base-unit conversions.
 *
 * The measure layer normalizes every purchase to a single canonical unit per
 * DIMENSION so loose, bulk, and packaged purchases become comparable:
 *   - mass   -> lb
 *   - volume -> l
 *   - count  -> ea
 *
 * Everything here is pure and total: unknown or missing units resolve to the
 * COUNT dimension (1:1) and nothing throws, so a weird receipt can never crash
 * derivation (DEVELOPER_GUIDE §19 — derived, never stored).
 */

export type Dimension = 'mass' | 'volume' | 'count';

/** Canonical base unit for each dimension. */
export const BASE_UNIT: Record<Dimension, string> = {
  mass: 'lb',
  volume: 'l',
  count: 'ea',
};

/**
 * Canonical unit -> its dimension and multiplicative factor to the base unit.
 * factor is "how many base units is one of this unit" (e.g. 1 oz = 0.0625 lb).
 */
const UNIT_TABLE: Record<string, { dimension: Dimension; factor: number }> = {
  // mass (base lb)
  lb: { dimension: 'mass', factor: 1 },
  oz: { dimension: 'mass', factor: 1 / 16 },
  g: { dimension: 'mass', factor: 0.00220462 },
  kg: { dimension: 'mass', factor: 2.20462 },
  // volume (base l)
  l: { dimension: 'volume', factor: 1 },
  ml: { dimension: 'volume', factor: 0.001 },
  floz: { dimension: 'volume', factor: 0.0295735 },
  gal: { dimension: 'volume', factor: 3.785411784 },
  // count (base ea)
  ea: { dimension: 'count', factor: 1 },
  pcs: { dimension: 'count', factor: 1 },
  ct: { dimension: 'count', factor: 1 },
  pk: { dimension: 'count', factor: 1 },
};

/**
 * Raw unit spellings (as they appear on receipts / in names) -> canonical key.
 * Keys are lowercased and whitespace-collapsed before lookup.
 */
const SYNONYMS: Record<string, string> = {
  // mass
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  oz: 'oz', ozs: 'oz', ounce: 'oz', ounces: 'oz',
  g: 'g', gm: 'g', gms: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
  // volume
  l: 'l', ltr: 'l', ltrs: 'l', liter: 'l', liters: 'l', litre: 'l', litres: 'l',
  ml: 'ml', milliliter: 'ml', milliliters: 'ml', millilitre: 'ml', millilitres: 'ml',
  floz: 'floz', 'fl oz': 'floz', 'fl-oz': 'floz', 'fluid ounce': 'floz', 'fluid ounces': 'floz',
  gal: 'gal', gallon: 'gal', gallons: 'gal',
  // count
  ea: 'ea', each: 'ea',
  pcs: 'pcs', pc: 'pcs', piece: 'pcs', pieces: 'pcs',
  ct: 'ct', count: 'ct',
  pk: 'pk', pack: 'pk', pkt: 'pk', packet: 'pk',
};

/**
 * Normalize a raw unit string to a canonical key (e.g. "LBS" -> "lb",
 * "grams" -> "g", "fl oz" -> "floz"). Returns null for empty/absent input and
 * the cleaned lowercase string for units we don't recognize (callers treat
 * unknown units as the count dimension).
 */
export function normalizeUnit(raw: string | null | undefined): string | null {
  if (raw == null) return null;

  let s = String(raw).trim().toLowerCase();
  if (!s) return null;

  s = s.replace(/\.$/, '').replace(/\s+/g, ' ');

  // Direct hit, with/without internal spaces (handles "fl oz" -> "floz").
  const direct = SYNONYMS[s] ?? SYNONYMS[s.replace(/\s+/g, '')];
  if (direct) return direct;

  // Plural fallback ("liters." already stripped above; catch stray "-s").
  const singular = s.replace(/s$/, '');
  if (SYNONYMS[singular]) return SYNONYMS[singular];

  return s.replace(/\s+/g, '');
}

/**
 * The dimension a unit belongs to. Unknown or missing units -> 'count'.
 */
export function unitDimension(unit: string | null | undefined): Dimension {
  const canonical = normalizeUnit(unit);
  if (!canonical) return 'count';
  return UNIT_TABLE[canonical]?.dimension ?? 'count';
}

/**
 * Convert a quantity expressed in `unit` to the base unit of that unit's
 * dimension (mass->lb, volume->l, count->ea). Unknown units are treated as
 * count (1:1). Returns NaN when `qty` is not a finite number so measure-layer
 * guards can fall back cleanly.
 */
export function toBaseQuantity(qty: number, unit: string | null | undefined): number {
  const n = Number(qty);
  if (!Number.isFinite(n)) return NaN;

  const canonical = normalizeUnit(unit);
  const entry = canonical ? UNIT_TABLE[canonical] : undefined;
  const factor = entry ? entry.factor : 1; // unknown unit -> count, 1:1
  return n * factor;
}
