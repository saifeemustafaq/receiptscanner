import { SavedReceipt } from './types';
import { processItemsFromReceipts, ProcessedItem } from './itemsProcessor';
import { TREND_THRESHOLD_PERCENT, CHART_COLORS, STORE_BRAND_COLORS } from './constants';
import { formatReceiptDate } from './formatting';

export interface ChartDataPoint {
  date: string;
  dateObj: Date;
  [storeName: string]: string | number | Date;
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
  priceChange: number;
  trend: 'up' | 'down' | 'stable';
  trendFromDate: string;
  trendToDate: string;
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

  const filteredHistory = selectedStores.length > 0
    ? item.priceHistory.filter(entry => selectedStores.includes(entry.store))
    : item.priceHistory;

  // Group by date and store, tracking sum+count for a true average on same-day duplicates
  const dateMap = new Map<string, Map<string, { sum: number; count: number }>>();

  filteredHistory.forEach(entry => {
    if (!dateMap.has(entry.date)) {
      dateMap.set(entry.date, new Map());
    }
    const storeMap = dateMap.get(entry.date)!;
    const existing = storeMap.get(entry.store);
    if (existing) {
      existing.sum += entry.price;
      existing.count += 1;
    } else {
      storeMap.set(entry.store, { sum: entry.price, count: 1 });
    }
  });

  const chartData: ChartDataPoint[] = [];

  dateMap.forEach((storeMap, date) => {
    const dataPoint: ChartDataPoint = {
      date: formatReceiptDate(date, 'medium'),
      dateObj: new Date(date + 'T00:00:00'),
    };

    storeMap.forEach(({ sum, count }, store) => {
      dataPoint[store] = sum / count;
    });

    chartData.push(dataPoint);
  });

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

  const filteredHistory = selectedStores.length > 0
    ? item.priceHistory.filter(entry => selectedStores.includes(entry.store))
    : item.priceHistory;

  if (filteredHistory.length === 0) return null;

  const cheapest = filteredHistory.reduce((min, entry) =>
    entry.price < min.price ? entry : min
  );

  const mostExpensive = filteredHistory.reduce((max, entry) =>
    entry.price > max.price ? entry : max
  );

  const averagePrice = filteredHistory.reduce((sum, entry) => sum + entry.price, 0) / filteredHistory.length;

  // filteredHistory is newest-first (reversed in processItemsFromReceipts)
  const newestEntry = filteredHistory[0];
  const oldestEntry = filteredHistory[filteredHistory.length - 1];
  const firstPrice = oldestEntry.price;
  const lastPrice = newestEntry.price;

  let priceChange = 0;
  if (firstPrice !== 0) {
    priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;
  }

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
    trendFromDate: oldestEntry.date,
    trendToDate: newestEntry.date,
  };
}

/**
 * Get unique stores from all receipts
 */
export function getUniqueStores(receipts: SavedReceipt[]): string[] {
  const storesSet = new Set<string>();
  receipts.forEach(receipt => {
    storesSet.add(receipt.storeNameSelected);
  });
  return Array.from(storesSet).sort();
}

/**
 * Get stores where a specific item was purchased (not all stores globally)
 */
export function getStoresForItem(item: ProcessedItem | null): string[] {
  if (!item) return [];
  const storesSet = new Set<string>();
  item.priceHistory.forEach(entry => storesSet.add(entry.store));
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
