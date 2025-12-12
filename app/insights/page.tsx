'use client';

import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart, Store as StoreIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../components/Card';
import Select from '../components/Select';
import { useReceipts } from '@/lib/hooks/useReceipts';
import { getItemByName, processItemsFromReceipts } from '@/lib/itemsProcessor';
import {
  getItemNamesForAnalytics,
  prepareChartData,
  calculateStatistics,
  getUniqueStores,
  getStoreColor,
} from '@/lib/analyticsUtils';

export default function InsightsPage() {
  const { receipts, loading } = useReceipts();
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [selectedStores, setSelectedStores] = useState<string[]>([]);

  // Get all available data
  const itemNames = useMemo(() => getItemNamesForAnalytics(receipts), [receipts]);
  const allStores = useMemo(() => getUniqueStores(receipts), [receipts]);
  
  // Get selected item data
  const itemData = useMemo(() => {
    if (!selectedItem) return null;
    return getItemByName(receipts, selectedItem);
  }, [selectedItem, receipts]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return prepareChartData(itemData, selectedStores);
  }, [itemData, selectedStores]);

  // Calculate statistics
  const stats = useMemo(() => {
    return calculateStatistics(itemData, selectedStores);
  }, [itemData, selectedStores]);

  // Get stores that appear in chart
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
      prev.includes(store)
        ? prev.filter(s => s !== store)
        : [...prev, store]
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
        <p className="page-subtitle">
          Track prices and find the best deals
        </p>
      </header>

      <div className="content-section">
        {/* Filters */}
        <Card>
          <h2 className="card-title">Select Item</h2>
          
          <div style={{ marginBottom: '16px' }}>
            <Select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
            >
              <option value="">Choose an item...</option>
              {itemNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Select>
          </div>

          {selectedItem && allStores.length > 1 && (
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '12px',
                color: 'var(--black-text)'
              }}>
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
                      transition: 'all 0.2s'
                    }}
                  >
                    {store}
                  </button>
                ))}
              </div>
              {selectedStores.length > 0 && (
                <button
                  onClick={() => setSelectedStores([])}
                  style={{
                    marginTop: '12px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: 'none',
                    border: '1px solid var(--black-tertiary)',
                    color: 'var(--black-secondary)',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </Card>

        {/* Content based on selection */}
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
            {/* Statistics Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px'
            }}>
              {/* Cheapest */}
              <Card>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    padding: '8px',
                    backgroundColor: 'var(--green-pale)',
                    borderRadius: '4px'
                  }}>
                    <TrendingDown size={20} style={{ color: 'var(--green-main)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '11px', color: 'var(--black-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Cheapest
                    </p>
                    <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--green-main)', marginBottom: '2px' }}>
                      ${stats.cheapestPrice.toFixed(2)}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--black-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {stats.cheapestStore}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Most Expensive */}
              <Card>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    padding: '8px',
                    backgroundColor: 'var(--error-bg)',
                    borderRadius: '4px'
                  }}>
                    <TrendingUp size={20} style={{ color: 'var(--error-text)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '11px', color: 'var(--black-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Highest
                    </p>
                    <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--error-text)', marginBottom: '2px' }}>
                      ${stats.mostExpensivePrice.toFixed(2)}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--black-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {stats.mostExpensiveStore}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Average */}
              <Card>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    padding: '8px',
                    backgroundColor: 'var(--golden-light)',
                    borderRadius: '4px'
                  }}>
                    <DollarSign size={20} style={{ color: 'var(--golden-main)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '11px', color: 'var(--black-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Average
                    </p>
                    <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--golden-main)', marginBottom: '2px' }}>
                      ${stats.averagePrice.toFixed(2)}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--black-secondary)' }}>
                      {stats.totalPurchases} purchase{stats.totalPurchases !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Trend */}
              <Card>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    padding: '8px',
                    backgroundColor: stats.trend === 'up' ? 'var(--error-bg)' : stats.trend === 'down' ? 'var(--green-pale)' : 'var(--ivory-darker)',
                    borderRadius: '4px'
                  }}>
                    {stats.trend === 'up' && <TrendingUp size={20} style={{ color: 'var(--error-text)' }} />}
                    {stats.trend === 'down' && <TrendingDown size={20} style={{ color: 'var(--green-main)' }} />}
                    {stats.trend === 'stable' && <Minus size={20} style={{ color: 'var(--black-tertiary)' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '11px', color: 'var(--black-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Price Trend
                    </p>
                    <p style={{ fontSize: '20px', fontWeight: 700, color: stats.trend === 'up' ? 'var(--error-text)' : stats.trend === 'down' ? 'var(--green-main)' : 'var(--black-text)', marginBottom: '2px' }}>
                      {stats.priceChange > 0 ? '+' : ''}{stats.priceChange.toFixed(1)}%
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--black-secondary)' }}>
                      {stats.trend === 'up' ? 'Increasing' : stats.trend === 'down' ? 'Decreasing' : 'Stable'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Price Chart */}
            <Card>
              <h2 className="card-title" style={{ marginBottom: '24px' }}>Price History</h2>
              
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--ivory-border)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="var(--black-tertiary)"
                    style={{ fontSize: '12px' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="var(--black-tertiary)"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--ivory-bg)',
                      border: '2px solid var(--black-text)',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                    formatter={(value: any) => [`$${Number(value).toFixed(2)}`, '']}
                    labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
                    iconType="line"
                  />
                  {chartStores.map((store, index) => (
                    <Line
                      key={store}
                      type="monotone"
                      dataKey={store}
                      stroke={getStoreColor(store, index)}
                      strokeWidth={3}
                      dot={{ fill: getStoreColor(store, index), strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}
      </div>
    </>
  );
}

