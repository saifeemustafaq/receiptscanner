'use client';

import React, { useRef } from 'react';
import { Check, X, Plus } from 'lucide-react';

interface SuggestionDropdownProps {
  mode: 'dropdown' | 'create';
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  newItemName: string;
  setNewItemName: (v: string) => void;
  filteredSuggestions: string[];
  highlightedIndex: number;
  setHighlightedIndex: (v: number) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onCancel: () => void;
  onCreateNew: () => void;
  onConfirmNew: () => void;
  onSelectExisting: (name: string) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

export default function SuggestionDropdown({
  mode,
  searchTerm,
  setSearchTerm,
  newItemName,
  setNewItemName,
  filteredSuggestions,
  highlightedIndex,
  setHighlightedIndex,
  onKeyDown,
  onCancel,
  onCreateNew,
  onConfirmNew,
  onSelectExisting,
  dropdownRef,
  searchInputRef,
  inputRef,
}: SuggestionDropdownProps) {
  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px',
    backgroundColor: active ? 'var(--green-main)' : 'transparent',
    border: `2px solid ${active ? 'var(--green-main)' : 'var(--black-text)'}`,
    borderRadius: '4px',
    color: active ? 'var(--ivory-bg)' : 'var(--black-text)',
    cursor: active ? 'pointer' : 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    opacity: active ? 1 : 0.5,
  });

  const searchInputStyle: React.CSSProperties = {
    flex: 1,
    padding: '8px 12px',
    fontSize: '14px',
    backgroundColor: 'var(--ivory-bg)',
    border: '2px solid var(--golden-main)',
    borderRadius: '4px',
    color: 'var(--black-text)',
    outline: 'none',
  };

  // Create mode
  if (mode === 'create') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '36px' }}>
        <input
          ref={inputRef}
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Enter new item name"
          style={searchInputStyle}
        />
        <button type="button" onClick={onConfirmNew} disabled={!newItemName.trim()} style={btnStyle(!!newItemName.trim())} title="Confirm">
          <Check size={16} />
        </button>
        <button type="button" onClick={onCancel} style={{ ...btnStyle(true), backgroundColor: 'transparent', border: '2px solid var(--black-text)', color: 'var(--black-text)' }} title="Cancel">
          <X size={16} />
        </button>
      </div>
    );
  }

  // Dropdown mode
  return (
    <div ref={dropdownRef} style={{ position: 'relative', minHeight: '36px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setHighlightedIndex(-1); }}
          onKeyDown={onKeyDown}
          placeholder="Search items..."
          style={searchInputStyle}
        />
        <button type="button" onClick={onCancel} style={{ padding: '8px', backgroundColor: 'transparent', border: '2px solid var(--black-text)', borderRadius: '4px', color: 'var(--black-text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Cancel">
          <X size={16} />
        </button>
      </div>

      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--ivory-card)', border: '2px solid var(--black-text)', borderRadius: '4px', boxShadow: 'var(--shadow-retro)', maxHeight: '240px', overflowY: 'auto', zIndex: 1000 }}>
        <div
          onClick={onCreateNew}
          onMouseEnter={() => setHighlightedIndex(-1)}
          style={{ padding: '12px', cursor: 'pointer', backgroundColor: highlightedIndex === -1 ? 'var(--golden-light)' : 'var(--green-pale)', borderBottom: '2px solid var(--black-text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--green-main)' }}
        >
          <Plus size={16} />
          Create New Item
        </div>

        {filteredSuggestions.length > 0 ? (
          filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              onClick={() => onSelectExisting(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
              style={{ padding: '10px 12px', cursor: 'pointer', backgroundColor: highlightedIndex === index ? 'var(--golden-light)' : 'transparent', borderBottom: index === filteredSuggestions.length - 1 ? 'none' : '1px solid var(--ivory-border)', transition: 'background-color 0.15s', fontSize: '14px', color: 'var(--black-text)' }}
            >
              {suggestion}
            </div>
          ))
        ) : (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--black-tertiary)', fontSize: '14px' }}>
            No items found
          </div>
        )}
      </div>
    </div>
  );
}
