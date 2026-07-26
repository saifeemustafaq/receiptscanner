'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import Input from './Input';
import { PROVIDER_OPTIONS, type AIProvider } from '@/lib/hooks/useSettings';
import type { MutationResult } from '@/lib/types';

interface SettingsProps {
  stores: string[];
  onAddStore: (store: string) => Promise<MutationResult>;
  onDeleteStore: (store: string) => Promise<MutationResult>;
  units: string[];
  onAddUnit: (unit: string) => Promise<MutationResult>;
  onDeleteUnit: (unit: string) => Promise<MutationResult>;
  onClearAllData: () => void;
  aiProvider: AIProvider;
  onChangeProvider: (provider: AIProvider) => void;
}

export default function Settings({ stores, onAddStore, onDeleteStore, units, onAddUnit, onDeleteUnit, onClearAllData, aiProvider, onChangeProvider }: SettingsProps) {
  const activeProvider = PROVIDER_OPTIONS.find(p => p.id === aiProvider);
  const [newStore, setNewStore] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [error, setError] = useState('');
  const [unitError, setUnitError] = useState('');

  const handleAddStore = async () => {
    if (!newStore.trim()) {
      setError('Store name cannot be empty');
      return;
    }
    
    if (stores.includes(newStore.trim())) {
      setError('This store already exists');
      return;
    }

    const result = await onAddStore(newStore.trim());
    if (!result.success) {
      setError(result.error || 'Failed to add store');
      return;
    }
    setNewStore('');
    setError('');
  };

  const handleAddUnit = async () => {
    if (!newUnit.trim()) {
      setUnitError('Unit cannot be empty');
      return;
    }
    
    const trimmed = newUnit.trim().toLowerCase();
    if (units.includes(trimmed)) {
      setUnitError('This unit already exists');
      return;
    }

    const result = await onAddUnit(trimmed);
    if (!result.success) {
      setUnitError(result.error || 'Failed to add unit');
      return;
    }
    setNewUnit('');
    setUnitError('');
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
        {/* AI Provider */}
        <Card>
          <h2 className="card-title">AI Provider</h2>

          <div className="flex flex-col gap-base">
            <p style={{ color: 'var(--black-secondary)', fontSize: '14px' }}>
              Choose which AI model is used to scan and extract receipt data. Only one provider is active at a time.
            </p>

            <div className="flex flex-col gap-sm">
              {PROVIDER_OPTIONS.map(option => {
                const isSelected = aiProvider === option.id;
                return (
                  <label
                    key={option.id}
                    htmlFor={`provider-${option.id}`}
                    className="flex items-center gap-md"
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--ivory-bg)',
                      border: `2px solid ${isSelected ? 'var(--black-text)' : 'var(--ivory-border)'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      id={`provider-${option.id}`}
                      name="ai-provider"
                      value={option.id}
                      checked={isSelected}
                      onChange={() => onChangeProvider(option.id)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div className="flex flex-col" style={{ gap: '2px' }}>
                      <span style={{ fontWeight: 600, fontSize: '15px' }}>{option.label}</span>
                      <span style={{ fontSize: '13px', color: 'var(--black-secondary)' }}>
                        Model: {option.model}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--black-secondary)' }}>
                        {option.description}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </Card>

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
                      onClick={async () => {
                        if (confirm(`Delete "${store}" from your store list?`)) {
                          const result = await onDeleteStore(store);
                          if (!result.success) {
                            alert('Failed to delete store: ' + (result.error || 'Unknown error'));
                          }
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

        {/* Unit Management */}
        <Card>
          <h2 className="card-title">Manage Units</h2>
          
          <div className="flex flex-col gap-base">
            <p style={{ color: 'var(--black-secondary)', fontSize: '14px' }}>
              Units are automatically discovered from your receipts. You can also manually add or remove units.
            </p>

            {/* Add New Unit */}
            <div className="flex gap-md items-end">
              <div style={{ flex: 1 }}>
                <Input
                  label="Add New Unit"
                  value={newUnit}
                  onChange={(e) => {
                    setNewUnit(e.target.value);
                    setUnitError('');
                  }}
                  placeholder="e.g., oz, lb, g, ml"
                  error={unitError}
                />
              </div>
              <Button variant="success" onClick={handleAddUnit}>
                Add Unit
              </Button>
            </div>

            {/* Unit List */}
            <div style={{
              borderTop: '1px solid var(--ivory-border)',
              paddingTop: '16px',
              marginTop: '8px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                Available Units ({units.length})
              </h3>
              <div className="flex flex-wrap gap-sm">
                {units.map(unit => (
                  <div 
                    key={unit}
                    className="flex items-center gap-sm"
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'var(--ivory-bg)',
                      border: '1px solid var(--ivory-border)',
                      borderRadius: '4px'
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{unit}</span>
                    <button
                      className="btn btn-danger"
                      onClick={async () => {
                        if (confirm(`Delete unit "${unit}"? This will not affect existing receipts.`)) {
                          const result = await onDeleteUnit(unit);
                          if (!result.success) {
                            alert('Failed to delete unit: ' + (result.error || 'Unknown error'));
                          }
                        }
                      }}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      title={`Delete ${unit}`}
                    >
                      <Trash2 size={12} />
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
              All data is stored server-side in JSON files within the app&rsquo;s data directory
            </p>

            <div style={{
              padding: '16px',
              backgroundColor: 'var(--warning-bg)',
              border: '2px solid var(--warning-border)',
              borderRadius: '4px'
            }}>
              <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} />
                Warning: Dangerous Action
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
            <p><strong>Storage:</strong> Server-side JSON files</p>
            <p><strong>AI Provider:</strong> {activeProvider?.label ?? aiProvider}</p>
            <p><strong>AI Model:</strong> {activeProvider?.model ?? '—'}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

