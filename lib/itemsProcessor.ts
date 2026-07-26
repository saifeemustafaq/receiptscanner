import { SavedReceipt } from './types';
import { deriveCoreName } from './packSize';
import { normalizeItemName } from './itemMappings';
import { resolveMeasure, pricePerBaseUnit } from './measure';
import type { Dimension } from './units';

/**
 * Per-base-unit price difference (absolute) below which two entries from the
 * same store are treated as "the same price". Guards against floating-point
 * noise. Prices are now $/base-unit (e.g. $/lb), so this is a $0.01/base-unit
 * threshold.
 */
const PRICE_TOLERANCE = 0.01;

export interface ItemPriceEntry {
  store: string;
  price: number;       // price per base unit ($/lb, $/l, $/ea)
  baseUnit: string;    // canonical base unit: 'lb' | 'l' | 'ea'
  dimension: Dimension;
  date: string; // billing date
  receiptId: string;
  timestamp: string; // for sorting
}

export interface ProcessedItem {
  name: string;
  normalizedName: string; // grouping key: normalize(deriveCoreName(name))
  latestPrice: number;
  latestStore: string;
  latestDate: string;
  latestBaseUnit: string; // base unit of the latest entry
  dimension: Dimension;   // primary (dominant/most-frequent) dimension for comparisons
  dimensions: Dimension[]; // all dimensions present (>1 => mixed units)
  priceHistory: ItemPriceEntry[];
}

/**
 * The grouping key that folds loose / bulk / packaged variants of one product
 * together: strip size tokens from the name (deriveCoreName), then normalize.
 * Applied AFTER mappings (callers pass mapping-resolved receipts), so a raw
 * name is first resolved to its canonical name and only then stripped of its
 * pack size — keep that order (see applyItemMappings in lib/itemMappings.ts).
 */
export function groupKey(name: string): string {
  return normalizeItemName(deriveCoreName(name));
}

/**
 * Entries restricted to an item's PRIMARY dimension. Comparisons (min/max,
 * average, range, chart) must never mix dimensions — you can't compare $/lb to
 * $/ea — so every consumer that reduces across history filters through this.
 */
export function primaryDimensionHistory(item: ProcessedItem): ItemPriceEntry[] {
  return item.priceHistory.filter(entry => entry.dimension === item.dimension);
}

/**
 * Extract all unique items from receipts and build price history.
 * Prices are normalized to a per-base-unit basis via the measure layer so
 * loose, bulk-bag, and packaged purchases of the same product are comparable.
 */
export function processItemsFromReceipts(receipts: SavedReceipt[]): ProcessedItem[] {
  const itemsMap = new Map<string, ItemPriceEntry[]>();
  const displayNameByKey = new Map<string, string>();

  // Step 1: Collect all item entries, keyed by core-name group.
  receipts.forEach(receipt => {
    receipt.extractedData.items.forEach(item => {
      const key = groupKey(item.name);
      if (!key) return; // nameless line — nothing to group on

      if (!itemsMap.has(key)) {
        itemsMap.set(key, []);
        // Display the size-stripped core name (original casing), first seen.
        displayNameByKey.set(key, deriveCoreName(item.name) || item.name.trim());
      }

      const measure = resolveMeasure(item);
      const { price, baseUnit, dimension } = pricePerBaseUnit(item, measure);

      itemsMap.get(key)!.push({
        store: receipt.storeNameSelected,
        price,
        baseUnit,
        dimension,
        date: receipt.billingDate,
        receiptId: receipt.id,
        timestamp: receipt.timestamp,
      });
    });
  });

  // Step 2: Process each item and apply deduplication rules.
  const processedItems: ProcessedItem[] = [];

  itemsMap.forEach((entries, key) => {
    // Sort by timestamp (oldest first) to process chronologically.
    const sortedEntries = entries.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Apply deduplication rules (per store AND per dimension).
    const filteredHistory = applyPriceVariationRules(sortedEntries); // oldest-first

    if (filteredHistory.length > 0) {
      // Primary dimension = the DOMINANT (most frequent) one, not merely the
      // latest — otherwise a single recent by-each purchase would hide a rich
      // by-weight comparison. Ties break toward the more recently seen dimension.
      const dimension = dominantDimension(filteredHistory);

      // Headline "latest" reflects the most recent entry within that dimension,
      // so the Latest Price card stays consistent with the chart/stats.
      const latest = [...filteredHistory].reverse().find(e => e.dimension === dimension)
        ?? filteredHistory[filteredHistory.length - 1];

      processedItems.push({
        name: displayNameByKey.get(key) || key,
        normalizedName: key,
        latestPrice: latest.price,
        latestStore: latest.store,
        latestDate: latest.date,
        latestBaseUnit: latest.baseUnit,
        dimension,
        dimensions: Array.from(new Set(filteredHistory.map(e => e.dimension))),
        priceHistory: filteredHistory.reverse(), // Most recent first for display
      });
    }
  });

  // Sort items alphabetically.
  return processedItems.sort((a, b) =>
    a.normalizedName.localeCompare(b.normalizedName)
  );
}

