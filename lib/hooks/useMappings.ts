'use client';

import { useState, useEffect } from 'react';
import type { ItemMapping } from '@/lib/itemMappings';
import type { MutationResult } from '@/lib/types';

/**
 * Client hook for learned item mappings (raw scanned name -> canonical name).
 * Mirrors useStores: load/mutate/refetch with a { success, error } return.
 */
export function useMappings() {
  const [mappings, setMappings] = useState<ItemMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMappings();
  }, []);

  const loadMappings = async () => {
    try {
      if (typeof window === 'undefined') return;

      const response = await fetch('/api/mappings');
      const data = await response.json();

      if (data.success && Array.isArray(data.mappings)) {
        setMappings(data.mappings);
      } else {
        setMappings([]);
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
      setMappings([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addMapping = async (
    rawName: string,
    canonicalName: string
  ): Promise<MutationResult> => {
    const trimmedRaw = rawName.trim();
    const trimmedCanonical = canonicalName.trim();
    if (!trimmedRaw) return { success: false, error: 'Raw name cannot be empty' };
    if (!trimmedCanonical) {
      return { success: false, error: 'Canonical name cannot be empty' };
    }

    try {
      const response = await fetch('/api/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawName: trimmedRaw, canonicalName: trimmedCanonical }),
      });

      const data = await response.json();

      if (data.success && Array.isArray(data.mappings)) {
        setMappings(data.mappings);
        return { success: true };
      }
      console.error('Failed to add mapping:', data.error);
      return { success: false, error: data.error || 'Failed to add mapping' };
    } catch (error) {
      console.error('Error adding mapping:', error);
      return { success: false, error: 'Failed to add mapping' };
    }
  };

  /**
   * Apply several raw→canonical mappings in one go (e.g. an AI-suggested batch
   * the user approved). Applied SEQUENTIALLY on purpose: each POST is a
   * read-modify-write of the same JSON file, so parallel writes would race and
   * drop mappings. Returns how many were saved and the first error, if any.
   */
  const applyMappings = async (
    pairs: { rawName: string; canonicalName: string }[]
  ): Promise<{ success: boolean; applied: number; error?: string }> => {
    let applied = 0;
    let latest: ItemMapping[] | null = null;
    let firstError: string | undefined;

    for (const pair of pairs) {
      const rawName = pair.rawName?.trim();
      const canonicalName = pair.canonicalName?.trim();
      if (!rawName || !canonicalName) continue;

      try {
        const response = await fetch('/api/mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawName, canonicalName }),
        });
        const data = await response.json();
        if (data.success && Array.isArray(data.mappings)) {
          applied += 1;
          latest = data.mappings;
        } else if (!firstError) {
          firstError = data.error || `Failed to map "${rawName}"`;
        }
      } catch {
        if (!firstError) firstError = `Failed to map "${rawName}"`;
      }
    }

    if (latest) setMappings(latest);
    return { success: applied > 0, applied, error: firstError };
  };

  const deleteMapping = async (normalizedRaw: string): Promise<MutationResult> => {
    try {
      const response = await fetch(
        `/api/mappings?normalizedRaw=${encodeURIComponent(normalizedRaw)}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success && Array.isArray(data.mappings)) {
        setMappings(data.mappings);
        return { success: true };
      }
      console.error('Failed to delete mapping:', data.error);
      return { success: false, error: data.error || 'Failed to delete mapping' };
    } catch (error) {
      console.error('Error deleting mapping:', error);
      return { success: false, error: 'Failed to delete mapping' };
    }
  };

  return {
    mappings,
    isLoading,
    addMapping,
    applyMappings,
    deleteMapping,
    reload: loadMappings,
  };
}
