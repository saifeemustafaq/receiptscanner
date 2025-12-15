'use client';

import { useState, useEffect } from 'react';

const DEFAULT_UNITS = ['g', 'kg', 'oz', 'lb', 'lbs', 'ml', 'l', 'ea', 'pcs', 'ct'];

export function useUnits() {
  const [units, setUnits] = useState<string[]>([]);

  useEffect(() => {
    loadUnits();
    // Discover units from localStorage receipts on mount
    discoverUnitsFromReceipts();
  }, []);

  const loadUnits = () => {
    const savedUnits = localStorage.getItem('units');
    if (savedUnits) {
      try {
        const parsed = JSON.parse(savedUnits);
        setUnits(parsed);
      } catch (e) {
        setUnits(DEFAULT_UNITS);
      }
    } else {
      setUnits(DEFAULT_UNITS);
    }
  };

  const saveUnits = (newUnits: string[]) => {
    setUnits(newUnits);
    localStorage.setItem('units', JSON.stringify(newUnits));
  };

  const discoverUnitsFromReceipts = async () => {
    try {
      if (typeof window === 'undefined') return;
      
      // Fetch receipts from API
      const response = await fetch('/api/receipts');
      const data = await response.json();
      
      if (!data.success || !data.receipts) return;
      
      const receipts = data.receipts;
      const discoveredUnits = new Set<string>();
      
      // Add default units
      DEFAULT_UNITS.forEach(unit => discoveredUnits.add(unit));
      
      // Discover units from all receipts
      if (Array.isArray(receipts)) {
        receipts.forEach((receipt: any) => {
          if (receipt.extractedData?.items) {
            receipt.extractedData.items.forEach((item: any) => {
              if (item.unit && item.unit.trim() !== '') {
                discoveredUnits.add(item.unit.trim().toLowerCase());
              }
            });
          }
        });
      }
      
      // Convert to array, sort, and update if new units found
      const allUnits = Array.from(discoveredUnits).sort();
      const currentUnits = units.length > 0 ? units : DEFAULT_UNITS;
      
      // Only update if there are new units
      const hasNewUnits = allUnits.some(unit => !currentUnits.includes(unit));
      if (hasNewUnits) {
        // Merge with existing units, preserving order (existing first, then new)
        const merged = [...new Set([...currentUnits, ...allUnits])].sort();
        saveUnits(merged);
      }
    } catch (error) {
      console.error('Error discovering units from receipts:', error);
    }
  };

  const addUnit = (unit: string) => {
    const trimmed = unit.trim().toLowerCase();
    if (!trimmed) return;
    
    if (units.includes(trimmed)) {
      return; // Already exists
    }
    
    const newUnits = [...units, trimmed].sort();
    saveUnits(newUnits);
  };

  const deleteUnit = (unit: string) => {
    const newUnits = units.filter(u => u !== unit);
    saveUnits(newUnits);
  };

  const clearAll = () => {
    localStorage.removeItem('units');
    setUnits(DEFAULT_UNITS);
  };

  return {
    units,
    addUnit,
    deleteUnit,
    clearAll,
    discoverUnitsFromReceipts,
  };
}

