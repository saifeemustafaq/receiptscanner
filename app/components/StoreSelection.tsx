'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import Button from './Button';
import Select from './Select';
import Input from './Input';
import Card from './Card';

interface StoreSelectionProps {
  selectedStore: string;
  onStoreChange: (store: string) => void;
  stores: string[];
  onAddStore: (newStore: string) => void;
}

export default function StoreSelection({ 
  selectedStore, 
  onStoreChange, 
  stores,
  onAddStore 
}: StoreSelectionProps) {
  const [showAddNew, setShowAddNew] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [error, setError] = useState('');

  const handleAddStore = () => {
    if (!newStoreName.trim()) {
      setError('Store name cannot be empty');
      return;
    }
    
    if (stores.includes(newStoreName.trim())) {
      setError('This store already exists');
      return;
    }

    onAddStore(newStoreName.trim());
    setNewStoreName('');
    setShowAddNew(false);
    setError('');
    onStoreChange(newStoreName.trim());
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

  return (
    <Card>
      <h2 className="card-title">Store Information</h2>
      
      {!showAddNew ? (
        <Select
          label="Store Name"
          options={storeOptions}
          value={selectedStore}
          onChange={handleSelectChange}
        />
      ) : (
        <div className="flex flex-col gap-base">
          <div className="flex items-center justify-between">
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Add New Store</h3>
            <button
              onClick={handleCancel}
              style={{
                color: 'var(--black-tertiary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px'
              }}
              aria-label="Cancel"
            >
              <X size={20} />
            </button>
          </div>
          
          <Input
            label="Store Name"
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
              Add Store
            </Button>
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
