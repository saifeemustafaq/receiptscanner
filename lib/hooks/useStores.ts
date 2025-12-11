'use client';

import { useState, useEffect } from 'react';

const DEFAULT_STORES = ['Walmart', 'Target', 'Costco', 'Whole Foods', 'Kroger'];

export function useStores() {
  const [stores, setStores] = useState<string[]>([]);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = () => {
    const savedStores = localStorage.getItem('stores');
    if (savedStores) {
      try {
        setStores(JSON.parse(savedStores));
      } catch (e) {
        setStores(DEFAULT_STORES);
      }
    } else {
      setStores(DEFAULT_STORES);
    }
  };

  const saveStores = (newStores: string[]) => {
    setStores(newStores);
    localStorage.setItem('stores', JSON.stringify(newStores));
  };

  const addStore = (storeName: string) => {
    const newStores = [...stores, storeName];
    saveStores(newStores);
  };

  const deleteStore = (storeName: string) => {
    const newStores = stores.filter(s => s !== storeName);
    saveStores(newStores);
  };

  const clearAll = () => {
    localStorage.removeItem('stores');
    setStores(DEFAULT_STORES);
  };

  return {
    stores,
    addStore,
    deleteStore,
    clearAll,
  };
}

