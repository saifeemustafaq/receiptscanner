'use client';

import React, { useState } from 'react';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import Card from './Card';
import Select from './Select';
import { SavedReceipt } from '@/lib/types';

interface ReceiptDetailViewProps {
  receipt: SavedReceipt;
  stores: string[];
  units: string[];
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
  showHeader?: boolean; // Whether to show the header with store name and actions
}

export default function ReceiptDetailView({ 
  receipt, 
  stores, 
  units, 
  onUpdate, 
  onDelete,
  showHeader = true 
}: ReceiptDetailViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedStoreName, setEditedStoreName] = useState('');
  const [editingField, setEditingField] = useState<{itemIndex: number, field: string} | null>(null);
  const [tempValue, setTempValue] = useState<any>('');
  const [editedItems, setEditedItems] = useState<any[]>([]);

  const getStoreOptions = () => {
    return [
      { value: '', label: 'Select a store...' },
      ...stores.map(store => ({ value: store, label: store }))
    ];
  };

  const startEdit = () => {
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

  const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStore = e.target.value;
    if (newStore && newStore !== '') {
      setEditedStoreName(newStore);
    }
  };

  const startEditingField = (itemIndex: number, field: string, currentValue: any) => {
    setEditedItems(JSON.parse(JSON.stringify(receipt.extractedData.items))); // Deep copy
    setEditingField({ itemIndex, field });
    setTempValue(currentValue);
  };

  const cancelEditingField = () => {
    setEditingField(null);
    setTempValue('');
    setEditedItems([]);
  };

  const saveFieldEdit = () => {
    if (!editingField) return;
    
    const { itemIndex, field } = editingField;
    const updatedItems = [...editedItems];
    
    // Handle unit field - allow empty string to set to null
    if (field === 'unit') {
      updatedItems[itemIndex] = { 
        ...updatedItems[itemIndex], 
        unit: tempValue === '' || tempValue === null ? null : tempValue 
      };
    } else {
      updatedItems[itemIndex] = { ...updatedItems[itemIndex], [field]: tempValue };
    }
    
    // Auto-calculate totalPrice if quantity or unitPrice changes
    const item = updatedItems[itemIndex];
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = parseFloat(item.quantity?.toString() || '0');
      const price = parseFloat(item.unitPrice?.toString() || '0');
      if (!isNaN(qty) && !isNaN(price)) {
        updatedItems[itemIndex].totalPrice = qty * price;
      }
    }
    
    // Calculate new total
    const newTotal = updatedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    
    // Update the receipt
    onUpdate(receipt.id, {
      extractedData: {
        ...receipt.extractedData,
        items: updatedItems,
        total: newTotal
      }
    });
    
    setEditingField(null);
    setTempValue('');
    setEditedItems([]);
  };

  const handleFieldKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveFieldEdit();
    } else if (e.key === 'Escape') {
      cancelEditingField();
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-base">
        {/* Receipt Header */}
        {showHeader && (
          <div className="flex items-center justify-between">
            <div style={{ flex: 1 }}>
              {editingId === receipt.id ? (
                <div className="flex items-center gap-sm" style={{ marginBottom: '8px' }}>
                  <div style={{ minWidth: '200px' }}>
                    <Select
                      options={getStoreOptions()}
                      value={editedStoreName}
                      onChange={handleStoreChange}
                    />
                  </div>
                  <button
                    className="btn btn-success"
                    onClick={(e) => { e.stopPropagation(); saveEdit(receipt.id); }}
                    style={{ padding: '8px' }}
                    disabled={!editedStoreName || editedStoreName === ''}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
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
                    onClick={startEdit}
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
            {showHeader && (
              <div className="flex gap-sm">
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
            )}
          </div>
        )}

        {/* Receipt Details */}
        <div style={{
          borderTop: showHeader ? '1px solid var(--ivory-border)' : 'none',
          paddingTop: showHeader ? '16px' : '0',
          marginTop: showHeader ? '8px' : '0'
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
                {(editingField ? editedItems : receipt.extractedData.items).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--ivory-border)' }}>
                    <td style={{ padding: '12px' }}>
                      {editingField?.itemIndex === idx && editingField?.field === 'name' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onKeyDown={handleFieldKeyDown}
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              fontSize: '14px',
                              border: '2px solid var(--golden-main)',
                              borderRadius: '4px',
                            }}
                          />
                          <button onClick={(e) => { e.stopPropagation(); saveFieldEdit(); }} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                            <Check size={16} color="var(--green-main)" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); cancelEditingField(); }} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                            <X size={16} color="var(--error-text)" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => startEditingField(idx, 'name', item.name)}
                          style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ivory-darker)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {item.name}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {editingField?.itemIndex === idx && editingField?.field === 'quantity' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <input
                            type="number"
                            value={tempValue}
                            onChange={(e) => setTempValue(parseFloat(e.target.value) || 0)}
                            onKeyDown={handleFieldKeyDown}
                            autoFocus
                            step="0.01"
                            style={{
                              width: '70px',
                              padding: '6px 8px',
                              fontSize: '14px',
                              border: '2px solid var(--golden-main)',
                              borderRadius: '4px',
                              textAlign: 'right',
                            }}
                          />
                          <span 
                            onClick={() => {
                              const currentItem = editedItems[idx];
                              startEditingField(idx, 'unit', currentItem.unit || '');
                            }}
                            style={{ 
                              minWidth: '30px', 
                              fontSize: '12px',
                              cursor: 'pointer',
                              padding: '2px 4px',
                              borderRadius: '4px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ivory-darker)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Click to edit unit"
                          >
                            {item.unit || ''}
                          </span>
                          <button onClick={(e) => { e.stopPropagation(); saveFieldEdit(); }} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                            <Check size={16} color="var(--green-main)" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); cancelEditingField(); }} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                            <X size={16} color="var(--error-text)" />
                          </button>
                        </div>
                      ) : editingField?.itemIndex === idx && editingField?.field === 'unit' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '14px' }}>{item.quantity || '-'}</span>
                          <select
                            value={tempValue || ''}
                            onChange={(e) => setTempValue(e.target.value)}
                            onKeyDown={handleFieldKeyDown}
                            autoFocus
                            style={{
                              width: '80px',
                              padding: '6px 8px',
                              fontSize: '14px',
                              border: '2px solid var(--golden-main)',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="">(no unit)</option>
                            {units.map(unit => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                          <button onClick={(e) => { e.stopPropagation(); saveFieldEdit(); }} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                            <Check size={16} color="var(--green-main)" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); cancelEditingField(); }} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                            <X size={16} color="var(--error-text)" />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <span
                            onClick={() => startEditingField(idx, 'quantity', item.quantity)}
                            style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ivory-darker)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            {item.quantity || '-'}
                          </span>
                          <span
                            onClick={() => startEditingField(idx, 'unit', item.unit || '')}
                            style={{ 
                              cursor: 'pointer', 
                              padding: '4px 8px', 
                              borderRadius: '4px',
                              fontSize: '12px',
                              color: item.unit ? 'var(--black-text)' : 'var(--black-tertiary)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ivory-darker)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            title="Click to edit unit"
                          >
                            {item.unit || '(no unit)'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {editingField?.itemIndex === idx && editingField?.field === 'unitPrice' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <input
                            type="number"
                            value={tempValue}
                            onChange={(e) => setTempValue(parseFloat(e.target.value) || 0)}
                            onKeyDown={handleFieldKeyDown}
                            autoFocus
                            step="0.01"
                            placeholder="0.00"
                            style={{
                              width: '90px',
                              padding: '6px 8px',
                              fontSize: '14px',
                              border: '2px solid var(--golden-main)',
                              borderRadius: '4px',
                              textAlign: 'right',
                            }}
                          />
                          <button onClick={(e) => { e.stopPropagation(); saveFieldEdit(); }} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                            <Check size={16} color="var(--green-main)" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); cancelEditingField(); }} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                            <X size={16} color="var(--error-text)" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => startEditingField(idx, 'unitPrice', item.unitPrice)}
                          style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ivory-darker)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '-'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>
                      {editingField?.itemIndex === idx && editingField?.field === 'totalPrice' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <input
                            type="number"
                            value={tempValue}
                            onChange={(e) => setTempValue(parseFloat(e.target.value) || 0)}
                            onKeyDown={handleFieldKeyDown}
                            autoFocus
                            step="0.01"
                            placeholder="0.00"
                            style={{
                              width: '90px',
                              padding: '6px 8px',
                              fontSize: '14px',
                              border: '2px solid var(--golden-main)',
                              borderRadius: '4px',
                              textAlign: 'right',
                              fontWeight: 600,
                            }}
                          />
                          <button onClick={(e) => { e.stopPropagation(); saveFieldEdit(); }} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                            <Check size={16} color="var(--green-main)" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); cancelEditingField(); }} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                            <X size={16} color="var(--error-text)" />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => startEditingField(idx, 'totalPrice', item.totalPrice)}
                          style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ivory-darker)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          {item.totalPrice != null ? `$${item.totalPrice.toFixed(2)}` : '-'}
                        </span>
                      )}
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
                    {editingField && editedItems.length > 0
                      ? `$${editedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0).toFixed(2)}`
                      : `$${receipt.extractedData.total?.toFixed(2) || '0.00'}`
                    }
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
}

