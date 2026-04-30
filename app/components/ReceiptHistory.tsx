'use client';

import React, { useState } from 'react';
import { Trash2, Eye } from 'lucide-react';
import Card from './Card';
import ReceiptDetailView from './ReceiptDetailView';
import ReceiptFilters from './ReceiptFilters';
import { SavedReceipt } from '@/lib/types';
import { formatReceiptDate } from '@/lib/formatting';
import { useReceiptFilters } from '@/lib/hooks/useReceiptFilters';

interface ReceiptHistoryProps {
  receipts: SavedReceipt[];
  stores: string[];
  units: string[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<SavedReceipt>) => void;
  onExport: () => void;
}

export default function ReceiptHistory({ receipts, stores, units, onDelete, onUpdate, onExport }: ReceiptHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const filters = useReceiptFilters(receipts);
  const { filteredAndSortedReceipts, hasActiveFilters } = filters;

  const toggleExpanded = (id: string) => setExpandedId(expandedId === id ? null : id);

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Receipt History</h1>
        <p className="page-subtitle">View and manage your scanned receipts</p>
      </header>

      <div className="content-section">
        <ReceiptFilters {...filters} totalCount={receipts.length} stores={stores} onExport={onExport} />

        {filteredAndSortedReceipts.length !== receipts.length && (
          <div style={{ fontSize: '14px', color: 'var(--black-secondary)', padding: '8px 0' }}>
            Showing {filteredAndSortedReceipts.length} of {receipts.length} receipts
          </div>
        )}

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
                        <p><strong>Billing Date:</strong> {formatReceiptDate(receipt.billingDate)}</p>
                        <p><strong>Uploaded:</strong> {formatReceiptDate(receipt.uploadDate)}</p>
                        <p><strong>Total:</strong> ${receipt.extractedData.total.toFixed(2)} •
                           <span style={{ marginLeft: '8px' }}>{receipt.extractedData.items.length} items</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-sm">
                      <button className="btn btn-secondary" onClick={() => toggleExpanded(receipt.id)} style={{ padding: '8px 16px' }}>
                        <Eye size={16} />
                        View
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => { if (confirm('Delete this receipt?')) onDelete(receipt.id); }}
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
