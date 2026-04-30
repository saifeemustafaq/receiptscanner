'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import Card from './Card';
import ReceiptStoreHeader from './ReceiptStoreHeader';
import { SavedReceipt } from '@/lib/types';
import { useEditableItems } from '@/lib/hooks/useEditableItems';

interface ReceiptDetailViewProps {
  receipt: SavedReceipt;
  stores: string[];
  units: string[];
  onUpdate: (id: string, updates: Partial<SavedReceipt>) => void;
  onDelete: (id: string) => void;
  showHeader?: boolean;
}

export default function ReceiptDetailView({
  receipt,
  stores,
  units,
  onUpdate,
  onDelete,
  showHeader = true,
}: ReceiptDetailViewProps) {
  const {
    editedItems,
    editingField,
    tempValue,
    setTempValue,
    startEditing,
    cancelEditing,
    saveFieldEdit,
    handleFieldKeyDown,
    isEditing,
  } = useEditableItems(
    JSON.parse(JSON.stringify(receipt.extractedData.items)),
    {
      onItemsChange: (updatedItems) => {
        const newTotal = updatedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
        onUpdate(receipt.id, { extractedData: { ...receipt.extractedData, items: updatedItems, total: newTotal } });
      },
    }
  );

  const SaveCancel = ({ onClick }: { onClick?: () => void }) => (
    <>
      <button onClick={(e) => { e.stopPropagation(); saveFieldEdit(); }} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
        <Check size={16} color="var(--green-main)" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); onClick ? onClick() : cancelEditing(); }} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
        <X size={16} color="var(--error-text)" />
      </button>
    </>
  );

  const inputStyle = (width: string, extra?: React.CSSProperties): React.CSSProperties => ({
    width,
    padding: '6px 8px',
    fontSize: '14px',
    border: '2px solid var(--golden-main)',
    borderRadius: '4px',
    ...extra,
  });

  return (
    <Card>
      <div className="flex flex-col gap-base">
        {showHeader && (
          <ReceiptStoreHeader receipt={receipt} stores={stores} onUpdate={onUpdate} onDelete={onDelete} />
        )}

        <div style={{ borderTop: showHeader ? '1px solid var(--ivory-border)' : 'none', paddingTop: showHeader ? '16px' : '0', marginTop: showHeader ? '8px' : '0' }}>
          {receipt.storeNameScanned && receipt.storeNameScanned !== receipt.storeNameSelected && (
            <p style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--black-secondary)' }}>
              <strong>Detected Store:</strong> {receipt.storeNameScanned}
            </p>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--ivory-darker)', borderBottom: '2px solid var(--black-text)' }}>
                  {['Item', 'Qty', 'Unit Price', 'Total'].map((h, i) => (
                    <th key={h} style={{ padding: '12px', textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(editingField ? editedItems : receipt.extractedData.items).map((item, idx) => (
                  <tr key={`${item.name}-${idx}`} style={{ borderBottom: '1px solid var(--ivory-border)' }}>
                    {/* Name */}
                    <td style={{ padding: '12px' }}>
                      {isEditing(idx, 'name') ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input type="text" value={tempValue} autoFocus onChange={(e) => setTempValue(e.target.value)} onKeyDown={handleFieldKeyDown} style={inputStyle('100%')} />
                          <SaveCancel />
                        </div>
                      ) : (
                        <span onClick={() => startEditing(idx, 'name', item.name)} style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ivory-darker)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >{item.name}</span>
                      )}
                    </td>

                    {/* Qty + Unit */}
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {isEditing(idx, 'quantity') ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <input type="number" value={tempValue} autoFocus step="0.01" onChange={(e) => setTempValue(parseFloat(e.target.value) || 0)} onKeyDown={handleFieldKeyDown} style={inputStyle('70px', { textAlign: 'right' })} />
                          <span onClick={() => startEditing(idx, 'unit', editedItems[idx].unit || '')} style={{ minWidth: '30px', fontSize: '12px', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ivory-darker)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >{item.unit || ''}</span>
                          <SaveCancel />
                        </div>
                      ) : isEditing(idx, 'unit') ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '14px' }}>{item.quantity || '-'}</span>
                          <select value={tempValue || ''} autoFocus onChange={(e) => setTempValue(e.target.value)} onKeyDown={handleFieldKeyDown} style={inputStyle('80px', { cursor: 'pointer' })}>
                            <option value="">(no unit)</option>
                            {units.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <SaveCancel />
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <span onClick={() => startEditing(idx, 'quantity', item.quantity)} style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ivory-darker)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >{item.quantity || '-'}</span>
                          <span onClick={() => startEditing(idx, 'unit', item.unit || '')} style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: item.unit ? 'var(--black-text)' : 'var(--black-tertiary)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ivory-darker)')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >{item.unit || '(no unit)'}</span>
                        </div>
                      )}
                    </td>

                    {/* Unit Price */}
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {isEditing(idx, 'unitPrice') ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <input type="number" value={tempValue} autoFocus step="0.01" placeholder="0.00" onChange={(e) => setTempValue(parseFloat(e.target.value) || 0)} onKeyDown={handleFieldKeyDown} style={inputStyle('90px', { textAlign: 'right' })} />
                          <SaveCancel />
                        </div>
                      ) : (
                        <span onClick={() => startEditing(idx, 'unitPrice', item.unitPrice)} style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ivory-darker)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >{item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '-'}</span>
                      )}
                    </td>

                    {/* Total Price */}
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>
                      {isEditing(idx, 'totalPrice') ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                          <input type="number" value={tempValue} autoFocus step="0.01" placeholder="0.00" onChange={(e) => setTempValue(parseFloat(e.target.value) || 0)} onKeyDown={handleFieldKeyDown} style={inputStyle('90px', { textAlign: 'right', fontWeight: 600 })} />
                          <SaveCancel />
                        </div>
                      ) : (
                        <span onClick={() => startEditing(idx, 'totalPrice', item.totalPrice)} style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ivory-darker)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >{item.totalPrice != null ? `$${item.totalPrice.toFixed(2)}` : '-'}</span>
                      )}
                    </td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: 'var(--green-pale)', borderTop: '2px solid var(--black-text)' }}>
                  <td colSpan={3} style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>TOTAL:</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>
                    {editingField && editedItems.length > 0
                      ? `$${editedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0).toFixed(2)}`
                      : `$${receipt.extractedData.total?.toFixed(2) || '0.00'}`}
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
