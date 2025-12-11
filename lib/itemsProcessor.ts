import { SavedReceipt } from '@/app/page';

export interface ItemPriceEntry {
  store: string;
  price: number;
  unit: string | null;
  date: string; // billing date
  receiptId: string;
  timestamp: string; // for sorting
}

export interface ProcessedItem {
  name: string;
  normalizedName: string; // lowercase for comparison
  latestPrice: number;
  latestStore: string;
  latestDate: string;
  latestUnit: string | null;
  priceHistory: ItemPriceEntry[];
}

/**
 * Extract all unique items from receipts and build price history
 */
export function processItemsFromReceipts(receipts: SavedReceipt[]): ProcessedItem[] {
  const itemsMap = new Map<string, ItemPriceEntry[]>();

  // Step 1: Collect all item entries
  receipts.forEach(receipt => {
    receipt.extractedData.items.forEach(item => {
      const normalizedName = item.name.toLowerCase().trim();
      
      if (!itemsMap.has(normalizedName)) {
        itemsMap.set(normalizedName, []);
      }

      itemsMap.get(normalizedName)!.push({
        store: receipt.storeNameSelected,
        price: item.totalPrice / (item.quantity || 1), // Price per unit
        unit: item.unit,
        date: receipt.billingDate,
        receiptId: receipt.id,
        timestamp: receipt.timestamp,
      });
    });
  });

  // Step 2: Process each item and apply deduplication rules
  const processedItems: ProcessedItem[] = [];

  itemsMap.forEach((entries, normalizedName) => {
    // Sort by timestamp (oldest first) to process chronologically
    const sortedEntries = entries.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Get original item name (use first occurrence with proper casing)
    const originalName = receipts
      .flatMap(r => r.extractedData.items)
      .find(item => item.name.toLowerCase().trim() === normalizedName)?.name || normalizedName;

    // Apply deduplication rules
    const filteredHistory = applyPriceVariationRules(sortedEntries);

    if (filteredHistory.length > 0) {
      const latest = filteredHistory[filteredHistory.length - 1];
      
      processedItems.push({
        name: originalName, // Use original casing
        normalizedName,
        latestPrice: latest.price,
        latestStore: latest.store,
        latestDate: latest.date,
        latestUnit: latest.unit,
        priceHistory: filteredHistory.reverse(), // Most recent first for display
      });
    }
  });

  // Sort items alphabetically
  return processedItems.sort((a, b) => 
    a.normalizedName.localeCompare(b.normalizedName)
  );
}

/**
 * Apply price variation rules:
 * - Create entry if price changes at same store
 * - Create entry if store changes (even if price same)
 * - Skip if same store AND same price as last entry from that store
 */
function applyPriceVariationRules(entries: ItemPriceEntry[]): ItemPriceEntry[] {
  if (entries.length === 0) return [];

  const result: ItemPriceEntry[] = [];
  const lastEntryByStore = new Map<string, ItemPriceEntry>();

  entries.forEach(entry => {
    const lastFromSameStore = lastEntryByStore.get(entry.store);

    // CASE 1: First time seeing this item
    if (result.length === 0) {
      result.push(entry);
      lastEntryByStore.set(entry.store, entry);
      return;
    }

    // CASE 2: Different store (always add, even if same price)
    if (!lastFromSameStore) {
      result.push(entry);
      lastEntryByStore.set(entry.store, entry);
      return;
    }

    // CASE 3: Same store - only add if price changed
    const priceChanged = Math.abs(entry.price - lastFromSameStore.price) > 0.01; // Tolerance for floating point
    
    if (priceChanged) {
      result.push(entry);
      lastEntryByStore.set(entry.store, entry);
    }
    // If same store AND same price, skip (don't add)
  });

  return result;
}

/**
 * Get single item with full history
 */
export function getItemByName(
  receipts: SavedReceipt[],
  itemName: string
): ProcessedItem | null {
  const allItems = processItemsFromReceipts(receipts);
  const normalizedSearch = itemName.toLowerCase().trim();
  
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
  const normalizedSearch = searchTerm.toLowerCase().trim();

  if (!normalizedSearch) return allItems;

  return allItems.filter(item =>
    item.normalizedName.includes(normalizedSearch)
  );
}

