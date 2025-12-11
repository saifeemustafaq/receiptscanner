'use client';

import React from 'react';
import { ArrowLeft, Calendar, Store, DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { ProcessedItem } from '@/lib/itemsProcessor';

interface ItemDetailProps {
  item: ProcessedItem;
  onBack: () => void;
}

export default function ItemDetail({ item, onBack }: ItemDetailProps) {
  const formatPrice = (price: number, unit: string | null) => {
    const priceStr = `$${price.toFixed(2)}`;
    return unit ? `${priceStr}/${unit}` : priceStr;
  };

  const getPriceChange = (currentPrice: number, previousPrice: number) => {
    const diff = currentPrice - previousPrice;
    const percentChange = ((diff / previousPrice) * 100).toFixed(1);
    return { diff, percentChange };
  };

  const getPriceTrend = (diff: number) => {
    if (Math.abs(diff) < 0.01) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  return (
    <div>
      <header className="page-header">
        <Button variant="secondary" onClick={onBack} style={{ marginBottom: '16px' }}>
          <ArrowLeft size={20} />
          Back to Items
        </Button>
        <h1 className="page-title">{item.name}</h1>
        <p className="page-subtitle">
          Price history across {item.priceHistory.length} purchase{item.priceHistory.length !== 1 ? 's' : ''}
        </p>
      </header>

      <div className="content-section">
        {/* Current Price Card */}
        <Card>
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <p style={{ 
              fontSize: '14px', 
              color: 'var(--black-tertiary)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Latest Price
            </p>
            <p style={{ 
              fontSize: '48px', 
              fontWeight: 700,
              color: 'var(--golden-main)',
              marginBottom: '8px'
            }}>
              {formatPrice(item.latestPrice, item.latestUnit)}
            </p>
            <p style={{ fontSize: '14px', color: 'var(--black-secondary)' }}>
              at {item.latestStore} • {new Date(item.latestDate + 'T00:00:00').toLocaleDateString('en-US', {
                timeZone: 'America/Los_Angeles',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
        </Card>

        {/* Price History Timeline */}
        <Card>
          <h2 className="card-title">Price History</h2>
          
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div style={{
              position: 'absolute',
              left: '20px',
              top: '20px',
              bottom: '20px',
              width: '2px',
              backgroundColor: 'var(--ivory-border)'
            }} />

            {/* Timeline entries */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {item.priceHistory.map((entry, index) => {
                const prevEntry = item.priceHistory[index + 1];
                const trend = prevEntry ? getPriceTrend(entry.price - prevEntry.price) : null;
                const change = prevEntry ? getPriceChange(entry.price, prevEntry.price) : null;

                return (
                  <div 
                    key={`${entry.receiptId}-${index}`}
                    style={{ 
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'flex-start',
                      position: 'relative'
                    }}
                  >
                    {/* Timeline dot */}
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: index === 0 ? 'var(--golden-main)' : 'var(--ivory-bg)',
                      border: '3px solid var(--black-text)',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1
                    }}>
                      {trend === 'up' && <TrendingUp size={16} style={{ color: 'var(--error-text)' }} />}
                      {trend === 'down' && <TrendingDown size={16} style={{ color: 'var(--green-main)' }} />}
                      {trend === 'stable' && <Minus size={16} style={{ color: 'var(--black-tertiary)' }} />}
                      {!trend && <DollarSign size={16} style={{ color: index === 0 ? 'var(--black-text)' : 'var(--black-tertiary)' }} />}
                    </div>

                    {/* Entry content */}
                    <div style={{
                      flex: 1,
                      padding: '16px',
                      backgroundColor: 'var(--ivory-bg)',
                      border: `2px solid ${index === 0 ? 'var(--golden-main)' : 'var(--ivory-border)'}`,
                      borderRadius: '4px'
                    }}>
                      {/* Price */}
                      <div className="flex justify-between items-start" style={{ marginBottom: '12px' }}>
                        <div>
                          <p style={{ 
                            fontSize: '24px', 
                            fontWeight: 700,
                            color: index === 0 ? 'var(--golden-main)' : 'var(--black-text)'
                          }}>
                            {formatPrice(entry.price, entry.unit)}
                          </p>
                          {change && (
                            <p style={{ 
                              fontSize: '14px',
                              color: trend === 'up' ? 'var(--error-text)' : trend === 'down' ? 'var(--green-main)' : 'var(--black-tertiary)',
                              fontWeight: 600,
                              marginTop: '4px'
                            }}>
                              {change.diff > 0 ? '+' : ''}{change.diff.toFixed(2)} ({change.diff > 0 ? '+' : ''}{change.percentChange}%)
                            </p>
                          )}
                        </div>
                        {index === 0 && (
                          <span style={{
                            padding: '4px 12px',
                            backgroundColor: 'var(--golden-light)',
                            color: 'var(--black-text)',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: 600
                          }}>
                            LATEST
                          </span>
                        )}
                      </div>

                      {/* Store & Date */}
                      <div className="flex flex-wrap gap-base" style={{ fontSize: '14px' }}>
                        <div className="flex items-center gap-xs">
                          <Store size={16} style={{ color: 'var(--black-tertiary)' }} />
                          <span style={{ fontWeight: 500 }}>{entry.store}</span>
                        </div>
                        <div className="flex items-center gap-xs">
                          <Calendar size={16} style={{ color: 'var(--black-tertiary)' }} />
                          <span style={{ color: 'var(--black-secondary)' }}>
                            {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
                              timeZone: 'America/Los_Angeles',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
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

        {/* Stats Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          <Card>
            <p style={{ fontSize: '12px', color: 'var(--black-tertiary)', marginBottom: '8px' }}>
              Lowest Price
            </p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--green-main)' }}>
              {formatPrice(Math.min(...item.priceHistory.map(e => e.price)), item.latestUnit)}
            </p>
          </Card>

          <Card>
            <p style={{ fontSize: '12px', color: 'var(--black-tertiary)', marginBottom: '8px' }}>
              Highest Price
            </p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--error-text)' }}>
              {formatPrice(Math.max(...item.priceHistory.map(e => e.price)), item.latestUnit)}
            </p>
          </Card>

          <Card>
            <p style={{ fontSize: '12px', color: 'var(--black-tertiary)', marginBottom: '8px' }}>
              Stores
            </p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--black-text)' }}>
              {new Set(item.priceHistory.map(e => e.store)).size}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

