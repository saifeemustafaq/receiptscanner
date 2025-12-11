'use client';

import React, { useState } from 'react';
import { Trash2, Download, Eye, Edit2, Check, X } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import Select from './Select';
import { ExtractedData } from './ExtractedDataDisplay';

interface SavedReceipt {
  id: string;
  storeNameScanned: string;
  storeNameSelected: string;
  billingDate: string;      // Date on the receipt
  uploadDate: string;        // Date when uploaded
  extractedData: ExtractedData;
  timestamp: string;
}

interface ReceiptHistoryProps {
  receipts: SavedReceipt[];
  stores: string[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: any) => void;
  onExport: () => void;
}

export default function ReceiptHistory({ receipts, stores, onDelete, onUpdate, onExport }: ReceiptHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedStoreName, setEditedStoreName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Create store options for dropdown
  const getStoreOptions = () => {
    return [
      { value: '', label: 'Select a store...' },
      ...stores.map(store => ({ value: store, label: store }))
    ];
  };

  const filteredReceipts = receipts.filter(receipt =>
    receipt.storeNameSelected.toLowerCase().includes(searchTerm.toLowerCase()) ||
    receipt.storeNameScanned.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const startEdit = (receipt: SavedReceipt) => {
    setEditingId(receipt.id);
    setEditedStoreName(receipt.storeNameSelected);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditedStoreName('');
  };

  const saveEdit = (id: string) => {
    if (editedStoreName.trim() && editedStoreName !== '') {
      onUpdate(id, { storeNameSelected: editedStoreName.trim() });
      setEditingId(null);
      setEditedStoreName('');
    }
  };

  const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>, id: string) => {
    const newStore = e.target.value;
    if (newStore && newStore !== '') {
      setEditedStoreName(newStore);
    }
  };

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
            <div className="flex gap-md">
              <Button variant="primary" onClick={onExport} disabled={receipts.length === 0}>
                <Download size={20} />
                Export All
              </Button>
            </div>
          </div>
        </Card>

        {/* Receipts List */}
        {filteredReceipts.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--black-tertiary)' }}>
              {searchTerm ? 'No receipts match your search' : 'No receipts saved yet'}
            </div>
          </Card>
        ) : (
          filteredReceipts.map(receipt => (
            <Card key={receipt.id}>
              <div className="flex flex-col gap-base">
                {/* Receipt Header */}
                <div className="flex items-center justify-between">
                  <div style={{ flex: 1 }}>
                    {editingId === receipt.id ? (
                      <div className="flex items-center gap-sm" style={{ marginBottom: '8px' }}>
                        <div style={{ minWidth: '200px' }}>
                          <Select
                            options={getStoreOptions()}
                            value={editedStoreName}
                            onChange={(e) => handleStoreChange(e, receipt.id)}
                          />
                        </div>
                        <button
                          className="btn btn-success"
                          onClick={() => saveEdit(receipt.id)}
                          style={{ padding: '8px' }}
                          disabled={!editedStoreName || editedStoreName === ''}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={cancelEdit}
                          style={{ padding: '8px' }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-sm" style={{ marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 600 }}>
                          {receipt.storeNameSelected}
                        </h3>
                        <button
                          onClick={() => startEdit(receipt)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--golden-main)',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          title="Edit store name"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    )}
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
                      {expandedId === receipt.id ? 'Hide' : 'View'}
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

                {/* Expanded Details */}
                {expandedId === receipt.id && (
                  <div style={{
                    borderTop: '1px solid var(--ivory-border)',
                    paddingTop: '16px',
                    marginTop: '8px'
                  }}>
                    {receipt.storeNameScanned && receipt.storeNameScanned !== receipt.storeNameSelected && (
                      <p style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--black-secondary)' }}>
                        <strong>Detected Store:</strong> {receipt.storeNameScanned}
                      </p>
                    )}
                    
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{
                            backgroundColor: 'var(--ivory-darker)',
                            borderBottom: '2px solid var(--black-text)'
                          }}>
                            <th style={{ padding: '12px', textAlign: 'left' }}>Item</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Qty</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Unit Price</th>
                            <th style={{ padding: '12px', textAlign: 'right' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receipt.extractedData.items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--ivory-border)' }}>
                              <td style={{ padding: '12px' }}>{item.name}</td>
                              <td style={{ padding: '12px', textAlign: 'right' }}>
                                {item.quantity} {item.unit || ''}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right' }}>
                                {item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '-'}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>
                                ${item.totalPrice.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                          <tr style={{
                            backgroundColor: 'var(--green-pale)',
                            borderTop: '2px solid var(--black-text)'
                          }}>
                            <td colSpan={3} style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>
                              TOTAL:
                            </td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>
                              ${receipt.extractedData.total.toFixed(2)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
