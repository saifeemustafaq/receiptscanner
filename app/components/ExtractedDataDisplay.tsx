'use client';

import React, { useState } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Loader, Check, X } from 'lucide-react';
import EditableItemName from './EditableItemName';
import ItemMappingControl from './ItemMappingControl';
import type { ReceiptItem, ExtractedData, MutationResult } from '@/lib/types';
import type { ItemMapping } from '@/lib/itemMappings';
import { displayUnitPrice } from '@/lib/measure';
import { DEFAULT_UNIT } from '@/lib/defaults';
import { validateLineItem, validateReceiptTotals, totalsBreakdown } from '@/lib/receiptMath';

interface ExtractedDataDisplayProps {
  data: ExtractedData | null;
  isProcessing: boolean;
  error: string | null;
  existingItemNames?: string[]; // For autocomplete suggestions
  units?: string[]; // Available units for dropdown
  mappings?: ItemMapping[]; // Learned raw -> canonical associations
  onItemChange?: (index: number, updatedItem: ReceiptItem) => void;
  onMapItem?: (rawName: string, canonicalName: string) => Promise<MutationResult>;
  onUnmapItem?: (normalizedRaw: string) => Promise<MutationResult>;
}

export default function ExtractedDataDisplay({ 
  data, 
  isProcessing, 
  error,
  existingItemNames = [],
  units = [],
  mappings = [],
  onItemChange,
  onMapItem,
  onUnmapItem,
}: ExtractedDataDisplayProps) {
  const [editedItems, setEditedItems] = useState<ReceiptItem[]>(data?.items ?? []);
  const [editingField, setEditingField] = useState<{index: number, field: string} | null>(null);
  const [tempValue, setTempValue] = useState<string | number | null>('');

  // Re-sync the local editable copy whenever a new receipt (`data`) arrives.
  // Adjusting state during render (rather than in an effect) is the React-
  // recommended way to derive state from a changing prop.
  const [syncedData, setSyncedData] = useState(data);
  if (data !== syncedData) {
    setSyncedData(data);
    setEditedItems(data?.items ?? []);
  }

  const handleItemNameChange = (index: number, newName: string) => {
    const updatedItems = [...editedItems];
    updatedItems[index] = { ...updatedItems[index], name: newName };
    setEditedItems(updatedItems);
    
    if (onItemChange) {
      onItemChange(index, updatedItems[index]);
    }
  };

  const startEditing = (index: number, field: string, currentValue: string | number | null | undefined) => {
    setEditingField({ index, field });
    setTempValue(currentValue ?? '');
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValue('');
  };

  const saveFieldEdit = () => {
    if (!editingField) return;
    
    const { index, field } = editingField;
    const updatedItems = [...editedItems];

    // Unit is committed via commitUnit (inline dropdown), so this path only
    // handles the numeric fields (quantity / unitPrice / totalPrice).
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

  // Unit is edited via an always-visible inline dropdown (no click-to-edit, no
  // confirm step): picking an option commits immediately. Empty => null.
  const commitUnit = (index: number, rawValue: string) => {
    const updatedItems = [...editedItems];
    updatedItems[index] = { ...updatedItems[index], unit: rawValue === '' ? null : rawValue };
    setEditedItems(updatedItems);
    onItemChange?.(index, updatedItems[index]);
  };

  const renderUnitSelect = (index: number, item: ReceiptItem, width = '90px') => {
    // Default to "each" when nothing was printed, and keep an out-of-list unit
    // selectable so it isn't silently dropped.
    const currentUnit = item.unit || DEFAULT_UNIT;
    const options = units.includes(currentUnit) ? units : [currentUnit, ...units];
    return (
      <select
        value={currentUnit}
        onChange={(e) => commitUnit(index, e.target.value)}
        title="Select unit"
        style={{
          width,
          padding: '6px 8px',
          fontSize: '12px',
          border: '1px solid var(--black-tertiary)',
          borderRadius: '4px',
          backgroundColor: 'var(--ivory-bg)',
          color: 'var(--black-text)',
          cursor: 'pointer',
        }}
      >
        {options.map(unit => (
          <option key={unit} value={unit}>{unit}</option>
        ))}
      </select>
    );
  };

  // Non-blocking receipt-math validation, derived from the live editable copy
  // so a warning clears the instant the user corrects the number. Never blocks
  // saving (DEVELOPER_GUIDE §15 — inline messaging).
  const lineWarnings: Record<number, NonNullable<ReturnType<typeof validateLineItem>>> = {};
  editedItems.forEach((item, i) => {
    const result = validateLineItem(item);
    if (result && !result.ok) lineWarnings[i] = result;
  });
  const totalsFindings = data ? validateReceiptTotals({ ...data, items: editedItems }) : [];
  // Subtotal / tax / service-delivery-bag fees printed on the receipt, so extra
  // charges are visible above the grand total instead of vanishing into it.
  const breakdownRows = data ? totalsBreakdown(data) : [];

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
          backgroundColor: 'var(--error-pale)',
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

          {/* Scanned store name */}
          {data.storeNameScanned && (
            <div style={{
              padding: '12px',
              backgroundColor: 'var(--ivory-bg)',
              border: '1px solid var(--ivory-border)',
              borderRadius: '4px'
            }}>
              <p style={{ fontSize: '14px', color: 'var(--black-tertiary)' }}>
                <strong>Detected Store:</strong> {data.storeNameScanned}
              </p>
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
                        {onMapItem && (
                          <ItemMappingControl
                            rawName={item.name}
                            mappings={mappings}
                            suggestions={existingItemNames}
                            onMap={onMapItem}
                            onUnmap={onUnmapItem}
                          />
                        )}
                        {lineWarnings[index] && (
                          <div title={lineWarnings[index].message} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: 'var(--error-text)', fontSize: '12px' }}>
                            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                            <span>Doesn&apos;t match qty × unit price (expected ${lineWarnings[index].expected.toFixed(2)})</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          {editingField?.index === index && editingField?.field === 'quantity' ? (
                            <>
                              <input
                                type="number"
                                value={tempValue ?? ''}
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
                              <button onClick={saveFieldEdit} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                                <Check size={16} color="var(--green-main)" />
                              </button>
                              <button onClick={cancelEditing} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                                <X size={16} color="var(--error-text)" />
                              </button>
                            </>
                          ) : (
                            <span
                              onClick={() => startEditing(index, 'quantity', item.quantity)}
                              style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ivory-darker)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              {item.quantity || '-'}
                            </span>
                          )}
                          {renderUnitSelect(index, item, '84px')}
                        </div>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', verticalAlign: 'middle' }}>
                        {editingField?.index === index && editingField?.field === 'unitPrice' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                            <input
                              type="number"
                              value={tempValue ?? ''}
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
                            {(() => { const dp = displayUnitPrice(item); return dp != null ? `$${dp.toFixed(2)}` : '-'; })()}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, verticalAlign: 'middle' }}>
                        {editingField?.index === index && editingField?.field === 'totalPrice' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                            <input
                              type="number"
                              value={tempValue ?? ''}
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
                  {breakdownRows.map((row, i) => (
                    <tr key={i} style={{ borderTop: i === 0 ? '2px solid var(--black-text)' : 'none' }}>
                      <td colSpan={3} style={{ padding: '8px 16px', textAlign: 'right', fontSize: '14px', color: 'var(--black-secondary)' }}>{row.label}:</td>
                      <td style={{ padding: '8px 16px', textAlign: 'right', fontSize: '14px', color: 'var(--black-secondary)' }}>${row.amount.toFixed(2)}</td>
                    </tr>
                  ))}
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
                      {onMapItem && (
                        <ItemMappingControl
                          rawName={item.name}
                          mappings={mappings}
                          suggestions={existingItemNames}
                          onMap={onMapItem}
                          onUnmap={onUnmapItem}
                        />
                      )}
                      {lineWarnings[index] && (
                        <div title={lineWarnings[index].message} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: 'var(--error-text)', fontSize: '12px' }}>
                          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                          <span>Doesn&apos;t match qty × unit price (expected ${lineWarnings[index].expected.toFixed(2)})</span>
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
                        Quantity &amp; Unit
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {editingField?.index === index && editingField?.field === 'quantity' ? (
                          <>
                            <input
                              type="number"
                              value={tempValue ?? ''}
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
                            <button onClick={saveFieldEdit} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                              <Check size={16} color="var(--green-main)" />
                            </button>
                            <button onClick={cancelEditing} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
                              <X size={16} color="var(--error-text)" />
                            </button>
                          </>
                        ) : (
                          <div
                            onClick={() => startEditing(index, 'quantity', item.quantity)}
                            style={{ flex: 1, cursor: 'pointer', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--ivory-bg)' }}
                          >
                            {item.quantity || '-'}
                          </div>
                        )}
                        {renderUnitSelect(index, item, '120px')}
                      </div>
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
                            value={tempValue ?? ''}
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
                          {(() => { const dp = displayUnitPrice(item); return dp != null ? `$${dp.toFixed(2)}` : '-'; })()}
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
                            value={tempValue ?? ''}
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
                {breakdownRows.length > 0 && (
                  <div style={{ padding: '12px 16px', borderTop: '2px solid var(--black-text)' }}>
                    {breakdownRows.map((row, i) => (
                      <div key={i} className="flex justify-between" style={{ fontSize: '14px', color: 'var(--black-secondary)', marginBottom: '6px' }}>
                        <span>{row.label}</span>
                        <span>${row.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
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

          {/* Non-blocking receipt-math findings. Subtotal mismatches are shown
              as warnings; unaccounted adjustments (fees/deposits/coupons) as a
              neutral note. Saving is always allowed. */}
          {totalsFindings.length > 0 && (
            <div className="flex flex-col gap-sm">
              {totalsFindings.map((finding, i) => {
                const isNote = finding.kind === 'unaccounted-adjustments';
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: '4px',
                      backgroundColor: isNote ? 'var(--ivory-darker)' : 'var(--error-pale)',
                      border: isNote ? '1px solid var(--ivory-border)' : '2px solid var(--error-bg)',
                      color: isNote ? 'var(--black-secondary)' : 'var(--error-text)',
                    }}
                  >
                    <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                    <p style={{ fontSize: '13px', margin: 0 }}>{finding.message}</p>
                  </div>
                );
              })}
            </div>
          )}
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
