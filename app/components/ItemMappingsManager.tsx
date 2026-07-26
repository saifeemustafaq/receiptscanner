'use client';

import React, { useMemo, useState } from 'react';
import { Link2 } from 'lucide-react';
import Card from './Card';
import Input from './Input';
import ItemMappingControl from './ItemMappingControl';
import AiMappingPanel from './AiMappingPanel';
import { getAllItemNames } from '@/lib/itemsProcessor';
import { applyItemMappings, buildMappingIndex, normalizeItemName } from '@/lib/itemMappings';
import type { ItemMapping } from '@/lib/itemMappings';
import type { MutationResult, SavedReceipt } from '@/lib/types';

interface ItemMappingsManagerProps {
  mappings: ItemMapping[];
  receipts: SavedReceipt[];
  onAddMapping: (rawName: string, canonicalName: string) => Promise<MutationResult>;
  onDeleteMapping: (normalizedRaw: string) => Promise<MutationResult>;
  onApplyMappings: (
    pairs: { rawName: string; canonicalName: string }[]
  ) => Promise<{ success: boolean; applied: number; error?: string }>;
}

/**
 * Settings section for managing learned item mappings. Lists every distinct
 * scanned item name (from receipts + existing mappings), letting the user map
 * unmapped names to a canonical item and change/remove existing mappings.
 * Mapping stays non-destructive — receipts keep their raw names.
 */
export default function ItemMappingsManager({
  mappings,
  receipts,
  onAddMapping,
  onDeleteMapping,
  onApplyMappings,
}: ItemMappingsManagerProps) {
  const [filter, setFilter] = useState('');

  const index = useMemo(() => buildMappingIndex(mappings), [mappings]);

  // Canonical name suggestions come from mapping-resolved receipts.
  const suggestions = useMemo(
    () => getAllItemNames(applyItemMappings(receipts, mappings)),
    [receipts, mappings]
  );

  // Union of distinct raw names from receipts and existing mappings, keyed by
  // normalized name (keeps the first-seen original casing for display).
  const rawNames = useMemo(() => {
    const seen = new Map<string, string>();
    receipts.forEach(receipt => {
      receipt.extractedData.items.forEach(item => {
        const norm = normalizeItemName(item.name);
        if (norm && !seen.has(norm)) seen.set(norm, item.name);
      });
    });
    mappings.forEach(mapping => {
      if (!seen.has(mapping.normalizedRaw)) seen.set(mapping.normalizedRaw, mapping.rawName);
    });
    return Array.from(seen.values()).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [receipts, mappings]);

  const term = filter.toLowerCase().trim();
  const filtered = term
    ? rawNames.filter(name => name.toLowerCase().includes(term))
    : rawNames;

  const mappedNames = filtered.filter(name => index.has(normalizeItemName(name)));
  const unmappedNames = filtered.filter(name => !index.has(normalizeItemName(name)));

  // Unfiltered unmapped pool + mapping pairs for the AI panel (independent of
  // the search filter, which only scopes the lists below).
  const allUnmapped = useMemo(
    () => rawNames.filter(name => !index.has(normalizeItemName(name))),
    [rawNames, index]
  );
  const existingMappingPairs = useMemo(
    () => mappings.map(m => ({ rawName: m.rawName, canonicalName: m.canonicalName })),
    [mappings]
  );

  const renderRow = (rawName: string) => (
    <div
      key={normalizeItemName(rawName)}
      style={{
        padding: '12px',
        backgroundColor: 'var(--ivory-bg)',
        border: '1px solid var(--ivory-border)',
        borderRadius: '4px',
      }}
    >
      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--black-text)' }}>
        {rawName}
      </span>
      <ItemMappingControl
        rawName={rawName}
        mappings={mappings}
        suggestions={suggestions}
        onMap={onAddMapping}
        onUnmap={onDeleteMapping}
      />
    </div>
  );

  return (
    <Card>
      <h2 className="card-title">Item Mappings</h2>

      <div className="flex flex-col gap-base">
        <p style={{ color: 'var(--black-secondary)', fontSize: '14px' }}>
          Associate cryptic or differently-named scanned items (e.g. &ldquo;AXFFDJ&rdquo;
          or &ldquo;Apple Fuji&rdquo;) with a canonical item (e.g. &ldquo;Ginger&rdquo; or
          &ldquo;Apple&rdquo;). Don&rsquo;t see the item you want? Just type a new name in the
          picker to create it. Mappings are non-destructive and apply to past and future
          receipts, so all of an item&rsquo;s price history stays in one place.
        </p>

        {rawNames.length > 0 && (
          <AiMappingPanel
            unmappedNames={allUnmapped}
            existingItems={suggestions}
            existingMappings={existingMappingPairs}
            onApply={onApplyMappings}
          />
        )}

        <Input
          label="Filter items"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search scanned item names"
        />

        {rawNames.length === 0 ? (
          <p style={{ color: 'var(--black-tertiary)', fontSize: '14px' }}>
            No items yet. Scan a receipt to start building mappings.
          </p>
        ) : (
          <>
            <div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <Link2 size={16} />
                Mapped ({mappedNames.length})
              </h3>
              {mappedNames.length > 0 ? (
                <div className="flex flex-col gap-sm">{mappedNames.map(renderRow)}</div>
              ) : (
                <p style={{ color: 'var(--black-tertiary)', fontSize: '14px' }}>
                  No mappings yet.
                </p>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--ivory-border)', paddingTop: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                Unmapped scanned items ({unmappedNames.length})
              </h3>
              {unmappedNames.length > 0 ? (
                <div className="flex flex-col gap-sm">{unmappedNames.map(renderRow)}</div>
              ) : (
                <p style={{ color: 'var(--black-tertiary)', fontSize: '14px' }}>
                  Everything is mapped.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
