'use client';

import React, { useState, useMemo } from 'react';
import { Search, TrendingUp, ShoppingBag, ChevronRight, Eye } from 'lucide-react';
import Card from './Card';
import { ProcessedItem } from '@/lib/itemsProcessor';

interface ItemsListProps {
  items: ProcessedItem[];
  onItemClick: (itemName: string) => void;
}

export default function ItemsList({ items, onItemClick }: ItemsListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const search = searchTerm.toLowerCase();
    return items.filter(item => 
      item.normalizedName.includes(search)
    );
  }, [items, searchTerm]);

  const formatPrice = (price: number, unit: string | null) => {
    const priceStr = `$${price.toFixed(2)}`;
    return unit ? `${priceStr}/${unit}` : priceStr;
  };

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Items</h1>
        <p className="page-subtitle">
          Track price variations across your purchases
        </p>
      </header>

      <div className="content-section">
        {/* Search Bar */}
        <Card>
          <div className="flex items-center gap-md">
            <Search size={20} style={{ color: 'var(--black-tertiary)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ flex: 1, marginBottom: 0 }}
            />
          </div>
        </Card>

        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--black-tertiary)' }}>
              <ShoppingBag size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p style={{ fontSize: '18px', marginBottom: '8px' }}>
                {searchTerm ? 'No items match your search' : 'No items found'}
              </p>
              <p style={{ fontSize: '14px' }}>
                {searchTerm ? 'Try a different search term' : 'Scan receipts to start tracking items'}
              </p>
            </div>
          </Card>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {filteredItems.map(item => (
              <Card 
                key={item.normalizedName}
                className="item-card"
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-retro-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-retro)';
                }}
                onClick={() => onItemClick(item.normalizedName)}
              >
                <div className="flex flex-col gap-sm">
                  {/* Item Name with arrow */}
                  <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: 600,
                      color: 'var(--black-text)',
                      flex: 1
                    }}>
                      {item.name}
                    </h3>
                    <ChevronRight size={20} style={{ color: 'var(--golden-main)' }} />
                  </div>

                  {/* Latest Price */}
                  <div style={{ 
                    padding: '12px',
                    backgroundColor: 'var(--ivory-bg)',
                    borderRadius: '4px',
                    border: '1px solid var(--ivory-border)'
                  }}>
                    <p style={{ 
                      fontSize: '24px', 
                      fontWeight: 700,
                      color: 'var(--golden-main)',
                      marginBottom: '4px'
                    }}>
                      {formatPrice(item.latestPrice, item.latestUnit)}
                    </p>
                    <p style={{ 
                      fontSize: '12px',
                      color: 'var(--black-tertiary)'
                    }}>
                      Latest Price
                    </p>
                  </div>

                  {/* Store & Date */}
                  <div className="flex justify-between items-center" style={{ 
                    paddingTop: '8px',
                    borderTop: '1px solid var(--ivory-border)'
                  }}>
                    <div>
                      <p style={{ fontSize: '12px', color: 'var(--black-tertiary)' }}>
                        Store
                      </p>
                      <p style={{ fontSize: '14px', fontWeight: 500 }}>
                        {item.latestStore}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '12px', color: 'var(--black-tertiary)' }}>
                        Last Updated
                      </p>
                      <p style={{ fontSize: '14px', fontWeight: 500 }}>
                        {new Date(item.latestDate + 'T00:00:00').toLocaleDateString('en-US', {
                          timeZone: 'America/Los_Angeles',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Price History CTA */}
                  <div style={{
                    marginTop: '8px',
                    padding: '10px 12px',
                    backgroundColor: item.priceHistory.length > 1 
                      ? 'var(--golden-main)' 
                      : 'var(--ivory-darker)',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '2px solid var(--black-text)'
                  }}>
                    <div className="flex items-center gap-xs">
                      {item.priceHistory.length > 1 ? (
                        <>
                          <TrendingUp size={16} style={{ color: 'var(--black-text)' }} />
                          <span style={{ 
                            fontSize: '14px', 
                            fontWeight: 600,
                            color: 'var(--black-text)'
                          }}>
                            {item.priceHistory.length} price variations
                          </span>
                        </>
                      ) : (
                        <>
                          <Eye size={16} style={{ color: 'var(--black-tertiary)' }} />
                          <span style={{ 
                            fontSize: '14px', 
                            fontWeight: 500,
                            color: 'var(--black-secondary)'
                          }}>
                            View details
                          </span>
                        </>
                      )}
                    </div>
                    <span style={{ 
                      fontSize: '12px', 
                      color: item.priceHistory.length > 1 ? 'var(--black-text)' : 'var(--black-tertiary)',
                      fontWeight: 600
                    }}>
                      Click to view →
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

