import { SavedReceipt } from './types';
import { processItemsFromReceipts, ProcessedItem } from './itemsProcessor';
import { TREND_THRESHOLD_PERCENT, CHART_COLORS, STORE_BRAND_COLORS } from './constants';
import { formatReceiptDate } from './formatting';

export interface ChartDataPoint {
  date: string;
  dateObj: Date;
  [storeName: string]: string | number | Date; // Dynamic store prices
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
}

export { getAllItemNames as getItemNamesForAnalytics } from './itemsProcessor';

/**
 * Transform item price history into chart-ready format
 */
export function prepareChartData(
  item: ProcessedItem | null,
  selectedStores: string[]
): ChartDataPoint[] {
  if (!item) return [];

  // Filter by selected stores if any are selected
  const filteredHistory = selectedStores.length > 0
    ? item.priceHistory.filter(entry => selectedStores.includes(entry.store))
    : item.priceHistory;

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
      date: formatReceiptDate(date, 'short'),
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
 * Calculate statistics for an item
 */
export function calculateStatistics(
  item: ProcessedItem | null,
  selectedStores: string[]
): PriceStatistics | null {
  if (!item) return null;

  // Filter by selected stores if any are selected
  const filteredHistory = selectedStores.length > 0
    ? item.priceHistory.filter(entry => selectedStores.includes(entry.store))
    : item.priceHistory;

  if (filteredHistory.length === 0) return null;

  // Find cheapest
  const cheapest = filteredHistory.reduce((min, entry) =>
    entry.price < min.price ? entry : min
  );

  // Find most expensive
  const mostExpensive = filteredHistory.reduce((max, entry) =>
    entry.price > max.price ? entry : max
  );

  // Calculate average
  const averagePrice = filteredHistory.reduce((sum, entry) => sum + entry.price, 0) / filteredHistory.length;

  // Calculate trend
  const firstPrice = filteredHistory[filteredHistory.length - 1].price; // Oldest (history is reversed)
  const lastPrice = filteredHistory[0].price; // Newest
  const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(priceChange) > TREND_THRESHOLD_PERCENT) {
    trend = priceChange > 0 ? 'up' : 'down';
  }

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
  };
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
  const storeLower = store.toLowerCase();
  for (const [key, color] of Object.entries(STORE_BRAND_COLORS)) {
    if (storeLower.includes(key)) return color;
  }
  return CHART_COLORS[index % CHART_COLORS.length];
}

