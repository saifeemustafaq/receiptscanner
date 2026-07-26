'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link2, Plus, Sparkles, X } from 'lucide-react';
import { buildMappingIndex, normalizeItemName, suggestCanonicalName } from '@/lib/itemMappings';
import type { ItemMapping } from '@/lib/itemMappings';
import type { MutationResult } from '@/lib/types';
import { groupKey } from '@/lib/itemsProcessor';

interface ItemMappingControlProps {
  rawName: string; // the raw/stored line-item name (never overwritten by mapping)
  mappings: ItemMapping[];
  suggestions: string[]; // canonical item names to map to
  onMap?: (rawName: string, canonicalName: string) => Promise<MutationResult>;
  onUnmap?: (normalizedRaw: string) => Promise<MutationResult>;
  disabled?: boolean;
}

/**
 * Inline control on the Home review screen for associating a raw scanned item
 * name (e.g. "AXFFDJ") with a canonical item (e.g. "Ginger"). Mapping is
 * non-destructive: the receipt keeps its raw name; this only records the
 * learned association so this and future scans resolve to the canonical name.
 */
export default function ItemMappingControl({
  rawName,
  mappings,
  suggestions,
  onMap,
  onUnmap,
  disabled = false,
}: ItemMappingControlProps) {
  const [isPicking, setIsPicking] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mappedCanonical = useMemo(() => {
    const index = buildMappingIndex(mappings);
    return index.get(normalizeItemName(rawName));
  }, [mappings, rawName]);

  // One-tap smart suggestion for an unmapped item — a pre-proposed canonical
  // name inferred from readable raw names (e.g. "Cilantro 24 ct" -> "Cilantro").
  // Suppressed once mapped, and never suggests the raw's own current name.
  const suggestion = useMemo(() => {
    if (mappedCanonical) return null;
    const proposed = suggestCanonicalName(rawName, suggestions);
    if (!proposed) return null;
    if (normalizeItemName(proposed) === normalizeItemName(rawName)) return null;
    // Suppress redundant suggestions: itemsProcessor already groups by core name
    // (size tokens stripped), so a proposal that resolves to the SAME group key
    // as the raw name (e.g. just dropping "25 lb") is a no-op click. Only offer
    // the suggestion when accepting it would actually change the grouping —
    // e.g. merging "Cilantro Bunch 24 ct" into an existing "Cilantro".
    if (groupKey(proposed) === groupKey(rawName)) return null;
    return proposed;
  }, [mappedCanonical, rawName, suggestions]);

  const filteredSuggestions = useMemo(() => {
    const normalizedRaw = normalizeItemName(rawName);
    const term = searchTerm.toLowerCase().trim();
    return suggestions
      .filter(s => normalizeItemName(s) !== normalizedRaw)
      .filter(s => (term ? s.toLowerCase().includes(term) : true))
      .slice(0, 8);
  }, [suggestions, searchTerm, rawName]);

  const openPicker = () => {
    setSearchTerm('');
    setError(null);
    setIsPicking(true);
  };

  const closePicker = () => {
    setIsPicking(false);
    setSearchTerm('');
  };

  useEffect(() => {
    if (isPicking && inputRef.current) inputRef.current.focus();
  }, [isPicking]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closePicker();
      }
    };
    if (isPicking) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isPicking]);

  const handleSelect = async (canonicalName: string) => {
    const target = canonicalName.trim();
    if (!target || !onMap) return;

    setIsSaving(true);
    setError(null);
    const result = await onMap(rawName, target);
    setIsSaving(false);

    if (result && result.success === false) {
      setError(result.error || 'Failed to save mapping');
      return;
    }
    closePicker();
  };

  const handleUnmap = async () => {
    if (!onUnmap) return;

    setIsSaving(true);
    setError(null);
    const result = await onUnmap(normalizeItemName(rawName));
    setIsSaving(false);

    if (result && result.success === false) {
      setError(result.error || 'Failed to remove mapping');
    }
  };

  const linkButtonStyle: React.CSSProperties = {
    padding: 0,
    background: 'none',
    border: 'none',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--golden-main)',
    cursor: disabled || isSaving ? 'not-allowed' : 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  };

  if (!isPicking) {
    return (
      <div ref={containerRef} style={{ marginTop: '6px' }}>
        {mappedCanonical ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'var(--green-pale)',
              color: 'var(--green-main)',
              border: '1px solid var(--green-main)',
              fontSize: '11px',
              fontWeight: 600,
            }}>
              <Link2 size={12} />
              {mappedCanonical}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--black-tertiary)' }}>
              mapped from &ldquo;{rawName}&rdquo;
            </span>
            {onMap && (
              <button type="button" onClick={openPicker} disabled={disabled || isSaving} style={linkButtonStyle}>
                Change
              </button>
            )}
            {onUnmap && (
              <button type="button" onClick={handleUnmap} disabled={disabled || isSaving} style={linkButtonStyle}>
                Unmap
              </button>
            )}
          </div>
        ) : (
          onMap && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {suggestion && (
                <button
                  type="button"
                  onClick={() => handleSelect(suggestion)}
                  disabled={disabled || isSaving}
                  title={`Map "${rawName}" to ${suggestion}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    backgroundColor: 'var(--golden-light)',
                    border: '1px solid var(--golden-main)',
                    borderRadius: '12px',
                    color: 'var(--golden-dark)',
                    cursor: disabled || isSaving ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Sparkles size={12} />
                  Map to {suggestion}
                </button>
              )}
              <button
                type="button"
                onClick={openPicker}
                disabled={disabled}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: 'none',
                  border: '1px dashed var(--black-tertiary)',
                  borderRadius: '12px',
                  color: 'var(--black-secondary)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                <Link2 size={12} />
                {suggestion ? 'Other...' : 'Map to...'}
              </button>
            </div>
          )
        )}
        {error && (
          <p style={{ fontSize: '11px', color: 'var(--error-text)', marginTop: '4px' }}>{error}</p>
        )}
      </div>
    );
  }

  const trimmedTerm = searchTerm.trim();

  return (
    <div ref={containerRef} style={{ position: 'relative', marginTop: '6px' }}>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search, or type a new item name to create…"
          style={{
            flex: 1,
            padding: '6px 10px',
            fontSize: '13px',
            border: '2px solid var(--golden-main)',
            borderRadius: '4px',
            backgroundColor: 'var(--ivory-bg)',
            color: 'var(--black-text)',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={closePicker}
          aria-label="Cancel mapping"
          style={{
            padding: '6px',
            background: 'none',
            border: '2px solid var(--black-text)',
            borderRadius: '4px',
            color: 'var(--black-text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: '4px',
        backgroundColor: 'var(--ivory-card)',
        border: '2px solid var(--black-text)',
        borderRadius: '4px',
        boxShadow: 'var(--shadow-retro)',
        maxHeight: '200px',
        overflowY: 'auto',
        zIndex: 1000,
      }}>
        {trimmedTerm && (
          <button
            type="button"
            onClick={() => handleSelect(trimmedTerm)}
            style={{
              width: '100%',
              padding: '10px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
              fontSize: '13px',
              textAlign: 'left',
              color: 'var(--green-main)',
              backgroundColor: 'var(--green-pale)',
              border: 'none',
              borderBottom: '2px solid var(--black-text)',
            }}
          >
            <Plus size={14} />
            Create &ldquo;{trimmedTerm}&rdquo;
          </button>
        )}

        {filteredSuggestions.length > 0 ? (
          filteredSuggestions.map((suggestion, index) => (
            <button
              type="button"
              key={suggestion}
              onClick={() => handleSelect(suggestion)}
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left',
                color: 'var(--black-text)',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: index === filteredSuggestions.length - 1 ? 'none' : '1px solid var(--ivory-border)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--golden-light)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {suggestion}
            </button>
          ))
        ) : (
          !trimmedTerm && (
            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--black-tertiary)', fontSize: '13px' }}>
              Type to search or create
            </div>
          )
        )}
      </div>

      {error && (
        <p style={{ fontSize: '11px', color: 'var(--error-text)', marginTop: '4px' }}>{error}</p>
      )}
    </div>
  );
}
