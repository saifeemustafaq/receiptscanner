'use client';

import React, { useState } from 'react';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import Select from './Select';
import { SavedReceipt } from '@/lib/types';
import { formatReceiptDate } from '@/lib/formatting';

interface ReceiptStoreHeaderProps {
  receipt: SavedReceipt;
  stores: string[];
  onUpdate: (id: string, updates: Partial<SavedReceipt>) => void;
  onDelete: (id: string) => void;
}

export default function ReceiptStoreHeader({ receipt, stores, onUpdate, onDelete }: ReceiptStoreHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedStoreName, setEditedStoreName] = useState('');

  const storeOptions = [
    { value: '', label: 'Select a store...' },
    ...stores.map(s => ({ value: s, label: s })),
  ];

  const startEdit = () => {
    setIsEditing(true);
    setEditedStoreName(receipt.storeNameSelected);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditedStoreName('');
  };

  const saveEdit = () => {
    if (editedStoreName.trim()) {
      onUpdate(receipt.id, { storeNameSelected: editedStoreName.trim() });
      setIsEditing(false);
      setEditedStoreName('');
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div style={{ flex: 1 }}>
        {isEditing ? (
          <div className="flex items-center gap-sm" style={{ marginBottom: '8px' }}>
            <div style={{ minWidth: '200px' }}>
              <Select options={storeOptions} value={editedStoreName} onChange={(e) => setEditedStoreName(e.target.value)} />
            </div>
            <button className="btn btn-success" onClick={(e) => { e.stopPropagation(); saveEdit(); }} style={{ padding: '8px' }} disabled={!editedStoreName}>
              <Check size={16} />
            </button>
            <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); cancelEdit(); }} style={{ padding: '8px' }}>
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-sm" style={{ marginBottom: '4px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 600 }}>{receipt.storeNameSelected}</h3>
            <button onClick={startEdit} style={{ background: 'none', border: 'none', color: 'var(--golden-main)', cursor: 'pointer', padding: '4px' }} title="Edit store name">
              <Edit2 size={16} />
            </button>
          </div>
        )}
        <div style={{ fontSize: '14px', color: 'var(--black-secondary)' }}>
          <p><strong>Billing Date:</strong> {formatReceiptDate(receipt.billingDate)}</p>
          <p><strong>Uploaded:</strong> {formatReceiptDate(receipt.uploadDate)}</p>
          <p><strong>Total:</strong> ${receipt.extractedData.total.toFixed(2)} •
            <span style={{ marginLeft: '8px' }}>{receipt.extractedData.items.length} items</span>
          </p>
        </div>
      </div>
      <div className="flex gap-sm">
        <button className="btn btn-danger" onClick={() => { if (confirm('Delete this receipt?')) onDelete(receipt.id); }} style={{ padding: '8px 16px' }}>
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
