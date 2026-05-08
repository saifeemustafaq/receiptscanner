'use client';

import React, { useState } from 'react';
import { ArrowLeft, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import Card from './Card';
import Button from './Button';
import BottomSheet from './BottomSheet';
import ReceiptDetailView from './ReceiptDetailView';
import PriceHistoryTimeline from './PriceHistoryTimeline';
import { ProcessedItem } from '@/lib/itemsProcessor';
import { SavedReceipt } from '@/lib/types';
import { formatPrice, formatReceiptDate } from '@/lib/formatting';

interface ItemDetailProps {
  item: ProcessedItem;
  receipts: SavedReceipt[];
  stores: string[];
  units: string[];
  onBack: () => void;
  onItemRename?: (oldName: string, newName: string) => Promise<void>;
  onReceiptUpdate?: (id: string, updates: Partial<SavedReceipt>) => Promise<void>;
  onReceiptDelete?: (id: string) => Promise<void>;
  onReceiptsReload?: () => Promise<void>;
  receiptsLoading?: boolean;
}

export default function ItemDetail({
  item,
  receipts,
  stores,
  units,
  onBack,
  onItemRename,
  onReceiptUpdate,
  onReceiptDelete,
  onReceiptsReload,
  receiptsLoading = false,
}: ItemDetailProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(item.name);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  const handleSaveName = async () => {
    const trimmedName = editedName.trim();
    if (!trimmedName) {
      toast.error('Item name cannot be empty');
      return;
    }
    if (trimmedName === item.name) {
      setIsEditingName(false);
      return;
    }
    if (onItemRename) {
      setIsSaving(true);
      try {
        await onItemRename(item.name, trimmedName);
        setIsEditingName(false);
      } catch (error) {
        console.error('Error renaming item:', error);
        toast.error('Failed to rename item');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditedName(item.name);
    setIsEditingName(false);
  };

  const selectedReceipt = receipts.find(r => r.id === selectedReceiptId);

  return (
    <div style={{ paddingTop: '80px' }}>
      {/* Fixed back bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 24px', backgroundColor: 'var(--ivory-bg)', borderBottom: '2px solid var(--black-text)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', zIndex: 100 }}>
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft size={20} />
          Back to Items
        </Button>
      </div>

      <header className="page-header" style={{ paddingTop: 0 }}>
        {isEditingName ? (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                style={{ flex: 1, padding: '12px', fontSize: '24px', fontWeight: 700, border: '2px solid var(--golden-main)', borderRadius: '4px', backgroundColor: 'var(--ivory-bg)' }}
                autoFocus
                disabled={isSaving}
              />
              <Button variant="success" onClick={handleSaveName} disabled={isSaving} style={{ padding: '12px' }}>
                <Check size={20} />
              </Button>
              <Button variant="danger" onClick={handleCancelEdit} disabled={isSaving} style={{ padding: '12px' }}>
                <X size={20} />
              </Button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--black-tertiary)' }}>
              Tip: Renaming to match another item will merge their price histories
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h1 className="page-title" style={{ margin: 0, flex: 1 }}>{item.name}</h1>
            {onItemRename && (
              <Button variant="secondary" onClick={() => setIsEditingName(true)} style={{ padding: '8px 16px' }}>
                <Edit2 size={16} />
                Edit
              </Button>
            )}
          </div>
        )}
        <p className="page-subtitle">
          Price history across {item.priceHistory.length} purchase{item.priceHistory.length !== 1 ? 's' : ''}
        </p>
      </header>

      <div className="content-section">
        {/* Latest Price */}
        <Card>
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <p style={{ fontSize: '14px', color: 'var(--black-tertiary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Latest Price
            </p>
            <p style={{ fontSize: '48px', fontWeight: 700, color: 'var(--golden-main)', marginBottom: '8px' }}>
              {formatPrice(item.latestPrice, item.latestUnit)}
            </p>
            <p style={{ fontSize: '14px', color: 'var(--black-secondary)' }}>
              at {item.latestStore} • {formatReceiptDate(item.latestDate, 'long')}
            </p>
          </div>
        </Card>

        <PriceHistoryTimeline
          priceHistory={item.priceHistory}
          latestUnit={item.latestUnit}
          onReceiptSelect={setSelectedReceiptId}
        />

        {/* Stats */}
        {item.priceHistory.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <Card>
              <p style={{ fontSize: '12px', color: 'var(--black-tertiary)', marginBottom: '8px' }}>Lowest Price</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--green-main)' }}>
                {formatPrice(Math.min(...item.priceHistory.map(e => e.price)), item.latestUnit)}
              </p>
            </Card>
            <Card>
              <p style={{ fontSize: '12px', color: 'var(--black-tertiary)', marginBottom: '8px' }}>Highest Price</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--error-text)' }}>
                {formatPrice(Math.max(...item.priceHistory.map(e => e.price)), item.latestUnit)}
              </p>
            </Card>
            <Card>
              <p style={{ fontSize: '12px', color: 'var(--black-tertiary)', marginBottom: '8px' }}>Stores</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--black-text)' }}>
                {new Set(item.priceHistory.map(e => e.store)).size}
              </p>
            </Card>
          </div>
        )}
      </div>

      {/* Receipt Bottom Sheet */}
      {selectedReceiptId && (
        <BottomSheet
          isOpen={!!selectedReceiptId}
          onClose={() => setSelectedReceiptId(null)}
          title={selectedReceipt ? `Receipt from ${selectedReceipt.storeNameSelected}` : receiptsLoading ? 'Loading...' : ''}
        >
          {!selectedReceipt ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ color: 'var(--black-secondary)' }}>{receiptsLoading ? 'Updating receipt...' : ''}</p>
            </div>
          ) : (
            <ReceiptDetailView
              receipt={selectedReceipt}
              stores={stores}
              units={units}
              onUpdate={async (id, updates) => { if (onReceiptUpdate) await onReceiptUpdate(id, updates); }}
              onDelete={async (id) => {
                if (onReceiptDelete) {
                  await onReceiptDelete(id);
                  setSelectedReceiptId(null);
                  if (onReceiptsReload) await onReceiptsReload();
                }
              }}
              showHeader={true}
            />
          )}
        </BottomSheet>
      )}
    </div>
  );
}
