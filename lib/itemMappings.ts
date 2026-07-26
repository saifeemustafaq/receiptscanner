import type { SavedReceipt } from './types';
import { deriveCoreName } from './packSize';

/**
 * A learned association from a raw (as-scanned) item name to a canonical item
 * name — e.g. Walmart's "AXFFDJ" and Costco's "GGNG7" both map to "Ginger".
 *
 * Mappings are NON-DESTRUCTIVE: receipts keep their raw item names and this
 * layer resolves them at derivation time, so associations are retroactive
 * (old receipts fold in immediately) and reversible (delete a mapping and the
 * raw name comes back).
 *
 * `normalizedRaw` is the unique lookup key. Fields are camelCase / string-keyed
 * to stay migration-ready (DEVELOPER_GUIDE §1).
 */
export interface ItemMapping {
  normalizedRaw: string; // rawName.toLowerCase().trim() — unique key
  rawName: string;       // original casing of the raw name (first seen)
  canonicalName: string; // e.g. "Ginger"
  createdAt: string;     // ISO timestamp
  updatedAt: string;     // ISO timestamp
}

/**
 * Normalize an item name for comparison. Mirrors the grouping key used in
 * itemsProcessor (`name.toLowerCase().trim()`) so mapping keys line up exactly
 * with how items are catalogued.
 */
export function normalizeItemName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Build a fast lookup from normalized raw name -> canonical name.
 * Skips empty and self-mapping entries (a raw that resolves to itself is a
 * no-op) to keep resolution predictable.
 */
export function buildMappingIndex(mappings: ItemMapping[]): Map<string, string> {
  const index = new Map<string, string>();

  mappings.forEach(mapping => {
    const key = normalizeItemName(mapping.rawName);
    const canonical = mapping.canonicalName.trim();
    if (!key || !canonical) return;
    if (normalizeItemName(canonical) === key) return; // self-map guard
    index.set(key, canonical);
  });

  return index;
}

/**
 * Resolve a raw item name to its canonical name using a prebuilt index.
 * Single-hop: returns the raw name unchanged when no mapping exists.
 */
export function resolveCanonicalName(
  rawName: string,
  index: Map<string, string>
): string {
  return index.get(normalizeItemName(rawName)) ?? rawName;
}

/**
 * Return a copy of `receipts` with each line item's name replaced by its
 * resolved canonical name. Raw names in storage are untouched — this is a
 * read-time overlay consumed by the derived-data functions (itemsProcessor /
 * analyticsUtils) so Items, Insights, and autocomplete all consolidate under
 * canonical names.
 */
export function applyItemMappings(
  receipts: SavedReceipt[],
  mappings: ItemMapping[]
): SavedReceipt[] {
  if (mappings.length === 0) return receipts;

  const index = buildMappingIndex(mappings);
  if (index.size === 0) return receipts;

  return receipts.map(receipt => ({
    ...receipt,
    extractedData: {
      ...receipt.extractedData,
      items: receipt.extractedData.items.map(item => {
        const canonical = resolveCanonicalName(item.name, index);
        return canonical === item.name ? item : { ...item, name: canonical };
      }),
    },
  }));
}

/** Minimum score for a suggestion to be offered. */
const SUGGESTION_THRESHOLD = 0.8;

/** Split a normalized name into alphanumeric tokens. */
function tokenize(normalized: string): string[] {
  return normalized.split(/[^a-z0-9]+/i).filter(Boolean);
}

/** Sørensen–Dice similarity on character bigrams (0..1). */
function diceSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const bg = a.slice(i, i + 2);
    bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bg = b.slice(i, i + 2);
    const count = bigrams.get(bg) ?? 0;
    if (count > 0) {
      bigrams.set(bg, count - 1);
      intersection++;
    }
  }

  return (2 * intersection) / (a.length - 1 + (b.length - 1));
}

/**
 * Score how strongly a candidate canonical name matches a raw name. Uses the
 * size-stripped core of each so "Cilantro 24 ct" lines up with "Cilantro".
 * 1.0 exact core; 0.9 candidate ⊂ raw (raw is a more specific variant, e.g.
 * "Cilantro 24 ct" -> "Cilantro"); 0.75 raw ⊂ candidate (generic -> specific,
 * kept below the threshold as too ambiguous to auto-fire); otherwise a bigram
 * similarity (only a strong typo match clears the threshold).
 */
function scoreSuggestion(
  rawNorm: string,
  rawCoreNorm: string,
  candNorm: string,
  candCoreNorm: string
): number {
  if (rawCoreNorm === candNorm || rawCoreNorm === candCoreNorm) return 1;

  const rawTokens = tokenize(rawCoreNorm);
  const candTokens = tokenize(candCoreNorm || candNorm);
  if (candTokens.length && candTokens.every(t => rawTokens.includes(t))) return 0.9;
  if (rawTokens.length && rawTokens.every(t => candTokens.includes(t))) return 0.75;

  return diceSimilarity(rawCoreNorm, candCoreNorm || candNorm);
}

/**
 * Suggest a canonical name for a raw (as-scanned) name, or null when nothing is
 * confident enough. Candidates are the existing canonical names PLUS the raw's
 * own size-stripped core, so a readable pack name like "Cilantro 24 ct" proposes
 * "Cilantro" even before any "Cilantro" item exists, while opaque codes like
 * "AXFFDJ" (no shared tokens with anything) return null and stay manual.
 */
export function suggestCanonicalName(
  rawName: string,
  candidates: string[]
): string | null {
  const rawNorm = normalizeItemName(rawName);
  const rawCore = deriveCoreName(rawName).trim();
  const rawCoreNorm = normalizeItemName(rawCore);
  if (!rawCoreNorm) return null;

  // Pool: existing canonical names + the raw's own core name (if it differs).
  const pool = new Set(candidates);
  if (rawCore && rawCoreNorm !== rawNorm) pool.add(rawCore);

  let best: string | null = null;
  let bestScore = 0;

  pool.forEach(candidate => {
    const candNorm = normalizeItemName(candidate);
    if (!candNorm || candNorm === rawNorm) return; // skip empty / self
    const candCoreNorm = normalizeItemName(deriveCoreName(candidate));
    const score = scoreSuggestion(rawNorm, rawCoreNorm, candNorm, candCoreNorm);

    // Prefer higher score; on ties prefer the shorter (more general) name.
    if (score > bestScore || (score === bestScore && best !== null && candidate.length < best.length)) {
      bestScore = score;
      best = candidate;
    }
  });

  return bestScore >= SUGGESTION_THRESHOLD ? best : null;
}
