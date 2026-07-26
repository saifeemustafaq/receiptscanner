'use client';

import { useMemo } from 'react';
import ItemsList from '../components/ItemsList';
import { processItemsFromReceipts } from '@/lib/itemsProcessor';
import { applyItemMappings } from '@/lib/itemMappings';
import { useReceipts } from '@/lib/hooks/useReceipts';
import { useMappings } from '@/lib/hooks/useMappings';
import { useRouter } from 'next/navigation';

export default function ItemsPage() {
  const { receipts, isLoading } = useReceipts();
  const { mappings, isLoading: mappingsLoading } = useMappings();
  const router = useRouter();

  const items = useMemo(
    () => processItemsFromReceipts(applyItemMappings(receipts, mappings)),
    [receipts, mappings]
  );

  const handleItemClick = (itemName: string) => {
    // URL encode the item name for safe routing
    const encodedName = encodeURIComponent(itemName);
    router.push(`/items/${encodedName}`);
  };

  if (isLoading || mappingsLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p style={{ color: 'var(--black-secondary)' }}>Loading items...</p>
      </div>
    );
  }

  return <ItemsList items={items} onItemClick={handleItemClick} />;
}
