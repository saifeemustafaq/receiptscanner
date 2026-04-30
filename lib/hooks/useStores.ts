'use client';

import { DEFAULT_STORES } from '@/lib/constants';
import { useStringListResource } from './useStringListResource';

export function useStores() {
  const { items: stores, isLoading, add: addStore, remove: deleteStore, clearAll, reload } =
    useStringListResource({
      endpoint: '/api/stores',
      itemKey: 'store',
      listKey: 'stores',
      defaults: DEFAULT_STORES,
    });

  return { stores, isLoading, addStore, deleteStore, clearAll, reload };
}
