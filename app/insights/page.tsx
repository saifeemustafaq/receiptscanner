'use client';

import { useState, useMemo } from 'react';
import { ShoppingCart } from 'lucide-react';
import Card from '../components/Card';
import Select from '../components/Select';
import InsightsStatsCards from '../components/InsightsStatsCards';
import InsightsPriceChart from '../components/InsightsPriceChart';
import { useReceipts } from '@/lib/hooks/useReceipts';
import { getItemByName } from '@/lib/itemsProcessor';
import {
  getItemNamesForAnalytics,
  prepareChartData,
  calculateStatistics,
  getUniqueStores,
} from '@/lib/analyticsUtils';

export default function InsightsPage() {
  const { receipts, loading } = useReceipts();
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [selectedStores, setSelectedStores] = useState<string[]>([]);

  const itemNames = useMemo(() => getItemNamesForAnalytics(receipts), [receipts]);
  const allStores = useMemo(() => getUniqueStores(receipts), [receipts]);

  const itemData = useMemo(() => {
    if (!selectedItem) return null;
    return getItemByName(receipts, selectedItem);
  }, [selectedItem, receipts]);

  const chartData = useMemo(() => prepareChartData(itemData, selectedStores), [itemData, selectedStores]);
  const stats = useMemo(() => calculateStatistics(itemData, selectedStores), [itemData, selectedStores]);

  const chartStores = useMemo(() => {
    if (!itemData) return [];
    const stores = new Set<string>();
    itemData.priceHistory.forEach(entry => {
      if (selectedStores.length === 0 || selectedStores.includes(entry.store)) {
        stores.add(entry.store);
      }
    });
    return Array.from(stores);
  }, [itemData, selectedStores]);

  const handleStoreToggle = (store: string) => {
    setSelectedStores(prev =>
      prev.includes(store) ? prev.filter(s => s !== store) : [...prev, store]
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p style={{ color: 'var(--black-secondary)' }}>Loading insights...</p>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <h2 style={{ color: 'var(--black-text)', marginBottom: '16px' }}>No Data Yet</h2>
        <p style={{ color: 'var(--black-secondary)', marginBottom: '24px' }}>
          Upload receipts to see price insights and trends
        </p>
      </div>
    );
  }

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Insights</h1>
        <p className="page-subtitle">Track prices and find the best deals</p>
      </header>

      <div className="content-section">
        <Card>
          <h2 className="card-title">Select Item</h2>

          <div style={{ marginBottom: '16px' }}>
            <Select value={selectedItem} onChange={(e) => setSelectedItem(e.target.value)}>
              <option value="">Choose an item...</option>
              {itemNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Select>
          </div>

          {selectedItem && allStores.length > 1 && (
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--black-text)' }}>
                Filter by Store
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {allStores.map(store => (
                  <button
                    key={store}
                    onClick={() => handleStoreToggle(store)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: 500,
                      border: `2px solid ${selectedStores.includes(store) || selectedStores.length === 0 ? 'var(--golden-main)' : 'var(--ivory-border)'}`,
                      backgroundColor: selectedStores.includes(store) || selectedStores.length === 0 ? 'var(--golden-light)' : 'var(--ivory-bg)',
                      color: 'var(--black-text)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {store}
                  </button>
                ))}
              </div>
              {selectedStores.length > 0 && (
                <button
                  onClick={() => setSelectedStores([])}
                  style={{ marginTop: '12px', padding: '6px 12px', fontSize: '12px', background: 'none', border: '1px solid var(--black-tertiary)', color: 'var(--black-secondary)', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </Card>

        {!selectedItem ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <ShoppingCart size={48} style={{ color: 'var(--black-tertiary)', marginBottom: '16px' }} />
              <p style={{ color: 'var(--black-secondary)', fontSize: '16px' }}>
                Select an item above to see price insights
              </p>
            </div>
          </Card>
        ) : !stats || chartData.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <p style={{ color: 'var(--black-secondary)' }}>
                No price data available for the selected filters
              </p>
            </div>
          </Card>
        ) : (
          <>
            <InsightsStatsCards stats={stats} />
            <InsightsPriceChart chartData={chartData} chartStores={chartStores} />
          </>
        )}
      </div>
    </>
  );
}
