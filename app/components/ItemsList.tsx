'use client';

import React, { useState, useMemo } from 'react';
import { Search, ShoppingBag, ChevronRight } from 'lucide-react';
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

  const getPriceRange = (item: ProcessedItem) => {
    const prices = item.priceHistory.map(entry => entry.price);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const isSamePrice = maxPrice === minPrice;
    
    return { maxPrice, minPrice, isSamePrice };
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '16px'
          }}>
            {filteredItems.map(item => {
              const { maxPrice, minPrice, isSamePrice } = getPriceRange(item);
              const purchaseCount = item.priceHistory.length;
              
              return (
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
                    {/* Item Name */}
                    <h3 style={{ 
                      fontSize: '20px', 
                      fontWeight: 600,
                      color: 'var(--black-text)',
                      marginBottom: '4px'
                    }}>
                      {item.name}
                    </h3>

                    {/* Purchase Count */}
                    <p style={{ 
                      fontSize: '14px',
                      color: 'var(--black-tertiary)',
                      marginBottom: '12px'
                    }}>
                      Purchased {purchaseCount} {purchaseCount === 1 ? 'time' : 'times'}
                    </p>

                    {/* Price Range */}
                    <div style={{ 
                      padding: '16px',
                      backgroundColor: 'var(--ivory-bg)',
                      borderRadius: '4px',
                      border: '2px solid var(--black-text)',
                      marginBottom: '12px'
                    }}>
                      {isSamePrice ? (
                        <div>
                          <p style={{ 
                            fontSize: '12px',
                            color: 'var(--black-tertiary)',
                            marginBottom: '6px'
                          }}>
                            Price
                          </p>
                          <p style={{ 
                            fontSize: '28px', 
                            fontWeight: 700,
                            color: '#2B5F8F',
                          }}>
                            {formatPrice(maxPrice, item.latestUnit)}
                          </p>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center" style={{ gap: '16px' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ 
                              fontSize: '11px',
                              color: 'var(--black-tertiary)',
                              marginBottom: '4px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>
                              Min
                            </p>
                            <p style={{ 
                              fontSize: '20px', 
                              fontWeight: 700,
                              color: '#2D5016',
                            }}>
                              {formatPrice(minPrice, item.latestUnit)}
                            </p>
                          </div>
                          <div style={{ 
                            width: '2px', 
                            height: '40px', 
                            backgroundColor: 'var(--ivory-border)' 
                          }} />
                          <div style={{ flex: 1, textAlign: 'right' }}>
                            <p style={{ 
                              fontSize: '11px',
                              color: 'var(--black-tertiary)',
                              marginBottom: '4px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}>
                              Max
                            </p>
                            <p style={{ 
                              fontSize: '20px', 
                              fontWeight: 700,
                              color: '#8B3A3A',
                            }}>
                              {formatPrice(maxPrice, item.latestUnit)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Store & Date Info */}
                    <div className="flex justify-between items-center" style={{ 
                      fontSize: '13px',
                      color: 'var(--black-secondary)',
                      marginBottom: '12px'
                    }}>
                      <span>
                        <strong>{item.latestStore}</strong>
                      </span>
                      <span>
                        {new Date(item.latestDate + 'T00:00:00').toLocaleDateString('en-US', {
                          timeZone: 'America/Los_Angeles',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* More Info Button */}
                    <div style={{
                      padding: '12px 16px',
                      backgroundColor: 'transparent',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '2px solid var(--black-text)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--golden-main)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}>
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: 600,
                        color: 'var(--black-text)'
                      }}>
                        More Info
                      </span>
                      <ChevronRight size={18} style={{ color: 'var(--black-text)' }} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

