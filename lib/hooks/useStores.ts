'use client';

import { useState, useEffect } from 'react';

const DEFAULT_STORES = ['Walmart', 'Target', 'Costco', 'Whole Foods', 'Kroger'];

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

  const addStore = async (storeName: string) => {
    const trimmed = storeName.trim();
    if (!trimmed) return;
    
    // Check if store already exists locally (case-insensitive)
    const lowerCased = trimmed.toLowerCase();
    if (stores.some(s => s.toLowerCase() === lowerCased)) {
      return; // Already exists
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
      } else {
        console.error('Failed to add store:', data.error);
      }
    } catch (error) {
      console.error('Error adding store:', error);
    }
  };

  const deleteStore = async (storeName: string) => {
    try {
      const response = await fetch(`/api/stores?store=${encodeURIComponent(storeName)}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.stores)) {
        setStores(data.stores);
      } else {
        console.error('Failed to delete store:', data.error);
      }
    } catch (error) {
      console.error('Error deleting store:', error);
    }
  };

  const clearAll = async () => {
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
      }
    } catch (error) {
      console.error('Error clearing stores:', error);
      setStores(DEFAULT_STORES);
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

