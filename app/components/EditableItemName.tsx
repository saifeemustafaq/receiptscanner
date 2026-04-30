'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Edit2 } from 'lucide-react';
import SuggestionDropdown from './SuggestionDropdown';

type Mode = 'display' | 'dropdown' | 'create';

interface EditableItemNameProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  disabled?: boolean;
}

export default function EditableItemName({
  value,
  onChange,
  suggestions,
  disabled = false,
}: EditableItemNameProps) {
  const [mode, setMode] = useState<Mode>('display');
  const [searchTerm, setSearchTerm] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isExistingItem = suggestions.some(
    s => s.toLowerCase().trim() === value.toLowerCase().trim()
  );

  useEffect(() => {
    if (mode !== 'dropdown') {
      setFilteredSuggestions([]);
      return;
    }
    if (!searchTerm.trim()) {
      setFilteredSuggestions(suggestions.slice(0, 10));
    } else {
      const term = searchTerm.toLowerCase().trim();
      setFilteredSuggestions(suggestions.filter(s => s.toLowerCase().includes(term)).slice(0, 10));
    }
  }, [searchTerm, suggestions, mode]);

  useEffect(() => {
    if (mode === 'dropdown') searchInputRef.current?.focus();
    else if (mode === 'create') inputRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleCancel();
      }
    };
    if (mode !== 'display') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [mode]);

  const handleEdit = () => {
    setMode('dropdown');
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleSelectExisting = (itemName: string) => {
    onChange(itemName);
    setMode('display');
    setSearchTerm('');
  };

  const handleCreateNew = () => {
    setMode('create');
    setNewItemName(value);
  };

  const handleConfirmNew = () => {
    if (newItemName.trim()) {
      onChange(newItemName.trim());
      setMode('display');
      setNewItemName('');
    }
  };

  const handleCancel = () => {
    setMode('display');
    setSearchTerm('');
    setNewItemName('');
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mode === 'dropdown' && filteredSuggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex(prev => prev < filteredSuggestions.length - 1 ? prev + 1 : prev);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => prev > -1 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex === -1) handleCreateNew();
          else if (highlightedIndex >= 0) handleSelectExisting(filteredSuggestions[highlightedIndex]);
          break;
        case 'Escape':
          handleCancel();
          break;
      }
    } else if (mode === 'create') {
      if (e.key === 'Enter') { e.preventDefault(); handleConfirmNew(); }
      else if (e.key === 'Escape') handleCancel();
    }
  };

  if (mode === 'display') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '36px' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 500, color: 'var(--black-text)' }}>{value}</span>
          {isExistingItem && (
            <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--green-main)', fontWeight: 500 }}>✓ Existing</span>
          )}
          {!isExistingItem && value && (
            <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--black-tertiary)', fontWeight: 500 }}>+ New</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleEdit}
          disabled={disabled}
          style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, backgroundColor: 'transparent', border: '2px solid var(--black-text)', borderRadius: '4px', color: 'var(--black-text)', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = 'var(--ivory-darker)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <Edit2 size={14} />
          Edit
        </button>
      </div>
    );
  }

  return (
    <SuggestionDropdown
      mode={mode}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      newItemName={newItemName}
      setNewItemName={setNewItemName}
      filteredSuggestions={filteredSuggestions}
      highlightedIndex={highlightedIndex}
      setHighlightedIndex={setHighlightedIndex}
      onKeyDown={handleKeyDown}
      onCancel={handleCancel}
      onCreateNew={handleCreateNew}
      onConfirmNew={handleConfirmNew}
      onSelectExisting={handleSelectExisting}
      dropdownRef={dropdownRef}
      searchInputRef={searchInputRef}
      inputRef={inputRef}
    />
  );
}