/**
 * Pick the dominant dimension of an entry list: the most frequent one, with
 * ties broken toward whichever dimension was seen most recently (entries are
 * oldest-first here). This is the dimension used for all cross-history
 * comparisons; entries in other dimensions become the "mixed units" outliers.
 */
function dominantDimension(entries: ItemPriceEntry[]): Dimension {
  const counts = new Map<Dimension, number>();
  entries.forEach(e => counts.set(e.dimension, (counts.get(e.dimension) ?? 0) + 1));

  const dims = entries.map(e => e.dimension);
  let dominant = entries[entries.length - 1].dimension;
  let bestCount = -1;

  counts.forEach((count, dim) => {
    if (count > bestCount || (count === bestCount && dims.lastIndexOf(dim) > dims.lastIndexOf(dominant))) {
      bestCount = count;
      dominant = dim;
    }
  });

  return dominant;
}

/**
 * Apply price variation rules:
 * - Create entry if per-base-unit price changes at same store (same dimension)
 * - Create entry if store changes (even if price same)
 * - Create entry if dimension changes (a $/ea purchase is not the same point as
 *   a $/lb purchase, so both are kept)
 * - Skip if same store AND same dimension AND same price as the last such entry
 */
function applyPriceVariationRules(entries: ItemPriceEntry[]): ItemPriceEntry[] {
  if (entries.length === 0) return [];

  const result: ItemPriceEntry[] = [];
  // Key by store + dimension so incomparable dimensions never dedupe together.
  const lastEntryByStoreDim = new Map<string, ItemPriceEntry>();

  entries.forEach(entry => {
    const dedupKey = `${entry.store}|${entry.dimension}`;
    const lastComparable = lastEntryByStoreDim.get(dedupKey);

    // CASE 1: First time seeing this item.
    if (result.length === 0) {
      result.push(entry);
      lastEntryByStoreDim.set(dedupKey, entry);
      return;
    }

    // CASE 2: First entry for this store+dimension (always add).
    if (!lastComparable) {
      result.push(entry);
      lastEntryByStoreDim.set(dedupKey, entry);
      return;
    }

    // CASE 3: Same store + dimension — only add if price changed.
    const priceChanged = Math.abs(entry.price - lastComparable.price) > PRICE_TOLERANCE;

    if (priceChanged) {
      result.push(entry);
      lastEntryByStoreDim.set(dedupKey, entry);
    }
    // If same store, dimension AND price, skip (don't add).
  });

  return result;
}

/**
 * Get single item with full history. Looks up by the same grouping key used to
 * build items, so a display name from the Items/Insights list round-trips here.
 */
export function getItemByName(
  receipts: SavedReceipt[],
  itemName: string
): ProcessedItem | null {
  const allItems = processItemsFromReceipts(receipts);
  const normalizedSearch = groupKey(itemName);

  return allItems.find(item => item.normalizedName === normalizedSearch) || null;
}

/**
 * Search items by name
 */
export function searchItems(
  receipts: SavedReceipt[],
  searchTerm: string
): ProcessedItem[] {
  const allItems = processItemsFromReceipts(receipts);
  const normalizedSearch = normalizeItemName(searchTerm);

  if (!normalizedSearch) return allItems;

  return allItems.filter(item =>
    item.normalizedName.includes(normalizedSearch)
  );
}

/**
 * Get all unique item names from all receipts
 * Returns a sorted array of item names (using original casing from first occurrence)
 */
export function getAllItemNames(receipts: SavedReceipt[]): string[] {
  const allItems = processItemsFromReceipts(receipts);
  return allItems.map(item => item.name).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
}
