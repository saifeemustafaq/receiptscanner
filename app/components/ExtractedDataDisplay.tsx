'use client';

import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import ExtractedDataItemRow from './ExtractedDataItemRow';
import { ReceiptItem, ExtractedData } from '@/lib/types';
import { useEditableItems } from '@/lib/hooks/useEditableItems';

interface ExtractedDataDisplayProps {
  data: ExtractedData | null;
  isProcessing: boolean;
  error: string | null;
  existingItemNames?: string[];
  units?: string[];
  onItemChange?: (index: number, updatedItem: ReceiptItem) => void;
}

export default function ExtractedDataDisplay({
  data,
  isProcessing,
  error,
  existingItemNames = [],
  units = [],
  onItemChange,
}: ExtractedDataDisplayProps) {
  const {
    editedItems,
    tempValue,
    setTempValue,
    syncItems,
    startEditing,
    cancelEditing,
    saveFieldEdit,
    handleFieldKeyDown,
    handleItemNameChange,
    isEditing,
  } = useEditableItems(data?.items ?? [], {
    onItemsChange: (items, index) => onItemChange?.(index, items[index]),
  });

  useEffect(() => {
    if (data?.items) syncItems(data.items);
  }, [data, syncItems]);

  const rowProps = {
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
  };

  return (
    <div>
      <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: 'var(--black-text)' }}>
        Extracted Items
      </h3>

      {isProcessing && (
        <div className="flex items-center justify-center gap-md" style={{ padding: '32px 0' }}>
          <Loader size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--golden-main)' }} />
          <p style={{ color: 'var(--black-secondary)' }}>Processing receipt...</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-md" style={{ padding: '16px', backgroundColor: 'var(--error-bg-light)', border: '2px solid var(--error-bg)', borderRadius: '4px' }}>
          <AlertCircle size={24} style={{ color: 'var(--error-text)', flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 600, color: 'var(--error-text)' }}>Error</p>
            <p style={{ fontSize: '14px', color: 'var(--error-text)' }}>{error}</p>
          </div>
        </div>
      )}

      {data && !isProcessing && !error && (
        <div className="flex flex-col gap-base">
          <div className="flex items-center gap-sm" style={{ color: 'var(--green-main)' }}>
            <CheckCircle size={20} />
            <span style={{ fontWeight: 600 }}>Receipt processed successfully!</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <div style={{ backgroundColor: 'var(--ivory-bg)', border: '2px solid var(--black-text)', borderRadius: '4px', boxShadow: 'var(--shadow-retro)' }}>

              {/* Desktop Table */}
              <table className="hidden-mobile" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--ivory-darker)', borderBottom: '2px solid var(--black-text)' }}>
                    {['Item Name', 'Quantity', 'Unit Price', 'Total'].map((h, i) => (
                      <th key={h} style={{ padding: '16px', textAlign: i === 0 ? 'left' : 'right', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {editedItems.map((item, index) => (
                    <ExtractedDataItemRow
                      key={`${item.name}-${index}`}
                      item={item}
                      index={index}
                      isLast={index === editedItems.length - 1}
                      mode="desktop"
                      {...rowProps}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: 'var(--green-pale)', borderTop: '2px solid var(--black-text)' }}>
                    <td colSpan={3} style={{ padding: '16px', textAlign: 'right', fontWeight: 700, fontSize: '16px' }}>TOTAL:</td>
                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, fontSize: '16px' }}>
                      {data.total != null ? `$${data.total.toFixed(2)}` : '$0.00'}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Mobile Card View */}
              <div className="hidden-desktop">
                {editedItems.map((item, index) => (
                  <ExtractedDataItemRow
                    key={`${item.name}-${index}`}
                    item={item}
                    index={index}
                    isLast={index === editedItems.length - 1}
                    mode="mobile"
                    {...rowProps}
                  />
                ))}
                <div style={{ padding: '16px', backgroundColor: 'var(--green-pale)', borderTop: '2px solid var(--black-text)' }}>
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
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--black-tertiary)' }}>
          <p>Upload a receipt to see extracted data here</p>
        </div>
      )}
    </div>
  );
}
