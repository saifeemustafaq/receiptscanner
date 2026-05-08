'use client';

import { useState, useMemo, useEffect } from 'react';
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
  getStoresForItem,
} from '@/lib/analyticsUtils';

export default function InsightsPage() {
  const { receipts, loading, error } = useReceipts();
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [selectedStores, setSelectedStores] = useState<string[]>([]);

  const itemNames = useMemo(() => getItemNamesForAnalytics(receipts), [receipts]);

  const itemData = useMemo(() => {
    if (!selectedItem) return null;
    return getItemByName(receipts, selectedItem);
  }, [selectedItem, receipts]);

  // Only show stores where this specific item was purchased
  const itemStores = useMemo(() => getStoresForItem(itemData), [itemData]);

  // Reset store filter whenever the selected item changes
  useEffect(() => {
    setSelectedStores([]);
  }, [selectedItem]);

  const chartData = useMemo(() => prepareChartData(itemData, selectedStores), [itemData, selectedStores]);
  const stats = useMemo(() => calculateStatistics(itemData, selectedStores), [itemData, selectedStores]);

  // Derive chart store list directly from chart data keys to stay in sync
  const chartStores = useMemo(() => {
    if (chartData.length === 0) return [];
    const storeSet = new Set<string>();
    chartData.forEach(point => {
      Object.keys(point).forEach(key => {
        if (key !== 'date' && key !== 'dateObj') storeSet.add(key);
      });
    });
    return Array.from(storeSet);
  }, [chartData]);

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

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <h2 style={{ color: 'var(--error-text)', marginBottom: '16px' }}>Failed to load data</h2>
        <p style={{ color: 'var(--black-secondary)' }}>{error}</p>
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

          {selectedItem && itemStores.length > 1 && (
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--black-text)' }}>
                Filter by Store
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {/* "All" button is active when no store filter is applied */}
                <button
                  onClick={() => setSelectedStores([])}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    border: `2px solid ${selectedStores.length === 0 ? 'var(--golden-main)' : 'var(--ivory-border)'}`,
                    backgroundColor: selectedStores.length === 0 ? 'var(--golden-light)' : 'var(--ivory-bg)',
                    color: 'var(--black-text)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  All
                </button>
                {itemStores.map(store => (
                  <button
                    key={store}
                    onClick={() => handleStoreToggle(store)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: 500,
                      border: `2px solid ${selectedStores.includes(store) ? 'var(--golden-main)' : 'var(--ivory-border)'}`,
                      backgroundColor: selectedStores.includes(store) ? 'var(--golden-light)' : 'var(--ivory-bg)',
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
                No price data available for the selected stores
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
