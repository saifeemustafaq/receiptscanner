'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_UNITS } from '@/lib/defaults';
import type { MutationResult } from '@/lib/types';

export function useUnits() {
  const [units, setUnits] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUnits();
    // Discover units from receipts after loading initial units
    const timer = setTimeout(() => {
      discoverUnitsFromReceipts();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const loadUnits = async () => {
    try {
      if (typeof window === 'undefined') return;
      
      const response = await fetch('/api/units');
      const data = await response.json();
      
      if (data.success && Array.isArray(data.units)) {
        setUnits(data.units);
      } else {
        setUnits(DEFAULT_UNITS);
      }
    } catch (error) {
      console.error('Error loading units:', error);
      setUnits(DEFAULT_UNITS);
    } finally {
      setIsLoading(false);
    }
  };

  const discoverUnitsFromReceipts = async () => {
    try {
      if (typeof window === 'undefined') return;
      
      const response = await fetch('/api/units?action=discover');
      const data = await response.json();
      
      if (data.success && Array.isArray(data.units)) {
        setUnits(data.units);
      }
    } catch (error) {
      console.error('Error discovering units from receipts:', error);
    }
  };

  const addUnit = async (unit: string): Promise<MutationResult> => {
    const trimmed = unit.trim().toLowerCase();
    if (!trimmed) return { success: false, error: 'Unit cannot be empty' };
    
    // Check if unit already exists locally
    if (units.includes(trimmed)) {
      return { success: false, error: 'This unit already exists' };
    }
    
    try {
      const response = await fetch('/api/units', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ unit: trimmed }),
      });
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.units)) {
        setUnits(data.units);
        return { success: true };
      }
      console.error('Failed to add unit:', data.error);
      return { success: false, error: data.error || 'Failed to add unit' };
    } catch (error) {
      console.error('Error adding unit:', error);
      return { success: false, error: 'Failed to add unit' };
    }
  };

  const deleteUnit = async (unit: string): Promise<MutationResult> => {
    try {
      const response = await fetch(`/api/units?unit=${encodeURIComponent(unit)}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.units)) {
        setUnits(data.units);
        return { success: true };
      }
      console.error('Failed to delete unit:', data.error);
      return { success: false, error: data.error || 'Failed to delete unit' };
    } catch (error) {
      console.error('Error deleting unit:', error);
      return { success: false, error: 'Failed to delete unit' };
    }
  };

  const clearAll = async (): Promise<MutationResult> => {
    try {
      // Reset to default units by saving them
      const response = await fetch('/api/units', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ units: DEFAULT_UNITS }),
      });
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.units)) {
        setUnits(data.units);
        return { success: true };
      }
      console.error('Failed to clear units:', data.error);
      return { success: false, error: data.error || 'Failed to clear units' };
    } catch (error) {
      console.error('Error clearing units:', error);
      setUnits(DEFAULT_UNITS);
      return { success: false, error: 'Failed to clear units' };
    }
  };

  return {
    units,
    isLoading,
    addUnit,
    deleteUnit,
    clearAll,
    discoverUnitsFromReceipts,
    reload: loadUnits,
  };
}

