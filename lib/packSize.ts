/**
 * Pack-size parsing and core-name derivation.
 *
 * Grocery items encode their net content in the NAME ("Gopi Paneer 226 G",
 * "RED ONION 25LBS", "Chips 12 x 50g"). `parsePackSize` extracts that content
 * so the measure layer can normalize to a base unit, and `deriveCoreName`
 * strips the size tokens to produce a stable grouping key.
 *
 * Both are pure and deliberately CONSERVATIVE: when a size can't be identified
 * with confidence, `parsePackSize` returns null (the item then falls to the
 * count dimension) rather than inventing a weight from marketing digits.
 */

import { normalizeUnit, unitDimension } from './units';

export interface PackSize {
  packSize: number;
  packUnit: string; // canonical unit (e.g. "g", "lb", "ml")
}

/**
 * Mass/volume unit spellings we recognize inside a name. Ordered longest/most-
 * specific first within a shared prefix so the alternation prefers "grams" over
 * "g" and "ml" over "l".
 */
const UNIT_ALT =
  'lbs?|pounds?|kilograms?|kilos?|kgs?|grams?|gms?|g|ounces?|ozs?|oz|milliliters?|millilitres?|ml|liters?|litres?|ltrs?|l|fl\\.?\\s?ozs?|floz|gallons?|gal';

/**
 * Count-pack unit spellings, e.g. "24 CT", "12 PK", "6 count", "8 pieces". A
 * numbered count IS a legitimate pack size (a 24-ct box holds 24 units), so we
 * recognize it — but it always ranks BELOW a mass/volume token (see scoreUnit),
 * because a $/lb comparison is more useful than $/ea when a weight is available.
 */
const COUNT_UNIT_ALT = 'cts?|counts?|pks?|packs?|pcs?|pieces?';

/** Every unit that can appear as a "<number><unit>" token in a name. */
const TOKEN_UNIT_ALT = `${UNIT_ALT}|${COUNT_UNIT_ALT}`;

// "12 x 50g" / "12x50 g" -> N (count) × M (per-unit size). Mass/volume only.
const MULTIPACK = new RegExp(
  `(\\d+(?:\\.\\d+)?)\\s*[x×]\\s*(\\d+(?:\\.\\d+)?)\\s*(${UNIT_ALT})(?![a-zA-Z])`,
  'i'
);

// A single "<number><unit>" token, e.g. "226 G", "64oz", "1.5KG", "24 ct".
const SIZE_TOKEN = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${TOKEN_UNIT_ALT})(?![a-zA-Z])`, 'gi');

/** Only mass/volume units qualify as a MULTIPACK per-unit size. */
function isSizeUnit(canonical: string): boolean {
  return unitDimension(canonical) !== 'count';
}

/**
 * Rank so the metric/weight token wins for names like "283GM/10oz", and a
 * count-pack token ("24 ct", score 0) is only used when no mass/volume token is
 * present — a $/lb comparison beats $/ea whenever a weight is available.
 */
function scoreUnit(canonical: string): number {
  if (canonical === 'g' || canonical === 'kg') return 4; // metric mass
  if (unitDimension(canonical) === 'mass') return 3; // oz, lb
  if (canonical === 'ml' || canonical === 'l') return 2; // metric volume
  if (unitDimension(canonical) === 'volume') return 1; // floz, gal
  return 0; // count pack (ct/pk/pcs) — lowest priority
}

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

/**
 * Parse the net content encoded in an item name. Returns the total content per
 * purchased package as a { packSize, packUnit } in canonical units, or null
 * when no confident size token is present.
 *
 * - Multipack "12 x 50g" collapses to its total (600 g) so the result is
 *   self-contained and independent of the (unpredictable) qty column.
 * - When several tokens appear, the metric/weight token wins ("283GM/10oz" -> 283 g);
 *   a count-pack token ("24 ct" -> 24 ea) is used only when no weight is present.
 * - Percentages, "#" counts, and digits with no adjacent unit never match.
 */
export function parsePackSize(name: string | null | undefined): PackSize | null {
  if (!name) return null;
  const s = String(name);

  // 1) Multipack — total content is N × M.
  const mp = s.match(MULTIPACK);
  if (mp) {
    const n = parseFloat(mp[1]);
    const m = parseFloat(mp[2]);
    const unit = normalizeUnit(mp[3]);
    if (Number.isFinite(n) && Number.isFinite(m) && n > 0 && m > 0 && unit && isSizeUnit(unit)) {
      return { packSize: round4(n * m), packUnit: unit };
    }
  }

  // 2) Single tokens — pick the best-ranked unit (mass/volume beats count).
  let best: { val: number; unit: string; score: number } | null = null;
  let match: RegExpExecArray | null;
  SIZE_TOKEN.lastIndex = 0;
  while ((match = SIZE_TOKEN.exec(s)) !== null) {
    const val = parseFloat(match[1]);
    const unit = normalizeUnit(match[2]);
    if (!Number.isFinite(val) || val <= 0 || !unit) continue;

    const score = scoreUnit(unit);
    if (!best || score > best.score) {
      best = { val, unit, score };
    }
  }

  return best ? { packSize: round4(best.val), packUnit: best.unit } : null;
}

/**
 * Strip size/multipack tokens from a name to produce a stable grouping key,
 * e.g. "RED ONION 25LBS" -> "RED ONION", "Gopi Paneer 226 G" -> "Gopi Paneer".
 * Descriptive words (adjectives, brands, "50-50", "2%") are preserved so
 * genuinely different products stay distinct. Never returns empty — falls back
 * to the trimmed original if stripping would erase everything.
 */
export function deriveCoreName(name: string | null | undefined): string {
  if (!name) return '';
  const original = String(name).trim();

  let s = original
    .replace(new RegExp(MULTIPACK.source, 'gi'), ' ')
    .replace(new RegExp(SIZE_TOKEN.source, 'gi'), ' ');

  // Tidy separators orphaned by token removal (e.g. the "/" in "283GM/10oz"),
  // while keeping in-word hyphens like "Coca-Cola".
  s = s
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, ' ')
    .replace(/\s+-\s+/g, ' ')
    .replace(/[(),]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-\/]+|[\s\-\/]+$/g, '')
    .trim();

  return s || original;
}
