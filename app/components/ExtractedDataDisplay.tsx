'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader, Check, X } from 'lucide-react';
import EditableItemName from './EditableItemName';

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice?: number;
  totalPrice: number;
  unit?: string;
}

export interface ExtractedData {
  items: ReceiptItem[];
  total: number;
  storeNameScanned?: string;
  receiptDate?: string; // Date extracted from receipt (YYYY-MM-DD)
}

interface ExtractedDataDisplayProps {
  data: ExtractedData | null;
  isProcessing: boolean;
  error: string | null;
  existingItemNames?: string[]; // For autocomplete suggestions
  onItemChange?: (index: number, updatedItem: ReceiptItem) => void;
}

export default function ExtractedDataDisplay({ 
  data, 
  isProcessing, 
  error,
  existingItemNames = [],
  onItemChange,
}: ExtractedDataDisplayProps) {
  const [editedItems, setEditedItems] = useState<ReceiptItem[]>([]);
  const [editingField, setEditingField] = useState<{index: number, field: string} | null>(null);
  const [tempValue, setTempValue] = useState<any>('');

  // Initialize edited items when data changes
  useEffect(() => {
    if (data?.items) {
      setEditedItems(data.items);
    }
  }, [data]);

  const handleItemNameChange = (index: number, newName: string) => {
    const updatedItems = [...editedItems];
    updatedItems[index] = { ...updatedItems[index], name: newName };
    setEditedItems(updatedItems);
    
    if (onItemChange) {
      onItemChange(index, updatedItems[index]);
    }
  };

  const startEditing = (index: number, field: string, currentValue: any) => {
    setEditingField({ index, field });
    setTempValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValue('');
  };

  const saveFieldEdit = () => {
    if (!editingField) return;
    
    const { index, field } = editingField;
    const updatedItems = [...editedItems];
    updatedItems[index] = { ...updatedItems[index], [field]: tempValue };
    
    // Auto-calculate totalPrice if quantity or unitPrice changes
    const item = updatedItems[index];
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = parseFloat(item.quantity?.toString() || '0');
      const price = parseFloat(item.unitPrice?.toString() || '0');
      if (!isNaN(qty) && !isNaN(price)) {
        updatedItems[index].totalPrice = qty * price;
      }
    }
    
    setEditedItems(updatedItems);
    
    if (onItemChange) {
      onItemChange(index, updatedItems[index]);
    }
    
    setEditingField(null);
    setTempValue('');
  };

  const handleFieldKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveFieldEdit();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };
  return (
    <div>
      <h3 style={{
        fontSize: '18px',
        fontWeight: 600,
        marginBottom: '16px',
        color: 'var(--black-text)'
      }}>
        Extracted Items
      </h3>
      
      {isProcessing && (
        <div className="flex items-center justify-center gap-md" style={{ padding: '32px 0' }}>
          <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--golden-main)' }} />
          <p style={{ color: 'var(--black-secondary)' }}>Processing receipt...</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-md" style={{
          padding: '16px',
          backgroundColor: '#ffebee',
          border: '2px solid var(--error-bg)',
          borderRadius: '4px'
        }}>
          <AlertCircle size={24} style={{ color: 'var(--error-text)', flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 600, color: 'var(--error-text)' }}>Error</p>
            <p style={{ fontSize: '14px', color: 'var(--error-text)' }}>{error}</p>
          </div>
        </div>
      )}

      {data && !isProcessing && !error && (
        <div className="flex flex-col gap-base">
          {/* Success message */}
          <div className="flex items-center gap-sm" style={{ color: 'var(--green-main)' }}>
            <CheckCircle size={20} />
            <span style={{ fontWeight: 600 }}>Receipt processed successfully!</span>
          </div>

          {/* Scanned store name and date */}
          {(data.storeNameScanned || data.receiptDate) && (
            <div style={{
              padding: '12px',
              backgroundColor: 'var(--ivory-bg)',
              border: '1px solid var(--ivory-border)',
              borderRadius: '4px'
            }}>
              {data.storeNameScanned && (
                <p style={{ fontSize: '14px', color: 'var(--black-tertiary)', marginBottom: '4px' }}>
                  <strong>Detected Store:</strong> {data.storeNameScanned}
                </p>
              )}
              {data.receiptDate && (
                <p style={{ fontSize: '14px', color: 'var(--black-tertiary)' }}>
                  <strong>Receipt Date:</strong> {new Date(data.receiptDate).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}
                </p>
              )}
            </div>
          )}

          {/* Items table */}
          <div style={{ overflowX: 'auto' }}>
            <div style={{
              backgroundColor: 'var(--ivory-bg)',
              border: '2px solid var(--black-text)',
              borderRadius: '4px',
              boxShadow: 'var(--shadow-retro)'
            }}>
              {/* Desktop Table */}
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                display: window.innerWidth < 640 ? 'none' : 'table'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: 'var(--ivory-darker)',
                    borderBottom: '2px solid var(--black-text)'
                  }}>
                    <th style={{
                      padding: '16px',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Item Name</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'right',
                      fontWeight: 600,
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Quantity</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'right',
                      fontWeight: 600,
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Unit Price</th>
                    <th style={{
                      padding: '16px',
                      textAlign: 'right',
                      fontWeight: 600,
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {editedItems.map((item, index) => (
                    <tr 
                      key={index}
                      style={{
                        borderBottom: index === editedItems.length - 1 ? 'none' : '1px solid var(--ivory-border)',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ivory-card)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '16px', fontWeight: 500, verticalAlign: 'middle' }}>
                        <EditableItemName
                          value={item.name}
                          onChange={(newName) => handleItemNameChange(index, newName)}
                          suggestions={existingItemNames}
                        />
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', verticalAlign: 'middle' }}>
                        {editingField?.index === index && editingField?.field === 'quantity' ? (
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
                            <span style={{ minWidth: '30px', fontSize: '12px' }}>{item.unit || ''}</span>
                            <button onClick={saveFieldEdit} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                              <Check size={16} color="var(--green-main)" />
                            </button>
                            <button onClick={cancelEditing} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                              <X size={16} color="var(--error-text)" />
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => startEditing(index, 'quantity', item.quantity)}
                            style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ivory-darker)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            {item.quantity || '-'} {item.unit || ''}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', verticalAlign: 'middle' }}>
                        {editingField?.index === index && editingField?.field === 'unitPrice' ? (
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
                            <button onClick={saveFieldEdit} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                              <Check size={16} color="var(--green-main)" />
                            </button>
                            <button onClick={cancelEditing} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                              <X size={16} color="var(--error-text)" />
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => startEditing(index, 'unitPrice', item.unitPrice)}
                            style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ivory-darker)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            {item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '-'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, verticalAlign: 'middle' }}>
                        {editingField?.index === index && editingField?.field === 'totalPrice' ? (
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
                            <button onClick={saveFieldEdit} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                              <Check size={16} color="var(--green-main)" />
                            </button>
                            <button onClick={cancelEditing} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                              <X size={16} color="var(--error-text)" />
                            </button>
                          </div>
                        ) : (
                          <span
                            onClick={() => startEditing(index, 'totalPrice', item.totalPrice)}
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
                </tbody>
                <tfoot>
                  <tr style={{
                    backgroundColor: 'var(--green-pale)',
                    borderTop: '2px solid var(--black-text)'
                  }}>
                    <td colSpan={3} style={{
                      padding: '16px',
                      textAlign: 'right',
                      fontWeight: 700,
                      fontSize: '16px'
                    }}>TOTAL:</td>
                    <td style={{
                      padding: '16px',
                      textAlign: 'right',
                      fontWeight: 700,
                      fontSize: '16px'
                    }}>{data.total != null ? `$${data.total.toFixed(2)}` : '$0.00'}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Mobile Card View */}
              <div style={{ display: window.innerWidth < 640 ? 'block' : 'none' }}>
                {editedItems.map((item, index) => (
                  <div 
                    key={index}
                    style={{
                      padding: '16px',
                      borderBottom: index === editedItems.length - 1 ? 'none' : '1px solid var(--ivory-border)'
                    }}
                  >
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        fontWeight: 600, 
                        textTransform: 'uppercase',
                        color: 'var(--black-tertiary)',
                        marginBottom: '6px'
                      }}>
                        Item Name
                      </label>
                      <EditableItemName
                        value={item.name}
                        onChange={(newName) => handleItemNameChange(index, newName)}
                        suggestions={existingItemNames}
                      />
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        fontWeight: 600,
                        color: 'var(--black-secondary)',
                        marginBottom: '4px'
                      }}>
                        Quantity
                      </label>
                      {editingField?.index === index && editingField?.field === 'quantity' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="number"
                            value={tempValue}
                            onChange={(e) => setTempValue(parseFloat(e.target.value) || 0)}
                            onKeyDown={handleFieldKeyDown}
                            autoFocus
                            step="0.01"
                            style={{
                              flex: 1,
                              padding: '8px',
                              fontSize: '14px',
                              border: '2px solid var(--golden-main)',
                              borderRadius: '4px',
                            }}
                          />
                          <span style={{ fontSize: '12px' }}>{item.unit || ''}</span>
                          <button onClick={saveFieldEdit} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                            <Check size={16} color="var(--green-main)" />
                          </button>
                          <button onClick={cancelEditing} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                            <X size={16} color="var(--error-text)" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditing(index, 'quantity', item.quantity)}
                          style={{ cursor: 'pointer', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--ivory-bg)' }}
                        >
                          {item.quantity || '-'} {item.unit || ''}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        fontWeight: 600,
                        color: 'var(--black-secondary)',
                        marginBottom: '4px'
                      }}>
                        Unit Price
                      </label>
                      {editingField?.index === index && editingField?.field === 'unitPrice' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="number"
                            value={tempValue}
                            onChange={(e) => setTempValue(parseFloat(e.target.value) || 0)}
                            onKeyDown={handleFieldKeyDown}
                            autoFocus
                            step="0.01"
                            placeholder="0.00"
                            style={{
                              width: '100%',
                              padding: '8px',
                              fontSize: '14px',
                              border: '2px solid var(--golden-main)',
                              borderRadius: '4px',
                            }}
                          />
                          <button onClick={saveFieldEdit} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                            <Check size={16} color="var(--green-main)" />
                          </button>
                          <button onClick={cancelEditing} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                            <X size={16} color="var(--error-text)" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditing(index, 'unitPrice', item.unitPrice)}
                          style={{ cursor: 'pointer', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--ivory-bg)' }}
                        >
                          {item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '-'}
                        </div>
                      )}
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        fontWeight: 600,
                        color: 'var(--black-secondary)',
                        marginBottom: '4px'
                      }}>
                        Total Price
                      </label>
                      {editingField?.index === index && editingField?.field === 'totalPrice' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="number"
                            value={tempValue}
                            onChange={(e) => setTempValue(parseFloat(e.target.value) || 0)}
                            onKeyDown={handleFieldKeyDown}
                            autoFocus
                            step="0.01"
                            placeholder="0.00"
                            style={{
                              width: '100%',
                              padding: '8px',
                              fontSize: '14px',
                              border: '2px solid var(--golden-main)',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          />
                          <button onClick={saveFieldEdit} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                            <Check size={16} color="var(--green-main)" />
                          </button>
                          <button onClick={cancelEditing} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                            <X size={16} color="var(--error-text)" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => startEditing(index, 'totalPrice', item.totalPrice)}
                          style={{ cursor: 'pointer', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--ivory-bg)', fontWeight: 600 }}
                        >
                          {item.totalPrice != null ? `$${item.totalPrice.toFixed(2)}` : '-'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div style={{
                  padding: '16px',
                  backgroundColor: 'var(--green-pale)',
                  borderTop: '2px solid var(--black-text)'
                }}>
                  <div className="flex justify-between" style={{ fontWeight: 700, fontSize: '16px' }}>
                    <span>GRAND TOTAL:</span>
                    <span>{data.total != null ? `$${data.total.toFixed(2)}` : '$0.00'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!data && !isProcessing && !error && (
        <div style={{
          textAlign: 'center',
          padding: '32px 0',
          color: 'var(--black-tertiary)'
        }}>
          <p>Upload a receipt to see extracted data here</p>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
