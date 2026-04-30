'use client';

import { useEffect } from 'react';
import { DEFAULT_UNITS } from '@/lib/constants';
import { useStringListResource } from './useStringListResource';

export function useUnits() {
  const { items: units, isLoading, add: addUnit, remove: deleteUnit, clearAll, reload } =
    useStringListResource({
      endpoint: '/api/units',
      itemKey: 'unit',
      listKey: 'units',
      defaults: DEFAULT_UNITS,
    });

  const discoverUnitsFromReceipts = async () => {
    try {
      if (typeof window === 'undefined') return;
      const response = await fetch('/api/units?action=discover');
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.units)) {
        reload();
      }
    } catch (error) {
      console.error('Error discovering units from receipts:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      discoverUnitsFromReceipts();
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { units, isLoading, addUnit, deleteUnit, clearAll, discoverUnitsFromReceipts, reload };
}
