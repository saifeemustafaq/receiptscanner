'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';
import Card from './Card';
import { PriceStatistics } from '@/lib/analyticsUtils';

interface InsightsStatsCardsProps {
  stats: PriceStatistics;
}

export default function InsightsStatsCards({ stats }: InsightsStatsCardsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ padding: '8px', backgroundColor: 'var(--green-pale)', borderRadius: '4px' }}>
            <TrendingDown size={20} style={{ color: 'var(--green-main)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '11px', color: 'var(--black-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cheapest
            </p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--green-main)', marginBottom: '2px' }}>
              ${stats.cheapestPrice.toFixed(2)}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--black-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {stats.cheapestStore}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ padding: '8px', backgroundColor: 'var(--error-bg)', borderRadius: '4px' }}>
            <TrendingUp size={20} style={{ color: 'var(--error-text)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '11px', color: 'var(--black-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Highest
            </p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--error-text)', marginBottom: '2px' }}>
              ${stats.mostExpensivePrice.toFixed(2)}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--black-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {stats.mostExpensiveStore}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ padding: '8px', backgroundColor: 'var(--golden-light)', borderRadius: '4px' }}>
            <DollarSign size={20} style={{ color: 'var(--golden-main)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '11px', color: 'var(--black-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Average
            </p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--golden-main)', marginBottom: '2px' }}>
              ${stats.averagePrice.toFixed(2)}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--black-secondary)' }}>
              {stats.totalPurchases} purchase{stats.totalPurchases !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{
            padding: '8px',
            backgroundColor: stats.trend === 'up' ? 'var(--error-bg)' : stats.trend === 'down' ? 'var(--green-pale)' : 'var(--ivory-darker)',
            borderRadius: '4px'
          }}>
            {stats.trend === 'up' && <TrendingUp size={20} style={{ color: 'var(--error-text)' }} />}
            {stats.trend === 'down' && <TrendingDown size={20} style={{ color: 'var(--green-main)' }} />}
            {stats.trend === 'stable' && <Minus size={20} style={{ color: 'var(--black-tertiary)' }} />}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '11px', color: 'var(--black-tertiary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Price Trend
            </p>
            <p style={{ fontSize: '20px', fontWeight: 700, color: stats.trend === 'up' ? 'var(--error-text)' : stats.trend === 'down' ? 'var(--green-main)' : 'var(--black-text)', marginBottom: '2px' }}>
              {stats.priceChange > 0 ? '+' : ''}{stats.priceChange.toFixed(1)}%
            </p>
            <p style={{ fontSize: '12px', color: 'var(--black-secondary)' }}>
              {stats.trend === 'up' ? 'Increasing' : stats.trend === 'down' ? 'Decreasing' : 'Stable'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
