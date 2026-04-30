'use client';

import React from 'react';
import { Store, Plus, X } from 'lucide-react';
import { toTitleCase } from '@/lib/storeMatching';

interface StoreSuggestionBannerProps {
  scannedName: string;
  matchedStore: string;
  confidence: 'exact' | 'high' | 'none';
  onUseExisting: () => void;
  onAddNew: (name: string) => void;
  onDismiss: () => void;
}

export default function StoreSuggestionBanner({
  scannedName,
  matchedStore,
  confidence,
  onUseExisting,
  onAddNew,
  onDismiss,
}: StoreSuggestionBannerProps) {
  const hasMatch = confidence === 'exact' || confidence === 'high';
  const formattedName = toTitleCase(scannedName);

  const containerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderRadius: '4px',
    border: `2px solid ${hasMatch ? 'var(--green-main)' : 'var(--black-text)'}`,
    backgroundColor: hasMatch ? 'var(--green-pale)' : 'var(--ivory-darker)',
    marginBottom: '8px',
  };

  const btnBase: React.CSSProperties = {
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 600,
    borderRadius: '4px',
    cursor: 'pointer',
    border: '2px solid var(--black-text)',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <Store size={16} style={{ color: hasMatch ? 'var(--green-main)' : 'var(--black-secondary)', flexShrink: 0, marginTop: '2px' }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {hasMatch ? (
            <p style={{ fontSize: '13px', color: 'var(--black-text)', marginBottom: '10px' }}>
              Detected <strong>{scannedName}</strong> — matches your existing store <strong>{matchedStore}</strong>.
            </p>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--black-text)', marginBottom: '10px' }}>
              Detected <strong>{scannedName}</strong> — not in your store list.
            </p>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {hasMatch ? (
              <>
                <button
                  type="button"
                  onClick={onUseExisting}
                  style={{ ...btnBase, backgroundColor: 'var(--green-main)', color: 'var(--ivory-bg)', borderColor: 'var(--green-main)' }}
                >
                  Use {matchedStore}
                </button>
                <button
                  type="button"
                  onClick={() => onAddNew(formattedName)}
                  style={{ ...btnBase, backgroundColor: 'transparent', color: 'var(--black-text)', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={14} />
                  Add &ldquo;{formattedName}&rdquo; as new store
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onAddNew(formattedName)}
                  style={{ ...btnBase, backgroundColor: 'var(--black-text)', color: 'var(--ivory-bg)', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={14} />
                  Add &ldquo;{formattedName}&rdquo; as new store
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  style={{ ...btnBase, backgroundColor: 'transparent', color: 'var(--black-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <X size={14} />
                  Select manually
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
