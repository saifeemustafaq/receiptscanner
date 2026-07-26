'use client';

import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign, ShoppingCart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../components/Card';
import Select from '../components/Select';
import { useReceipts } from '@/lib/hooks/useReceipts';
import { useMappings } from '@/lib/hooks/useMappings';
import { getItemByName, processItemsFromReceipts, ProcessedItem } from '@/lib/itemsProcessor';
import { applyItemMappings } from '@/lib/itemMappings';
import {
  getItemNamesForAnalytics,
  prepareChartData,
  calculateStatistics,
  prepareComparisonChartData,
  getComparisonRows,
  getUniqueStores,
  getStoreColor,
  getItemColor,
} from '@/lib/analyticsUtils';

export default function InsightsPage() {
  const { receipts, isLoading } = useReceipts();
  const { mappings, isLoading: mappingsLoading } = useMappings();
  const [mode, setMode] = useState<'single' | 'compare'>('single');
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);

  // Resolve raw item names to their canonical mapping once, then derive
  // everything (item list, stats, chart) from the consolidated receipts.
  const mappedReceipts = useMemo(
    () => applyItemMappings(receipts, mappings),
    [receipts, mappings]
  );

  // Get all available data
  const itemNames = useMemo(() => getItemNamesForAnalytics(mappedReceipts), [mappedReceipts]);
  const allStores = useMemo(() => getUniqueStores(mappedReceipts), [mappedReceipts]);

  // Primary base unit per item name, so compare mode can restrict selections to
  // a single comparable unit ($/lb never overlaps $/ea on one axis).
  const baseUnitByItem = useMemo(() => {
    const map = new Map<string, string>();
    processItemsFromReceipts(mappedReceipts).forEach(item => {
      map.set(item.name, item.latestBaseUnit);
    });
    return map;
  }, [mappedReceipts]);

  // The first selected item fixes the allowed base unit for the whole compare set.
  const allowedBaseUnit = useMemo(() => {
    if (selectedItems.length === 0) return null;
    return baseUnitByItem.get(selectedItems[0]) ?? null;
  }, [selectedItems, baseUnitByItem]);

  // Resolve the selected item names to full ProcessedItems for the chart/table.
  const comparisonItems = useMemo<ProcessedItem[]>(() => {
    return selectedItems
      .map(name => getItemByName(mappedReceipts, name))
      .filter((item): item is ProcessedItem => item !== null);
  }, [selectedItems, mappedReceipts]);

  const comparisonChartData = useMemo(
    () => prepareComparisonChartData(comparisonItems, selectedStores),
    [comparisonItems, selectedStores]
  );

  const comparisonRows = useMemo(
    () => getComparisonRows(comparisonItems, selectedStores),
    [comparisonItems, selectedStores]
  );

  // Base unit shared by the compared items (used for axis/tooltip labels).
  const comparisonBaseUnit = allowedBaseUnit ?? '';
  
  // Get selected item data
  const itemData = useMemo(() => {
    if (!selectedItem) return null;
    return getItemByName(mappedReceipts, selectedItem);
  }, [selectedItem, mappedReceipts]);

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
    // Only the primary dimension is charted (matches prepareChartData), so a
    // store that only appears in another unit doesn't create an empty line.
    itemData.priceHistory.forEach(entry => {
      if (entry.dimension !== itemData.dimension) return;
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

  const handleModeChange = (next: 'single' | 'compare') => {
    setMode(next);
    setSelectedStores([]);
  };

  const handleAddCompareItem = (name: string) => {
    if (!name || selectedItems.includes(name)) return;
    setSelectedItems(prev => [...prev, name]);
  };

  const handleRemoveCompareItem = (name: string) => {
    setSelectedItems(prev => prev.filter(n => n !== name));
  };

  // Whether the store filter should show: single mode uses the picked item,
  // compare mode shows it once at least one item is selected.
  const showStoreFilter = allStores.length > 1 &&
    (mode === 'single' ? Boolean(selectedItem) : selectedItems.length > 0);

  if (isLoading || mappingsLoading) {
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

          {/* Mode toggle: single item vs compare several items */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {(['single', 'compare'] as const).map(m => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  border: `2px solid ${mode === m ? 'var(--golden-main)' : 'var(--ivory-border)'}`,
                  backgroundColor: mode === m ? 'var(--golden-light)' : 'var(--ivory-bg)',
                  color: 'var(--black-text)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {m === 'single' ? 'Single item' : 'Compare items'}
              </button>
            ))}
          </div>

          {mode === 'single' ? (
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
          ) : (
            <div style={{ marginBottom: '16px' }}>
              <Select
                value=""
                onChange={(e) => handleAddCompareItem(e.target.value)}
              >
                <option value="">Add an item to compare...</option>
                {itemNames.map(name => {
                  const unit = baseUnitByItem.get(name);
                  const alreadyPicked = selectedItems.includes(name);
                  const incompatible = allowedBaseUnit !== null && unit !== allowedBaseUnit;
                  return (
                    <option key={name} value={name} disabled={alreadyPicked || incompatible}>
                      {name}
                      {unit ? ` ($/${unit})` : ''}
                      {incompatible ? ' — different unit' : ''}
                    </option>
                  );
                })}
              </Select>

              {allowedBaseUnit && (
                <p style={{ fontSize: '12px', color: 'var(--black-secondary)', margin: '8px 0 0' }}>
                  Comparing in <strong>$/{allowedBaseUnit}</strong>. Items in a different unit can&apos;t be added.
                </p>
              )}

              {selectedItems.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  {selectedItems.map((name, index) => (
                    <span
                      key={name}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        fontSize: '13px',
                        fontWeight: 500,
                        backgroundColor: 'var(--ivory-bg)',
                        border: `2px solid ${getItemColor(name, index)}`,
                        borderRadius: '16px',
                        color: 'var(--black-text)'
                      }}
                    >
                      <span style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: getItemColor(name, index)
                      }} />
                      {name}
                      <button
                        onClick={() => handleRemoveCompareItem(name)}
                        aria-label={`Remove ${name}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--black-secondary)',
                          cursor: 'pointer',
                          fontSize: '16px',
                          lineHeight: 1,
                          padding: 0
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {showStoreFilter && (
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
        {mode === 'single' ? (
          !selectedItem ? (
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
                      ${stats.cheapestPrice.toFixed(2)}<span style={{ fontSize: '13px', fontWeight: 500 }}>/{stats.baseUnit}</span>
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
                      ${stats.mostExpensivePrice.toFixed(2)}<span style={{ fontSize: '13px', fontWeight: 500 }}>/{stats.baseUnit}</span>
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
                      ${stats.averagePrice.toFixed(2)}<span style={{ fontSize: '13px', fontWeight: 500 }}>/{stats.baseUnit}</span>
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

            {/* Mixed-units note — some purchases of this item are in a different
                unit (e.g. by-each vs by-weight), so they can't be compared on
                one axis; only the primary-unit purchases are shown below. */}
            {stats.mixedDimensions && (
              <Card>
                <p style={{ fontSize: '13px', color: 'var(--black-secondary)', margin: 0 }}>
                  Mixed units — some purchases of this item are priced differently
                  (by count vs weight). Showing only the <strong>$/{stats.baseUnit}</strong> purchases so the comparison stays valid.
                </p>
              </Card>
            )}

            {/* Price Chart */}
            <Card>
              <h2 className="card-title" style={{ marginBottom: '24px' }}>Price History ($/{stats.baseUnit})</h2>
              
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
                    formatter={(value: number | string) => [`$${Number(value).toFixed(2)}/${stats.baseUnit}`, '']}
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
          )
        ) : selectedItems.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <ShoppingCart size={48} style={{ color: 'var(--black-tertiary)', marginBottom: '16px' }} />
              <p style={{ color: 'var(--black-secondary)', fontSize: '16px' }}>
                Add two or more items above to compare their prices
              </p>
            </div>
          </Card>
        ) : comparisonRows.length === 0 || comparisonChartData.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <p style={{ color: 'var(--black-secondary)' }}>
                No price data available for the selected filters
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* Comparison table */}
            <Card>
              <h2 className="card-title" style={{ marginBottom: '16px' }}>Comparison ($/{comparisonBaseUnit})</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--black-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ padding: '8px 12px 8px 0' }}>Item</th>
                      <th style={{ padding: '8px 12px' }}>Average</th>
                      <th style={{ padding: '8px 12px' }}>Cheapest</th>
                      <th style={{ padding: '8px 12px' }}>Latest</th>
                      <th style={{ padding: '8px 0 8px 12px' }}>Trend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row, index) => (
                      <tr key={row.name} style={{ borderTop: '1px solid var(--ivory-border)' }}>
                        <td style={{ padding: '12px 12px 12px 0', fontWeight: 500, color: 'var(--black-text)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: getItemColor(row.name, index)
                            }} />
                            {row.name}
                          </span>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--black-text)' }}>
                          ${row.averagePrice.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px', color: 'var(--green-main)' }}>
                          ${row.cheapestPrice.toFixed(2)}
                          <span style={{ color: 'var(--black-secondary)', fontSize: '12px' }}> · {row.cheapestStore}</span>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--black-text)' }}>
                          ${row.latestPrice.toFixed(2)}
                        </td>
                        <td style={{ padding: '12px 0 12px 12px', fontWeight: 600, color: row.trend === 'up' ? 'var(--error-text)' : row.trend === 'down' ? 'var(--green-main)' : 'var(--black-secondary)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {row.trend === 'up' && <TrendingUp size={16} />}
                            {row.trend === 'down' && <TrendingDown size={16} />}
                            {row.trend === 'stable' && <Minus size={16} />}
                            {row.priceChange > 0 ? '+' : ''}{row.priceChange.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Comparison chart — one line per item */}
            <Card>
              <h2 className="card-title" style={{ marginBottom: '24px' }}>Price History ($/{comparisonBaseUnit})</h2>

              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={comparisonChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
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
                    formatter={(value: number | string) => [`$${Number(value).toFixed(2)}/${comparisonBaseUnit}`, '']}
                    labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }}
                    iconType="line"
                  />
                  {selectedItems.map((name, index) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={getItemColor(name, index)}
                      strokeWidth={3}
                      dot={{ fill: getItemColor(name, index), strokeWidth: 2, r: 5 }}
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

