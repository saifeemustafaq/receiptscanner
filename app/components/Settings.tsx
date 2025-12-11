'use client';

import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import Input from './Input';

interface SettingsProps {
  stores: string[];
  onAddStore: (store: string) => void;
  onDeleteStore: (store: string) => void;
  onClearAllData: () => void;
}

export default function Settings({ stores, onAddStore, onDeleteStore, onClearAllData }: SettingsProps) {
  const [newStore, setNewStore] = useState('');
  const [error, setError] = useState('');

  const handleAddStore = () => {
    if (!newStore.trim()) {
      setError('Store name cannot be empty');
      return;
    }
    
    if (stores.includes(newStore.trim())) {
      setError('This store already exists');
      return;
    }

    onAddStore(newStore.trim());
    setNewStore('');
    setError('');
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear ALL data? This will delete all receipts and cannot be undone.')) {
      if (confirm('This action is permanent. Are you absolutely sure?')) {
        onClearAllData();
      }
    }
  };

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">
          Manage your stores and application data
        </p>
      </header>

      <div className="content-section">
        {/* Store Management */}
        <Card>
          <h2 className="card-title">Manage Stores</h2>
          
          <div className="flex flex-col gap-base">
            <p style={{ color: 'var(--black-secondary)', fontSize: '14px' }}>
              Add or remove stores from your dropdown list
            </p>

            {/* Add New Store */}
            <div className="flex gap-md items-end">
              <div style={{ flex: 1 }}>
                <Input
                  label="Add New Store"
                  value={newStore}
                  onChange={(e) => {
                    setNewStore(e.target.value);
                    setError('');
                  }}
                  placeholder="Store name"
                  error={error}
                />
              </div>
              <Button variant="success" onClick={handleAddStore}>
                Add Store
              </Button>
            </div>

            {/* Store List */}
            <div style={{
              borderTop: '1px solid var(--ivory-border)',
              paddingTop: '16px',
              marginTop: '8px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                Current Stores ({stores.length})
              </h3>
              <div className="flex flex-col gap-sm">
                {stores.map(store => (
                  <div 
                    key={store}
                    className="flex items-center justify-between"
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--ivory-bg)',
                      border: '1px solid var(--ivory-border)',
                      borderRadius: '4px'
                    }}
                  >
                    <span>{store}</span>
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        if (confirm(`Delete "${store}" from your store list?`)) {
                          onDeleteStore(store);
                        }
                      }}
                      style={{ padding: '6px 12px', fontSize: '14px' }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Data Management */}
        <Card>
          <h2 className="card-title">Data Management</h2>
          
          <div className="flex flex-col gap-base">
            <p style={{ color: 'var(--black-secondary)', fontSize: '14px' }}>
              All data is stored locally in your browser's localStorage
            </p>

            <div style={{
              padding: '16px',
              backgroundColor: '#fff3cd',
              border: '2px solid #ffc107',
              borderRadius: '4px'
            }}>
              <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                ⚠️ Warning: Dangerous Action
              </p>
              <p style={{ fontSize: '14px', color: 'var(--black-secondary)' }}>
                Clearing all data will permanently delete all receipts and settings. This cannot be undone.
              </p>
            </div>

            <Button variant="danger" onClick={handleClearAll}>
              <Trash2 size={20} />
              Clear All Data
            </Button>
          </div>
        </Card>

        {/* About */}
        <Card>
          <h2 className="card-title">About</h2>
          <div className="flex flex-col gap-sm" style={{ fontSize: '14px' }}>
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Storage:</strong> Browser localStorage</p>
            <p><strong>AI Model:</strong> Google Gemini 1.5 Flash</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

