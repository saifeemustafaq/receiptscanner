import { SavedReceipt } from './types';
import { processItemsFromReceipts, primaryDimensionHistory, ProcessedItem, ItemPriceEntry } from './itemsProcessor';

export interface ChartDataPoint {
  date: string;
  dateObj: Date;
  [seriesName: string]: string | number | Date; // Dynamic series prices (store OR item)
}

/**
 * One row of the compare-items table: a single item's headline numbers,
 * computed within its primary dimension so $/lb never mixes with $/ea.
 */
export interface ComparisonRow {
  name: string;
  baseUnit: string;
  averagePrice: number;
  cheapestPrice: number;
  cheapestStore: string;
  latestPrice: number;
  priceChange: number;
  trend: 'up' | 'down' | 'stable';
}

export interface PriceStatistics {
  cheapestStore: string;
  cheapestPrice: number;
  cheapestDate: string;
  mostExpensiveStore: string;
  mostExpensivePrice: number;
  mostExpensiveDate: string;
  averagePrice: number;
  totalPurchases: number;
  priceChange: number; // Percentage change from first to last purchase
  trend: 'up' | 'down' | 'stable';
  baseUnit: string;          // base unit these prices are expressed in ($/baseUnit)
  mixedDimensions: boolean;  // true if the item also has entries in other units
}

/**
 * Get all unique item names sorted alphabetically
 */
export function getItemNamesForAnalytics(receipts: SavedReceipt[]): string[] {
  const items = processItemsFromReceipts(receipts);
  return items.map(item => item.name).sort((a, b) => 
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
}

/**
 * Transform item price history into chart-ready format
 */
export function prepareChartData(
  item: ProcessedItem | null,
  selectedStores: string[]
): ChartDataPoint[] {
  if (!item) return [];

  // Restrict to the item's primary dimension so the Y axis stays a single unit
  // ($/lb vs $/ea are not comparable on one chart), then filter by store.
  const dimHistory = primaryDimensionHistory(item);
  const filteredHistory = selectedStores.length > 0
    ? dimHistory.filter(entry => selectedStores.includes(entry.store))
    : dimHistory;

  // Group by date and store
  const dateMap = new Map<string, Map<string, number>>();

  filteredHistory.forEach(entry => {
    if (!dateMap.has(entry.date)) {
      dateMap.set(entry.date, new Map());
    }
    // If multiple purchases from same store on same day, use average
    const storeMap = dateMap.get(entry.date)!;
    const existing = storeMap.get(entry.store);
    if (existing) {
      storeMap.set(entry.store, (existing + entry.price) / 2);
    } else {
      storeMap.set(entry.store, entry.price);
    }
  });

  // Convert to chart format
  const chartData: ChartDataPoint[] = [];
  
  dateMap.forEach((storeMap, date) => {
    const dataPoint: ChartDataPoint = {
      date: new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'America/Los_Angeles'
      }),
      dateObj: new Date(date + 'T00:00:00'),
    };

    storeMap.forEach((price, store) => {
      dataPoint[store] = price;
    });

    chartData.push(dataPoint);
  });

  // Sort by date
  return chartData.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
}

/**
 * Restrict an item to its primary dimension and the selected stores. Shared by
 * every consumer so the "single dimension, filtered by store" rule lives once.
 */
function filteredPrimaryHistory(
  item: ProcessedItem,
  selectedStores: string[]
): ItemPriceEntry[] {
  const dimHistory = primaryDimensionHistory(item);
  return selectedStores.length > 0
    ? dimHistory.filter(entry => selectedStores.includes(entry.store))
    : dimHistory;
}

/**
 * Core cheapest/highest/average/trend reduction over an already-filtered,
 * newest-first history. Returned by both the single-item stats and the
 * compare-items table so the math never diverges. Assumes history.length > 0.
 */
function reduceStats(history: ItemPriceEntry[]) {
  const cheapest = history.reduce((min, entry) => (entry.price < min.price ? entry : min));
  const mostExpensive = history.reduce((max, entry) => (entry.price > max.price ? entry : max));
  const averagePrice = history.reduce((sum, entry) => sum + entry.price, 0) / history.length;

  // History is newest-first, so the last element is the oldest purchase.
  const firstPrice = history[history.length - 1].price;
  const lastPrice = history[0].price;
  const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(priceChange) > 5) {
    trend = priceChange > 0 ? 'up' : 'down';
  }

  return { cheapest, mostExpensive, averagePrice, latestPrice: lastPrice, priceChange, trend };
}

/**
 * Calculate statistics for an item
 */
