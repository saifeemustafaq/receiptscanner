'use client';

import React from 'react';
import { Check, X } from 'lucide-react';
import EditableItemName from './EditableItemName';
import { ReceiptItem } from '@/lib/types';

interface ExtractedDataItemRowProps {
  item: ReceiptItem;
  index: number;
  isLast: boolean;
  isEditing: (index: number, field: string) => boolean;
  tempValue: string | number;
  setTempValue: (v: string | number) => void;
  startEditing: (index: number, field: string, value: string | number | undefined) => void;
  cancelEditing: () => void;
  saveFieldEdit: () => void;
  handleFieldKeyDown: (e: React.KeyboardEvent) => void;
  handleItemNameChange: (index: number, newName: string) => void;
  existingItemNames: string[];
  units: string[];
  mode: 'desktop' | 'mobile';
}

const EditSaveCancel = ({
  onSave,
  onCancel,
}: {
  onSave: () => void;
  onCancel: () => void;
}) => (
  <>
    <button onClick={onSave} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
      <Check size={16} color="var(--green-main)" />
    </button>
    <button onClick={onCancel} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}>
      <X size={16} color="var(--error-text)" />
    </button>
  </>
);

export default function ExtractedDataItemRow({
  item,
  index,
  isLast,
  isEditing,
  tempValue,
  setTempValue,
  startEditing,
  cancelEditing,
  saveFieldEdit,
  handleFieldKeyDown,
  handleItemNameChange,
  existingItemNames,
  units,
  mode,
}: ExtractedDataItemRowProps) {
  const borderBottom = isLast ? 'none' : '1px solid var(--ivory-border)';

  if (mode === 'desktop') {
    return (
      <tr
        key={`${item.name}-${index}`}
        style={{ borderBottom, transition: 'background-color 0.2s' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ivory-card)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <td style={{ padding: '16px', fontWeight: 500, verticalAlign: 'middle' }}>
          <EditableItemName
            value={item.name}
            onChange={(newName) => handleItemNameChange(index, newName)}
            suggestions={existingItemNames}
          />
        </td>

        {/* Quantity + Unit */}
        <td style={{ padding: '16px', textAlign: 'right', verticalAlign: 'middle' }}>
          {isEditing(index, 'quantity') ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
              <input
                type="number" value={tempValue} autoFocus step="0.01"
                onChange={(e) => setTempValue(parseFloat(e.target.value) || 0)}
                onKeyDown={handleFieldKeyDown}
                style={{ width: '70px', padding: '6px 8px', fontSize: '14px', border: '2px solid var(--golden-main)', borderRadius: '4px', textAlign: 'right' }}
              />
              <span
                onClick={() => startEditing(index, 'unit', item.unit || '')}
                style={{ minWidth: '30px', fontSize: '12px', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ivory-darker)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                title="Click to edit unit"
              >{item.unit || ''}</span>
              <EditSaveCancel onSave={saveFieldEdit} onCancel={cancelEditing} />
            </div>
          ) : isEditing(index, 'unit') ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: '14px' }}>{item.quantity || '-'}</span>
              <select
                value={tempValue || ''} autoFocus
                onChange={(e) => setTempValue(e.target.value)}
                onKeyDown={handleFieldKeyDown}
                style={{ width: '80px', padding: '6px 8px', fontSize: '14px', border: '2px solid var(--golden-main)', borderRadius: '4px', cursor: 'pointer' }}
              >
                <option value="">(no unit)</option>
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <EditSaveCancel onSave={saveFieldEdit} onCancel={cancelEditing} />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
              <span onClick={() => startEditing(index, 'quantity', item.quantity)} style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ivory-darker)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >{item.quantity || '-'}</span>
              <span onClick={() => startEditing(index, 'unit', item.unit || '')} style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: item.unit ? 'var(--black-text)' : 'var(--black-tertiary)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ivory-darker)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                title="Click to edit unit"
              >{item.unit || '(no unit)'}</span>
            </div>
          )}
        </td>

        {/* Unit Price */}
        <td style={{ padding: '16px', textAlign: 'right', verticalAlign: 'middle' }}>
          {isEditing(index, 'unitPrice') ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
              <input type="number" value={tempValue} autoFocus step="0.01" placeholder="0.00"
                onChange={(e) => setTempValue(parseFloat(e.target.value) || 0)}
                onKeyDown={handleFieldKeyDown}
                style={{ width: '90px', padding: '6px 8px', fontSize: '14px', border: '2px solid var(--golden-main)', borderRadius: '4px', textAlign: 'right' }}
              />
              <EditSaveCancel onSave={saveFieldEdit} onCancel={cancelEditing} />
            </div>
          ) : (
            <span onClick={() => startEditing(index, 'unitPrice', item.unitPrice)} style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ivory-darker)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >{item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '-'}</span>
          )}
        </td>

        {/* Total Price */}
        <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, verticalAlign: 'middle' }}>
          {isEditing(index, 'totalPrice') ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
              <input type="number" value={tempValue} autoFocus step="0.01" placeholder="0.00"
                onChange={(e) => setTempValue(parseFloat(e.target.value) || 0)}
                onKeyDown={handleFieldKeyDown}
                style={{ width: '90px', padding: '6px 8px', fontSize: '14px', border: '2px solid var(--golden-main)', borderRadius: '4px', textAlign: 'right', fontWeight: 600 }}
              />
              <EditSaveCancel onSave={saveFieldEdit} onCancel={cancelEditing} />
            </div>
          ) : (
            <span onClick={() => startEditing(index, 'totalPrice', item.totalPrice)} style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--ivory-darker)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >{item.totalPrice != null ? `$${item.totalPrice.toFixed(2)}` : '-'}</span>
          )}
        </td>
      </tr>
    );
  }

  // Mobile card
  const fieldInputStyle = { width: '100%', padding: '8px', fontSize: '14px', border: '2px solid var(--golden-main)', borderRadius: '4px' };
  const fieldLabelStyle = { display: 'block', fontSize: '12px', fontWeight: 600 as const, color: 'var(--black-secondary)', marginBottom: '4px' };

  return (
    <div style={{ padding: '16px', borderBottom }}>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' as const, color: 'var(--black-tertiary)', marginBottom: '6px' }}>
          Item Name
        </label>
        <EditableItemName value={item.name} onChange={(n) => handleItemNameChange(index, n)} suggestions={existingItemNames} />
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label style={fieldLabelStyle}>Quantity</label>
        {isEditing(index, 'quantity') ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input type="number" value={tempValue} autoFocus step="0.01" onChange={(e) => setTempValue(parseFloat(e.target.value) || 0)} onKeyDown={handleFieldKeyDown} style={{ flex: 1, padding: '8px', fontSize: '14px', border: '2px solid var(--golden-main)', borderRadius: '4px' }} />
            <span style={{ fontSize: '12px' }}>{item.unit || ''}</span>
            <EditSaveCancel onSave={saveFieldEdit} onCancel={cancelEditing} />
          </div>
        ) : (
          <div onClick={() => startEditing(index, 'quantity', item.quantity)} style={{ cursor: 'pointer', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--ivory-bg)' }}>
            {item.quantity || '-'} {item.unit || ''}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label style={fieldLabelStyle}>Unit Price</label>
        {isEditing(index, 'unitPrice') ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input type="number" value={tempValue} autoFocus step="0.01" placeholder="0.00" onChange={(e) => setTempValue(parseFloat(e.target.value) || 0)} onKeyDown={handleFieldKeyDown} style={fieldInputStyle} />
            <EditSaveCancel onSave={saveFieldEdit} onCancel={cancelEditing} />
          </div>
        ) : (
          <div onClick={() => startEditing(index, 'unitPrice', item.unitPrice)} style={{ cursor: 'pointer', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--ivory-bg)' }}>
            {item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '-'}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '8px' }}>
        <label style={fieldLabelStyle}>Total Price</label>
        {isEditing(index, 'totalPrice') ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input type="number" value={tempValue} autoFocus step="0.01" placeholder="0.00" onChange={(e) => setTempValue(parseFloat(e.target.value) || 0)} onKeyDown={handleFieldKeyDown} style={{ ...fieldInputStyle, fontWeight: 600 }} />
            <EditSaveCancel onSave={saveFieldEdit} onCancel={cancelEditing} />
          </div>
        ) : (
          <div onClick={() => startEditing(index, 'totalPrice', item.totalPrice)} style={{ cursor: 'pointer', padding: '8px', borderRadius: '4px', backgroundColor: 'var(--ivory-bg)', fontWeight: 600 }}>
            {item.totalPrice != null ? `$${item.totalPrice.toFixed(2)}` : '-'}
          </div>
        )}
      </div>
    </div>
  );
}
