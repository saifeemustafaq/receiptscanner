'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from './Card';
import { getStoreColor } from '@/lib/analyticsUtils';

interface InsightsPriceChartProps {
  chartData: Record<string, string | number | Date>[];
  chartStores: string[];
}

export default function InsightsPriceChart({ chartData, chartStores }: InsightsPriceChartProps) {
  return (
    <Card>
      <h2 className="card-title" style={{ marginBottom: '24px' }}>Price History</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--ivory-border)" />
          <XAxis
            dataKey="date"
            stroke="var(--black-tertiary)"
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="var(--black-tertiary)"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--ivory-bg)',
              border: '2px solid var(--black-text)',
              borderRadius: '4px',
              fontSize: '14px',
            }}
            formatter={(value: number, name: string) => [`$${Number(value).toFixed(2)}`, name]}
            labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
          />
          <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '20px' }} iconType="line" />
          {chartStores.map((store, index) => (
            <Line
              key={store}
              type="monotone"
              dataKey={store}
              stroke={getStoreColor(store, index)}
              strokeWidth={3}
              dot={{ fill: getStoreColor(store, index), strokeWidth: 2, r: 5 }}
              activeDot={{ r: 7 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
