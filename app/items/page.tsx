'use client';

import ItemsList from '../components/ItemsList';
import { processItemsFromReceipts } from '@/lib/itemsProcessor';
import { useReceipts } from '@/lib/hooks/useReceipts';
import { useRouter } from 'next/navigation';

export default function ItemsPage() {
  const { receipts, loading } = useReceipts();
  const router = useRouter();
  const items = processItemsFromReceipts(receipts);

  const handleItemClick = (itemName: string) => {
    // URL encode the item name for safe routing
    const encodedName = encodeURIComponent(itemName);
    router.push(`/items/${encodedName}`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p style={{ color: 'var(--black-secondary)' }}>Loading items...</p>
      </div>
    );
  }

  return <ItemsList items={items} onItemClick={handleItemClick} />;
}

