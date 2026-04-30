'use client';

import React from 'react';
import { Download, Filter, X } from 'lucide-react';
import Button from './Button';
import Card from './Card';
import { ReceiptFiltersState, SortOption } from '@/lib/hooks/useReceiptFilters';

interface ReceiptFiltersProps extends ReceiptFiltersState {
  totalCount: number;
  stores: string[];
  onExport: () => void;
}

export default function ReceiptFilters({
  searchTerm, setSearchTerm,
  sortBy, setSortBy,
  showFilters, setShowFilters,
  selectedStores, toggleStoreFilter,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  minAmount, setMinAmount,
  maxAmount, setMaxAmount,
  clearFilters,
  hasActiveFilters,
  totalCount,
  stores,
  onExport,
}: ReceiptFiltersProps) {
  const activeCount = [searchTerm, selectedStores.length, dateFrom, dateTo, minAmount, maxAmount].filter(Boolean).length;

  return (
    <Card>
      <div className="flex flex-col gap-base">
        {/* Search and Sort Row */}
        <div className="flex flex-wrap items-center justify-between gap-base">
          <div className="input-group" style={{ flex: 1, minWidth: '250px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search by store name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-md items-center">
            <div className="input-group" style={{ minWidth: '200px' }}>
              <select
                className="input-field"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                style={{ padding: '10px', fontSize: '14px' }}
              >
                <option value="billingDateDesc">Billing Date (Latest First)</option>
                <option value="billingDateAsc">Billing Date (Oldest First)</option>
                <option value="uploadDateDesc">Upload Date (Latest First)</option>
                <option value="uploadDateAsc">Upload Date (Oldest First)</option>
                <option value="totalDesc">Total Amount (Highest First)</option>
                <option value="totalAsc">Total Amount (Lowest First)</option>
                <option value="storeAsc">Store Name (A-Z)</option>
                <option value="storeDesc">Store Name (Z-A)</option>
              </select>
            </div>
            <Button variant={showFilters ? 'primary' : 'secondary'} onClick={() => setShowFilters(!showFilters)}>
              <Filter size={20} />
              Filters
              {hasActiveFilters && (
                <span style={{ marginLeft: '8px', backgroundColor: 'var(--error-text)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>
                  {activeCount}
                </span>
              )}
            </Button>
            <Button variant="primary" onClick={onExport} disabled={totalCount === 0}>
              <Download size={20} />
              Export All
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div style={{ borderTop: '1px solid var(--ivory-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="flex items-center justify-between">
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Filter Options</h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: 'var(--golden-main)', cursor: 'pointer', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <X size={16} />
                  Clear All
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {/* Store Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--black-text)' }}>Filter by Store</label>
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--ivory-border)', borderRadius: '4px', padding: '8px' }}>
                  {stores.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--black-tertiary)', padding: '8px' }}>No stores available</p>
                  ) : (
                    stores.map(store => (
                      <label key={store} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', cursor: 'pointer', fontSize: '14px' }}>
                        <input type="checkbox" checked={selectedStores.includes(store)} onChange={() => toggleStoreFilter(store)} style={{ cursor: 'pointer' }} />
                        <span>{store}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--black-text)' }}>Billing Date Range</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input type="date" className="input-field" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} max={dateTo || new Date().toISOString().split('T')[0]} style={{ fontSize: '14px' }} />
                  <input type="date" className="input-field" value={dateTo} onChange={(e) => setDateTo(e.target.value)} min={dateFrom} max={new Date().toISOString().split('T')[0]} style={{ fontSize: '14px' }} />
                </div>
              </div>

              {/* Amount Range */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--black-text)' }}>Total Amount Range</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input type="number" className="input-field" placeholder="Min Amount ($)" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} min="0" step="0.01" style={{ fontSize: '14px' }} />
                  <input type="number" className="input-field" placeholder="Max Amount ($)" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} min={minAmount || '0'} step="0.01" style={{ fontSize: '14px' }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
