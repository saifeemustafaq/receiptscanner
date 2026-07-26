'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Check } from 'lucide-react';
import Button from './Button';
import Select from './Select';
import Input from './Input';
import type { MutationResult } from '@/lib/types';

interface StoreSelectionProps {
  selectedStore: string;
  onStoreChange: (store: string) => void;
  stores: string[];
  onAddStore: (newStore: string) => Promise<MutationResult>;
  detectedStore?: string; // store name the AI read off the receipt (storeNameScanned)
}

export default function StoreSelection({
  selectedStore,
  onStoreChange,
  stores,
  onAddStore,
  detectedStore = '',
}: StoreSelectionProps) {
  const [showAddNew, setShowAddNew] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [error, setError] = useState('');
  const [quickError, setQuickError] = useState('');
  const [quickBusy, setQuickBusy] = useState(false);

  const handleAddStore = async () => {
    const trimmed = newStoreName.trim();
    if (!trimmed) {
      setError('Store name cannot be empty');
      return;
    }

    const result = await onAddStore(trimmed);
    if (!result.success) {
      setError(result.error || 'Failed to add store');
      return;
    }

    setNewStoreName('');
    setShowAddNew(false);
    setError('');
    onStoreChange(trimmed);
  };

  const handleCancel = () => {
    setShowAddNew(false);
    setNewStoreName('');
    setError('');
  };

  const storeOptions = [
    { value: '', label: 'Select a store...' },
    ...stores.map(store => ({ value: store, label: store })),
    { value: '__add_new__', label: '+ Add New Store' }
  ];

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '__add_new__') {
      setShowAddNew(true);
    } else {
      onStoreChange(value);
    }
  };

  // One-click handling of the AI-detected store: if it already exists just
  // select it; if it's new, create it and select it — no trip through the
  // manual "Add New Store" form.
  const trimmedDetected = detectedStore.trim();
  const existingMatch = trimmedDetected
    ? stores.find(s => s.toLowerCase() === trimmedDetected.toLowerCase())
    : undefined;
  const detectedIsNew = !!trimmedDetected && !existingMatch;
  const detectedSelected =
    !!trimmedDetected && selectedStore.toLowerCase() === trimmedDetected.toLowerCase();

  // When the detected store already exists, pre-populate it automatically (no
  // extra click). Only do this while nothing is chosen yet, so a manual pick is
  // never overridden. New (unknown) stores still need explicit confirmation.
  useEffect(() => {
    if (existingMatch && !selectedStore) {
      onStoreChange(existingMatch);
    }
  }, [existingMatch, selectedStore, onStoreChange]);

  // Show the quick action only for a NEW detected store (existing ones are
  // auto-selected above, so no button is needed for them).
  const showDetectedAction = !showAddNew && detectedIsNew && !detectedSelected;

  const handleUseDetected = async () => {
    setQuickError('');
    if (existingMatch) {
      onStoreChange(existingMatch);
      return;
    }
    setQuickBusy(true);
    const result = await onAddStore(trimmedDetected);
    setQuickBusy(false);
    if (result.success) {
      onStoreChange(trimmedDetected);
    } else {
      setQuickError(result.error || 'Failed to add store');
    }
  };

  return (
    <div>
      {!showAddNew ? (
        <Select
          label=""
          options={storeOptions}
          value={selectedStore}
          onChange={handleSelectChange}
        />
      ) : (
        <div className="flex flex-col gap-base">
          <Input
            label=""
            value={newStoreName}
            onChange={(e) => {
              setNewStoreName(e.target.value);
              setError('');
            }}
            placeholder="Enter store name"
            error={error}
          />

          <div className="flex gap-md">
            <Button variant="success" onClick={handleAddStore}>
              <Plus size={20} />
              Add
            </Button>
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {showDetectedAction && (
        <div style={{ marginTop: '8px' }}>
          <Button
            variant="secondary"
            onClick={handleUseDetected}
            disabled={quickBusy}
            style={{ padding: '8px 14px', fontSize: '14px' }}
          >
            {detectedIsNew ? <Plus size={16} /> : <Check size={16} />}
            {detectedIsNew
              ? `Add & use "${trimmedDetected}"`
              : `Use detected store "${trimmedDetected}"`}
          </Button>
          {quickError && (
            <p style={{ fontSize: '13px', color: 'var(--error-text)', marginTop: '6px' }}>
              {quickError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
