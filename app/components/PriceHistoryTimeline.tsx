'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign, Store, Calendar } from 'lucide-react';
import Card from './Card';
import { ItemPriceEntry } from '@/lib/itemsProcessor';
import { formatPrice, formatReceiptDate } from '@/lib/formatting';
import { PRICE_TOLERANCE } from '@/lib/constants';

interface PriceHistoryTimelineProps {
  priceHistory: ItemPriceEntry[];
  latestUnit: string | null;
  onReceiptSelect: (receiptId: string) => void;
}

function getPriceChange(current: number, previous: number) {
  const diff = current - previous;
  const percentChange = ((diff / previous) * 100).toFixed(1);
  return { diff, percentChange };
}

function getPriceTrend(diff: number): 'up' | 'down' | 'stable' {
  if (Math.abs(diff) < PRICE_TOLERANCE) return 'stable';
  return diff > 0 ? 'up' : 'down';
}

export default function PriceHistoryTimeline({ priceHistory, latestUnit, onReceiptSelect }: PriceHistoryTimelineProps) {
  if (priceHistory.length === 0) {
    return (
      <Card>
        <h2 className="card-title">Price History</h2>
        <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--black-tertiary)' }}>
          <DollarSign size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p>No price history recorded yet</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="card-title">Price History</h2>

      <div style={{ position: 'relative' }}>
        {/* Timeline line */}
        <div style={{ position: 'absolute', left: '20px', top: '20px', bottom: '20px', width: '2px', backgroundColor: 'var(--ivory-border)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {priceHistory.map((entry, index) => {
            const prevEntry = priceHistory[index + 1];
            const trend = prevEntry ? getPriceTrend(entry.price - prevEntry.price) : null;
            const change = prevEntry ? getPriceChange(entry.price, prevEntry.price) : null;

            return (
              <div key={entry.receiptId} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative' }}>
                {/* Dot */}
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: index === 0 ? 'var(--golden-main)' : 'var(--ivory-bg)', border: '3px solid var(--black-text)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  {trend === 'up' && <TrendingUp size={16} style={{ color: 'var(--error-text)' }} />}
                  {trend === 'down' && <TrendingDown size={16} style={{ color: 'var(--green-main)' }} />}
                  {trend === 'stable' && <Minus size={16} style={{ color: 'var(--black-tertiary)' }} />}
                  {!trend && <DollarSign size={16} style={{ color: index === 0 ? 'var(--black-text)' : 'var(--black-tertiary)' }} />}
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '16px', backgroundColor: 'var(--ivory-bg)', border: `2px solid ${index === 0 ? 'var(--golden-main)' : 'var(--ivory-border)'}`, borderRadius: '4px' }}>
                  <div className="flex justify-between items-start" style={{ marginBottom: '12px' }}>
                    <div>
                      <p style={{ fontSize: '24px', fontWeight: 700, color: index === 0 ? 'var(--golden-main)' : 'var(--black-text)' }}>
                        {formatPrice(entry.price, entry.unit)}
                      </p>
                      {change && (
                        <p style={{ fontSize: '14px', color: trend === 'up' ? 'var(--error-text)' : trend === 'down' ? 'var(--green-main)' : 'var(--black-tertiary)', fontWeight: 600, marginTop: '4px' }}>
                          {change.diff > 0 ? '+' : ''}{change.diff.toFixed(2)} ({change.diff > 0 ? '+' : ''}{change.percentChange}%)
                        </p>
                      )}
                    </div>
                    {index === 0 && (
                      <span style={{ padding: '4px 12px', backgroundColor: 'var(--golden-light)', color: 'var(--black-text)', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                        LATEST
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-base" style={{ fontSize: '14px' }}>
                    <div className="flex items-center gap-xs">
                      <Store size={16} style={{ color: 'var(--black-tertiary)' }} />
                      <span style={{ fontWeight: 500 }}>{entry.store}</span>
                    </div>
                    <div className="flex items-center gap-xs">
                      <Calendar size={16} style={{ color: 'var(--black-tertiary)' }} />
                      <span
                        onClick={() => onReceiptSelect(entry.receiptId)}
                        style={{ color: 'var(--black-secondary)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--golden-main)', textUnderlineOffset: '2px' }}
                        title="Click to view full receipt"
                      >
                        {formatReceiptDate(entry.date, 'medium')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
