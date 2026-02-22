'use client';

import React, { useState, useMemo } from 'react';
import { Trash2, Download, Eye, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import ReceiptDetailView from './ReceiptDetailView';
import { SavedReceipt } from '@/lib/types';

type SortOption = 
  | 'billingDateDesc' 
  | 'billingDateAsc' 
  | 'uploadDateDesc' 
  | 'uploadDateAsc' 
  | 'totalDesc' 
  | 'totalAsc' 
  | 'storeAsc' 
  | 'storeDesc';

interface ReceiptHistoryProps {
  receipts: SavedReceipt[];
  stores: string[];
  units: string[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: any) => void;
  onExport: () => void;
}

export default function ReceiptHistory({ receipts, stores, units, onDelete, onUpdate, onExport }: ReceiptHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('billingDateDesc'); // Default: Latest billing date first
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Filter and sort receipts
  const filteredAndSortedReceipts = useMemo(() => {
    let filtered = [...receipts];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(receipt =>
        receipt.storeNameSelected.toLowerCase().includes(searchTerm.toLowerCase()) ||
        receipt.storeNameScanned.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Store filter
    if (selectedStores.length > 0) {
      filtered = filtered.filter(receipt =>
        selectedStores.includes(receipt.storeNameSelected)
      );
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(receipt => receipt.billingDate >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(receipt => receipt.billingDate <= dateTo);
    }

    // Amount range filter
    if (minAmount) {
      const min = parseFloat(minAmount);
      if (!isNaN(min)) {
        filtered = filtered.filter(receipt => receipt.extractedData.total >= min);
      }
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount);
      if (!isNaN(max)) {
        filtered = filtered.filter(receipt => receipt.extractedData.total <= max);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'billingDateDesc':
          return new Date(b.billingDate).getTime() - new Date(a.billingDate).getTime();
        case 'billingDateAsc':
          return new Date(a.billingDate).getTime() - new Date(b.billingDate).getTime();
        case 'uploadDateDesc':
          return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
        case 'uploadDateAsc':
          return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
        case 'totalDesc':
          return b.extractedData.total - a.extractedData.total;
        case 'totalAsc':
          return a.extractedData.total - b.extractedData.total;
        case 'storeAsc':
          return a.storeNameSelected.localeCompare(b.storeNameSelected);
        case 'storeDesc':
          return b.storeNameSelected.localeCompare(a.storeNameSelected);
        default:
          return 0;
      }
    });

    return filtered;
  }, [receipts, searchTerm, sortBy, selectedStores, dateFrom, dateTo, minAmount, maxAmount]);

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleStoreFilter = (store: string) => {
    setSelectedStores(prev =>
      prev.includes(store)
        ? prev.filter(s => s !== store)
        : [...prev, store]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStores([]);
    setDateFrom('');
    setDateTo('');
    setMinAmount('');
    setMaxAmount('');
  };

  const hasActiveFilters = searchTerm || selectedStores.length > 0 || dateFrom || dateTo || minAmount || maxAmount;

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Receipt History</h1>
        <p className="page-subtitle">
          View and manage your scanned receipts
        </p>
      </header>

      <div className="content-section">
        {/* Actions Bar */}
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
                <Button 
                  variant={showFilters ? "primary" : "secondary"} 
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter size={20} />
                  Filters
                  {hasActiveFilters && (
                    <span style={{
                      marginLeft: '8px',
                      backgroundColor: 'var(--error-text)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      {[searchTerm, selectedStores.length, dateFrom, dateTo, minAmount, maxAmount].filter(Boolean).length}
                    </span>
                  )}
                </Button>
                <Button variant="primary" onClick={onExport} disabled={receipts.length === 0}>
                  <Download size={20} />
                  Export All
                </Button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div style={{
                borderTop: '1px solid var(--ivory-border)',
                paddingTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div className="flex items-center justify-between">
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Filter Options</h3>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--golden-main)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <X size={16} />
                      Clear All
                    </button>
                  )}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px'
                }}>
                  {/* Store Filter */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 600,
                      marginBottom: '8px',
                      color: 'var(--black-text)'
                    }}>
                      Filter by Store
                    </label>
                    <div style={{
                      maxHeight: '150px',
                      overflowY: 'auto',
                      border: '1px solid var(--ivory-border)',
                      borderRadius: '4px',
                      padding: '8px'
                    }}>
                      {stores.length === 0 ? (
                        <p style={{ fontSize: '12px', color: 'var(--black-tertiary)', padding: '8px' }}>
                          No stores available
                        </p>
                      ) : (
                        stores.map(store => (
                          <label
                            key={store}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedStores.includes(store)}
                              onChange={() => toggleStoreFilter(store)}
                              style={{ cursor: 'pointer' }}
                            />
                            <span>{store}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Date Range Filter */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 600,
                      marginBottom: '8px',
                      color: 'var(--black-text)'
                    }}>
                      Billing Date Range
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="date"
                        className="input-field"
                        placeholder="From"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        max={dateTo || new Date().toISOString().split('T')[0]}
                        style={{ fontSize: '14px' }}
                      />
                      <input
                        type="date"
                        className="input-field"
                        placeholder="To"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        min={dateFrom}
                        max={new Date().toISOString().split('T')[0]}
                        style={{ fontSize: '14px' }}
                      />
                    </div>
                  </div>

                  {/* Amount Range Filter */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 600,
                      marginBottom: '8px',
                      color: 'var(--black-text)'
                    }}>
                      Total Amount Range
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="number"
                        className="input-field"
                        placeholder="Min Amount ($)"
                        value={minAmount}
                        onChange={(e) => setMinAmount(e.target.value)}
                        min="0"
                        step="0.01"
                        style={{ fontSize: '14px' }}
                      />
                      <input
                        type="number"
                        className="input-field"
                        placeholder="Max Amount ($)"
                        value={maxAmount}
                        onChange={(e) => setMaxAmount(e.target.value)}
                        min={minAmount || "0"}
                        step="0.01"
                        style={{ fontSize: '14px' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Results Count */}
        {filteredAndSortedReceipts.length !== receipts.length && (
          <div style={{
            fontSize: '14px',
            color: 'var(--black-secondary)',
            padding: '8px 0'
          }}>
            Showing {filteredAndSortedReceipts.length} of {receipts.length} receipts
          </div>
        )}

        {/* Receipts List */}
        {filteredAndSortedReceipts.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--black-tertiary)' }}>
              {hasActiveFilters ? 'No receipts match your filters' : 'No receipts saved yet'}
            </div>
          </Card>
        ) : (
          filteredAndSortedReceipts.map(receipt => (
            <div key={receipt.id}>
              {expandedId === receipt.id ? (
                <ReceiptDetailView
                  receipt={receipt}
                  stores={stores}
                  units={units}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  showHeader={true}
                />
              ) : (
                <Card>
                  <div className="flex items-center justify-between">
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '4px' }}>
                        {receipt.storeNameSelected}
                      </h3>
                      <div style={{ fontSize: '14px', color: 'var(--black-secondary)' }}>
                        <p><strong>Billing Date:</strong> {new Date(receipt.billingDate + 'T00:00:00').toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}</p>
                        <p><strong>Uploaded:</strong> {new Date(receipt.uploadDate + 'T00:00:00').toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}</p>
                        <p><strong>Total:</strong> ${receipt.extractedData.total.toFixed(2)} • 
                           <span style={{ marginLeft: '8px' }}>{receipt.extractedData.items.length} items</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-sm">
                      <button
                        className="btn btn-secondary"
                        onClick={() => toggleExpanded(receipt.id)}
                        style={{ padding: '8px 16px' }}
                      >
                        <Eye size={16} />
                        View
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => {
                          if (confirm('Delete this receipt?')) {
                            onDelete(receipt.id);
                          }
                        }}
                        style={{ padding: '8px 16px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
