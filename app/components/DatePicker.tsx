'use client';

import React from 'react';
import Input from './Input';
import Card from './Card';

interface DatePickerProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export default function DatePicker({ selectedDate, onDateChange }: DatePickerProps) {
  return (
    <Card>
      <h2 className="card-title">Billing Date</h2>
      <Input
        type="date"
        label="Date on Receipt"
        value={selectedDate}
        onChange={(e) => onDateChange(e.target.value)}
        max={new Date().toISOString().split('T')[0]}
        placeholder="Select date from receipt"
      />
      <p style={{ fontSize: '12px', color: 'var(--black-tertiary)', marginTop: '8px' }}>
        This date is auto-detected from the receipt. Upload date is recorded automatically.
      </p>
    </Card>
  );
}
