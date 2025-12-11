'use client';

import React from 'react';
import Input from './Input';

interface DatePickerProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export default function DatePicker({ selectedDate, onDateChange }: DatePickerProps) {
  return (
    <div>
      <Input
        type="date"
        label=""
        value={selectedDate}
        onChange={(e) => onDateChange(e.target.value)}
        max={new Date().toISOString().split('T')[0]}
        placeholder="Select date from receipt"
      />
      <p style={{ fontSize: '11px', color: 'var(--black-tertiary)', marginTop: '4px' }}>
        Auto-detected from receipt
      </p>
    </div>
  );
}
