'use client';

import { useState, useEffect } from 'react';

interface StringListResourceConfig {
  endpoint: string;
  itemKey: string;
  listKey: string;
  defaults: string[];
}

export interface StringListResource {
  items: string[];
  isLoading: boolean;
  add: (value: string) => Promise<void>;
  remove: (value: string) => Promise<void>;
  clearAll: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useStringListResource({
  endpoint,
  itemKey,
  listKey,
  defaults,
}: StringListResourceConfig): StringListResource {
  const [items, setItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = async () => {
    try {
      if (typeof window === 'undefined') return;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success && Array.isArray(data[listKey])) {
        setItems(data[listKey]);
      } else {
        setItems(defaults);
      }
    } catch (error) {
      console.error(`Error loading ${listKey}:`, error);
      setItems(defaults);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const add = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (items.some(s => s.toLowerCase() === trimmed.toLowerCase())) return;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [itemKey]: trimmed }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      if (data.success && Array.isArray(data[listKey])) {
        setItems(data[listKey]);
      } else {
        console.error(`Failed to add ${itemKey}:`, data.error);
      }
    } catch (error) {
      console.error(`Error adding ${itemKey}:`, error);
    }
  };

  const remove = async (value: string) => {
    try {
      const response = await fetch(`${endpoint}?${itemKey}=${encodeURIComponent(value)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      if (data.success && Array.isArray(data[listKey])) {
        setItems(data[listKey]);
      } else {
        console.error(`Failed to delete ${itemKey}:`, data.error);
      }
    } catch (error) {
      console.error(`Error deleting ${itemKey}:`, error);
    }
  };

  const clearAll = async () => {
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [listKey]: defaults }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      if (data.success && Array.isArray(data[listKey])) {
        setItems(data[listKey]);
      }
    } catch (error) {
      console.error(`Error clearing ${listKey}:`, error);
      setItems(defaults);
    }
  };

  return { items, isLoading, add, remove, clearAll, reload };
}
