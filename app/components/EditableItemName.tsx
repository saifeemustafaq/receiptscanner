'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X, Plus } from 'lucide-react';

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

  // Check if current value is an existing item
  const isExistingItem = suggestions.some(
    s => s.toLowerCase().trim() === value.toLowerCase().trim()
  );

  // Filter suggestions based on search term
  useEffect(() => {
    if (mode !== 'dropdown') {
      setFilteredSuggestions([]);
      return;
    }

    if (!searchTerm || searchTerm.trim() === '') {
      setFilteredSuggestions(suggestions.slice(0, 10));
    } else {
      const term = searchTerm.toLowerCase().trim();
      const filtered = suggestions
        .filter(suggestion => 
          suggestion.toLowerCase().includes(term)
        )
        .slice(0, 10);
      setFilteredSuggestions(filtered);
    }
  }, [searchTerm, suggestions, mode]);

  // Focus appropriate input when mode changes
  useEffect(() => {
    if (mode === 'dropdown' && searchInputRef.current) {
      searchInputRef.current.focus();
    } else if (mode === 'create' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
    setNewItemName(value); // Pre-fill with current value
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
          setHighlightedIndex(prev => 
            prev < filteredSuggestions.length ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(prev => prev > -1 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex === -1) {
            handleCreateNew();
          } else if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
            handleSelectExisting(filteredSuggestions[highlightedIndex]);
          }
          break;
        case 'Escape':
          handleCancel();
          break;
      }
    } else if (mode === 'create' && e.key === 'Enter') {
      e.preventDefault();
      handleConfirmNew();
    } else if (mode === 'create' && e.key === 'Escape') {
      handleCancel();
    }
  };

  // DISPLAY MODE
  if (mode === 'display') {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        minHeight: '36px'
      }}>
        <div style={{ flex: 1 }}>
          <span style={{ 
            fontWeight: 500,
            color: 'var(--black-text)'
          }}>
            {value}
          </span>
          {isExistingItem && (
            <span style={{
              marginLeft: '8px',
              fontSize: '11px',
              color: 'var(--green-main)',
              fontWeight: 500,
            }}>
              ✓ Existing
            </span>
          )}
          {!isExistingItem && value && (
            <span style={{
              marginLeft: '8px',
              fontSize: '11px',
              color: 'var(--black-tertiary)',
              fontWeight: 500,
            }}>
              + New
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleEdit}
          disabled={disabled}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: 'transparent',
            border: '2px solid var(--black-text)',
            borderRadius: '4px',
            color: 'var(--black-text)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.backgroundColor = 'var(--ivory-darker)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <Edit2 size={14} />
          Edit
        </button>
      </div>
    );
  }

  // CREATE NEW MODE
  if (mode === 'create') {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        minHeight: '36px'
      }}>
        <input
          ref={inputRef}
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter new item name"
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '14px',
            backgroundColor: 'var(--ivory-bg)',
            border: '2px solid var(--golden-main)',
            borderRadius: '4px',
            color: 'var(--black-text)',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={handleConfirmNew}
          disabled={!newItemName.trim()}
          style={{
            padding: '8px',
            backgroundColor: 'var(--green-main)',
            border: '2px solid var(--green-main)',
            borderRadius: '4px',
            color: 'var(--ivory-bg)',
            cursor: newItemName.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            opacity: newItemName.trim() ? 1 : 0.5,
          }}
          title="Confirm"
        >
          <Check size={16} />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: '2px solid var(--black-text)',
            borderRadius: '4px',
            color: 'var(--black-text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Cancel"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  // DROPDOWN MODE
  return (
    <div ref={dropdownRef} style={{ position: 'relative', minHeight: '36px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        marginBottom: '4px'
      }}>
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search items..."
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '14px',
            backgroundColor: 'var(--ivory-bg)',
            border: '2px solid var(--golden-main)',
            borderRadius: '4px',
            color: 'var(--black-text)',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={handleCancel}
          style={{
            padding: '8px',
            backgroundColor: 'transparent',
            border: '2px solid var(--black-text)',
            borderRadius: '4px',
            color: 'var(--black-text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Cancel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Dropdown List */}
      <div style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: 'var(--ivory-card)',
        border: '2px solid var(--black-text)',
        borderRadius: '4px',
        boxShadow: 'var(--shadow-retro)',
        maxHeight: '240px',
        overflowY: 'auto',
        zIndex: 1000,
      }}>
        {/* Create New Item Option */}
        <div
          onClick={handleCreateNew}
          style={{
            padding: '12px',
            cursor: 'pointer',
            backgroundColor: highlightedIndex === -1 
              ? 'var(--golden-light)' 
              : 'var(--green-pale)',
            borderBottom: '2px solid var(--black-text)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--green-main)',
          }}
          onMouseEnter={() => setHighlightedIndex(-1)}
        >
          <Plus size={16} />
          Create New Item
        </div>

        {/* Existing Items */}
        {filteredSuggestions.length > 0 ? (
          filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              onClick={() => handleSelectExisting(suggestion)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                backgroundColor: highlightedIndex === index 
                  ? 'var(--golden-light)' 
                  : 'transparent',
                borderBottom: index === filteredSuggestions.length - 1 
                  ? 'none' 
                  : '1px solid var(--ivory-border)',
                transition: 'background-color 0.15s',
                fontSize: '14px',
                color: 'var(--black-text)',
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {suggestion}
            </div>
          ))
        ) : (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: 'var(--black-tertiary)',
            fontSize: '14px',
          }}>
            No items found
          </div>
        )}
      </div>
    </div>
  );
}

