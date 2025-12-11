'use client';

import React from 'react';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import Card from './Card';

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
}

export default function ExtractedDataDisplay({ 
  data, 
  isProcessing, 
  error 
}: ExtractedDataDisplayProps) {
  return (
    <Card>
      <h2 className="card-title">Extracted Receipt Data</h2>
      
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
                  {data.items.map((item, index) => (
                    <tr 
                      key={index}
                      style={{
                        borderBottom: index === data.items.length - 1 ? 'none' : '1px solid var(--ivory-border)',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ivory-card)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '16px', fontWeight: 500 }}>
                        {item.name}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        {item.quantity} {item.unit || ''}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        {item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '-'}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600 }}>
                        ${item.totalPrice.toFixed(2)}
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
                    }}>${data.total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Mobile Card View */}
              <div style={{ display: window.innerWidth < 640 ? 'block' : 'none' }}>
                {data.items.map((item, index) => (
                  <div 
                    key={index}
                    style={{
                      padding: '16px',
                      borderBottom: index === data.items.length - 1 ? 'none' : '1px solid var(--ivory-border)'
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '8px' }}>{item.name}</div>
                    <div className="flex justify-between" style={{ fontSize: '14px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--black-secondary)' }}>Quantity:</span>
                      <span>{item.quantity} {item.unit || ''}</span>
                    </div>
                    <div className="flex justify-between" style={{ fontSize: '14px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--black-secondary)' }}>Unit Price:</span>
                      <span>{item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '-'}</span>
                    </div>
                    <div className="flex justify-between" style={{ fontSize: '14px', fontWeight: 600 }}>
                      <span style={{ color: 'var(--black-secondary)' }}>Total:</span>
                      <span>${item.totalPrice.toFixed(2)}</span>
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
                    <span>${data.total.toFixed(2)}</span>
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
    </Card>
  );
}
