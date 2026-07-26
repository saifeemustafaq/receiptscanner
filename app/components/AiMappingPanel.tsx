'use client';

import React, { useMemo, useState } from 'react';
import { Sparkles, Loader, Check, X, Link2 } from 'lucide-react';
import Button from './Button';
import { normalizeItemName } from '@/lib/itemMappings';

interface AiMappingPanelProps {
  /** All currently-unmapped raw scanned names (the pool to pick a batch from). */
  unmappedNames: string[];
  /** Existing canonical item names — passed to the AI as preferred targets. */
  existingItems: string[];
  /** Existing raw→canonical mappings — passed to the AI as style examples. */
  existingMappings: { rawName: string; canonicalName: string }[];
  /** Apply the approved batch; resolves with how many were saved. */
  onApply: (
    pairs: { rawName: string; canonicalName: string }[]
  ) => Promise<{ success: boolean; applied: number; error?: string }>;
}

type Phase = 'idle' | 'loading' | 'preview';

interface PreviewRow {
  rawName: string;
  canonical: string;
  include: boolean;
}

const BATCH_OPTIONS = [10, 20] as const;

/** Randomly pick up to `n` items from `pool` (non-mutating). */
function pickRandom(pool: string[], n: number): string[] {
  if (pool.length <= n) return [...pool];
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/**
 * AI-assisted bulk mapping. Picks a random batch of unmapped items, asks the
 * active AI provider to propose a canonical name for each, then shows an
 * EDITABLE preview so the user reviews/adjusts every row before applying.
 */
export default function AiMappingPanel({
  unmappedNames,
  existingItems,
  existingMappings,
  onApply,
}: AiMappingPanelProps) {
  const [batchSize, setBatchSize] = useState<number>(BATCH_OPTIONS[0]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  // Case-insensitive set of existing canonical names, for the new/existing tag.
  const existingSet = useMemo(
    () => new Set(existingItems.map(n => normalizeItemName(n))),
    [existingItems]
  );

  const hasUnmapped = unmappedNames.length > 0;

  const handleSuggest = async () => {
    setError(null);
    setResult(null);
    const targets = pickRandom(unmappedNames, batchSize);
    if (targets.length === 0) {
      setError('There are no unmapped items to map.');
      return;
    }

    setPhase('loading');
    try {
      const response = await fetch('/api/ai-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets, existingItems, existingMappings }),
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to get AI suggestions.');
        setPhase('idle');
        return;
      }

      const suggestions: { rawName: string; canonical: string }[] = data.suggestions ?? [];
      const byRaw = new Map(suggestions.map(s => [s.rawName, s.canonical]));
      // Keep every target visible so the user can fill any the AI skipped.
      const nextRows: PreviewRow[] = targets.map(rawName => {
        const canonical = byRaw.get(rawName) ?? '';
        return { rawName, canonical, include: canonical.trim().length > 0 };
      });
      setRows(nextRows);
      setPhase('preview');
    } catch {
      setError('Could not reach the AI service. Please try again.');
      setPhase('idle');
    }
  };

  const updateRow = (index: number, patch: Partial<PreviewRow>) => {
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const handleApply = async () => {
    const pairs = rows
      .filter(r => r.include && r.canonical.trim())
      .map(r => ({ rawName: r.rawName, canonicalName: r.canonical.trim() }));

    if (pairs.length === 0) {
      setError('Select at least one item with a canonical name to apply.');
      return;
    }

    setApplying(true);
    setError(null);
    const res = await onApply(pairs);
    setApplying(false);

    if (res.applied > 0) {
      setResult(`Applied ${res.applied} mapping${res.applied === 1 ? '' : 's'}.`);
      setRows([]);
      setPhase('idle');
    } else {
      setError(res.error || 'Failed to apply mappings.');
    }
  };

  const handleCancel = () => {
    setRows([]);
    setPhase('idle');
    setError(null);
  };

  const includedCount = rows.filter(r => r.include && r.canonical.trim()).length;

  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: 'var(--golden-light)',
        border: '2px solid var(--golden-main)',
        borderRadius: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Sparkles size={18} style={{ color: 'var(--golden-dark)' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--black-text)' }}>AI Mapping</h3>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--black-secondary)', marginBottom: '12px' }}>
        Let AI suggest canonical names for a batch of unmapped items. You review and edit every
        suggestion before anything is applied. {unmappedNames.length} item
        {unmappedNames.length === 1 ? '' : 's'} currently unmapped.
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <select
          value={String(batchSize)}
          onChange={(e) => setBatchSize(Number(e.target.value))}
          disabled={phase !== 'idle' || !hasUnmapped}
          style={{
            padding: '8px 10px',
            fontSize: '14px',
            border: '2px solid var(--black-text)',
            borderRadius: '4px',
            backgroundColor: 'var(--ivory-bg)',
            color: 'var(--black-text)',
            cursor: phase !== 'idle' || !hasUnmapped ? 'not-allowed' : 'pointer',
          }}
        >
          {BATCH_OPTIONS.map(n => (
            <option key={n} value={n}>Up to {n} items</option>
          ))}
        </select>

        <Button
          variant="primary"
          onClick={handleSuggest}
          disabled={phase !== 'idle' || !hasUnmapped}
          style={{ padding: '8px 16px', fontSize: '14px' }}
        >
          {phase === 'loading' ? (
            <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <Sparkles size={16} />
          )}
          {phase === 'loading' ? 'Asking AI…' : 'Suggest mappings'}
        </Button>
      </div>

      {!hasUnmapped && (
        <p style={{ fontSize: '13px', color: 'var(--black-tertiary)', marginTop: '8px' }}>
          Everything is mapped — nothing for AI to do.
        </p>
      )}

      {error && (
        <p style={{ fontSize: '13px', color: 'var(--error-text)', marginTop: '10px', fontWeight: 600 }}>
          {error}
        </p>
      )}
      {result && (
        <p style={{ fontSize: '13px', color: 'var(--green-main)', marginTop: '10px', fontWeight: 600 }}>
          {result}
        </p>
      )}

      {/* Preview */}
      {phase === 'preview' && rows.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--black-secondary)', marginBottom: '10px' }}>
            Review each suggestion. Edit the canonical name, untick to skip, then apply. A new item
            is created for any canonical that doesn&rsquo;t exist yet.
          </p>

          <datalist id="ai-mapping-canonicals">
            {existingItems.map(name => (
              <option key={name} value={name} />
            ))}
          </datalist>

          <div className="flex flex-col gap-sm">
            {rows.map((row, index) => {
              const trimmed = row.canonical.trim();
              const isNew = trimmed.length > 0 && !existingSet.has(normalizeItemName(trimmed));
              return (
                <div
                  key={row.rawName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    backgroundColor: 'var(--ivory-bg)',
                    border: '1px solid var(--ivory-border)',
                    borderRadius: '4px',
                    opacity: row.include ? 1 : 0.5,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={(e) => updateRow(index, { include: e.target.checked })}
                    style={{ width: '16px', height: '16px', flexShrink: 0, cursor: 'pointer' }}
                    title={row.include ? 'Skip this item' : 'Include this item'}
                  />
                  <span
                    style={{ flex: 1, minWidth: 0, fontSize: '13px', fontWeight: 600, color: 'var(--black-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={row.rawName}
                  >
                    {row.rawName}
                  </span>
                  <span style={{ color: 'var(--black-tertiary)', flexShrink: 0 }}>→</span>
                  <input
                    type="text"
                    list="ai-mapping-canonicals"
                    value={row.canonical}
                    onChange={(e) => updateRow(index, { canonical: e.target.value })}
                    placeholder="Canonical item name"
                    style={{
                      flex: 1,
                      minWidth: '120px',
                      padding: '6px 10px',
                      fontSize: '13px',
                      border: '2px solid var(--golden-main)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--ivory-bg)',
                      color: 'var(--black-text)',
                    }}
                  />
                  <span
                    style={{
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: isNew ? 'var(--golden-light)' : 'var(--green-pale)',
                      color: isNew ? 'var(--golden-dark)' : 'var(--green-main)',
                      border: `1px solid ${isNew ? 'var(--golden-main)' : 'var(--green-main)'}`,
                    }}
                  >
                    <Link2 size={11} />
                    {trimmed ? (isNew ? 'new item' : 'existing') : '—'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-md" style={{ marginTop: '12px' }}>
            <Button variant="success" onClick={handleApply} disabled={applying || includedCount === 0}>
              {applying ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={18} />}
              {applying ? 'Applying…' : `Apply ${includedCount} mapping${includedCount === 1 ? '' : 's'}`}
            </Button>
            <Button variant="secondary" onClick={handleCancel} disabled={applying}>
              <X size={18} />
              Cancel
            </Button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
