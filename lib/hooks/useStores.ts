'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_STORES } from '@/lib/defaults';
import type { MutationResult } from '@/lib/types';

export function useStores() {
  const [stores, setStores] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      if (typeof window === 'undefined') return;
      
      const response = await fetch('/api/stores');
      const data = await response.json();
      
      if (data.success && Array.isArray(data.stores)) {
        setStores(data.stores);
      } else {
        setStores(DEFAULT_STORES);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
      setStores(DEFAULT_STORES);
    } finally {
      setIsLoading(false);
    }
  };

  const addStore = async (storeName: string): Promise<MutationResult> => {
    const trimmed = storeName.trim();
    if (!trimmed) return { success: false, error: 'Store name cannot be empty' };
    
    // Check if store already exists locally (case-insensitive)
    const lowerCased = trimmed.toLowerCase();
    if (stores.some(s => s.toLowerCase() === lowerCased)) {
      return { success: false, error: 'This store already exists' };
    }
    
    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ store: trimmed }),
      });
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.stores)) {
        setStores(data.stores);
        return { success: true };
      }
      console.error('Failed to add store:', data.error);
      return { success: false, error: data.error || 'Failed to add store' };
    } catch (error) {
      console.error('Error adding store:', error);
      return { success: false, error: 'Failed to add store' };
    }
  };

  const deleteStore = async (storeName: string): Promise<MutationResult> => {
    try {
      const response = await fetch(`/api/stores?store=${encodeURIComponent(storeName)}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.stores)) {
        setStores(data.stores);
        return { success: true };
      }
      console.error('Failed to delete store:', data.error);
      return { success: false, error: data.error || 'Failed to delete store' };
    } catch (error) {
      console.error('Error deleting store:', error);
      return { success: false, error: 'Failed to delete store' };
    }
  };

  const clearAll = async (): Promise<MutationResult> => {
    try {
      // Reset to default stores by saving them
      const response = await fetch('/api/stores', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stores: DEFAULT_STORES }),
      });
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.stores)) {
        setStores(data.stores);
        return { success: true };
      }
      console.error('Failed to clear stores:', data.error);
      return { success: false, error: data.error || 'Failed to clear stores' };
    } catch (error) {
      console.error('Error clearing stores:', error);
      setStores(DEFAULT_STORES);
      return { success: false, error: 'Failed to clear stores' };
    }
  };

  return {
    stores,
    isLoading,
    addStore,
    deleteStore,
    clearAll,
    reload: loadStores,
  };
}