export function calculateStatistics(
  item: ProcessedItem | null,
  selectedStores: string[]
): PriceStatistics | null {
  if (!item) return null;

  // Compare within a single dimension only — mixing $/lb and $/ea would make
  // cheapest/average meaningless.
  const filteredHistory = filteredPrimaryHistory(item, selectedStores);
  if (filteredHistory.length === 0) return null;

  const { cheapest, mostExpensive, averagePrice, priceChange, trend } = reduceStats(filteredHistory);

  return {
    cheapestStore: cheapest.store,
    cheapestPrice: cheapest.price,
    cheapestDate: cheapest.date,
    mostExpensiveStore: mostExpensive.store,
    mostExpensivePrice: mostExpensive.price,
    mostExpensiveDate: mostExpensive.date,
    averagePrice,
    totalPurchases: filteredHistory.length,
    priceChange,
    trend,
    baseUnit: item.latestBaseUnit,
    mixedDimensions: item.dimensions.length > 1,
  };
}

/**
 * Chart data for comparing several items on one axis. Each item becomes a
 * SERIES keyed by its name (mirroring the store-keyed shape of
 * prepareChartData), with one averaged price per date across the selected
 * stores. Callers must only pass items that share a base unit — this does not
 * re-check dimensions.
 */
export function prepareComparisonChartData(
  items: ProcessedItem[],
  selectedStores: string[]
): ChartDataPoint[] {
  // date -> (itemName -> [prices]) so same-day purchases average together.
  const dateMap = new Map<string, Map<string, number[]>>();

  items.forEach(item => {
    filteredPrimaryHistory(item, selectedStores).forEach(entry => {
      if (!dateMap.has(entry.date)) dateMap.set(entry.date, new Map());
      const itemMap = dateMap.get(entry.date)!;
      if (!itemMap.has(item.name)) itemMap.set(item.name, []);
      itemMap.get(item.name)!.push(entry.price);
    });
  });

  const chartData: ChartDataPoint[] = [];

  dateMap.forEach((itemMap, date) => {
    const dataPoint: ChartDataPoint = {
      date: new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'America/Los_Angeles',
      }),
      dateObj: new Date(date + 'T00:00:00'),
    };

    itemMap.forEach((prices, itemName) => {
      dataPoint[itemName] = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    });

    chartData.push(dataPoint);
  });

  return chartData.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
}

/**
 * One comparison-table row per item, computed within each item's primary
 * dimension and the selected stores. Items with no matching history are
 * skipped so the table only shows items that actually have data.
 */
export function getComparisonRows(
  items: ProcessedItem[],
  selectedStores: string[]
): ComparisonRow[] {
  const rows: ComparisonRow[] = [];

  items.forEach(item => {
    const history = filteredPrimaryHistory(item, selectedStores);
    if (history.length === 0) return;

    const { cheapest, averagePrice, latestPrice, priceChange, trend } = reduceStats(history);

    rows.push({
      name: item.name,
      baseUnit: item.latestBaseUnit,
      averagePrice,
      cheapestPrice: cheapest.price,
      cheapestStore: cheapest.store,
      latestPrice,
      priceChange,
      trend,
    });
  });

  return rows;
}

/**
 * Get unique stores from receipts
 */
export function getUniqueStores(receipts: SavedReceipt[]): string[] {
  const storesSet = new Set<string>();
  receipts.forEach(receipt => {
    storesSet.add(receipt.storeNameSelected);
  });
  return Array.from(storesSet).sort();
}

/**
 * Get color for a store (consistent colors)
 */
export function getStoreColor(store: string, index: number): string {
  const colors = [
    '#D4AF37', // Golden
    '#2E7D32', // Green
    '#1976D2', // Blue
    '#D32F2F', // Red
    '#7B1FA2', // Purple
    '#F57C00', // Orange
    '#0097A7', // Cyan
    '#C2185B', // Pink
  ];
  
  // Try to match known stores
  const storeLower = store.toLowerCase();
  if (storeLower.includes('walmart')) return '#0071CE';
  if (storeLower.includes('target')) return '#CC0000';
  if (storeLower.includes('costco')) return '#0066B2';
  if (storeLower.includes('whole foods')) return '#00A652';
  if (storeLower.includes('kroger')) return '#E32D1C';
  
  return colors[index % colors.length];
}

/**
 * Color for an item series in compare mode. Unlike stores there are no known
 * brand colors, so this is purely positional over the shared palette — the
 * index is the item's slot in the selected-items list, keeping each item's
 * line color stable as long as its position holds.
 */
export function getItemColor(_name: string, index: number): string {
  const colors = [
    '#D4AF37', // Golden
    '#2E7D32', // Green
    '#1976D2', // Blue
    '#D32F2F', // Red
    '#7B1FA2', // Purple
    '#F57C00', // Orange
    '#0097A7', // Cyan
    '#C2185B', // Pink
  ];
  return colors[index % colors.length];
}

