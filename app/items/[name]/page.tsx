'use client';

import { useParams, useRouter } from 'next/navigation';
import ItemDetail from '../../components/ItemDetail';
import { getItemByName } from '@/lib/itemsProcessor';
import { useReceipts } from '@/lib/hooks/useReceipts';

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { receipts, loading, loadReceipts } = useReceipts();
  
  // Decode the URL-encoded item name
  const itemName = decodeURIComponent(params.name as string);
  const item = getItemByName(receipts, itemName);

  const handleBack = () => {
    router.push('/items');
  };

  const handleItemRename = async (oldName: string, newName: string) => {
    try {
      const oldNameLower = oldName.toLowerCase().trim();
      const updatedReceipts = receipts.map(receipt => {
        const hasMatchingItem = receipt.extractedData.items.some(
          item => item.name.toLowerCase().trim() === oldNameLower
        );

        if (!hasMatchingItem) return receipt;

        const updatedItems = receipt.extractedData.items.map(item => {
          if (item.name.toLowerCase().trim() === oldNameLower) {
            return { ...item, name: newName };
          }
          return item;
        });

        return {
          ...receipt,
          extractedData: {
            ...receipt.extractedData,
            items: updatedItems
          }
        };
      });

      for (const receipt of updatedReceipts) {
        const originalReceipt = receipts.find(r => r.id === receipt.id);
        if (originalReceipt && JSON.stringify(originalReceipt) !== JSON.stringify(receipt)) {
          await fetch('/api/receipts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              id: receipt.id, 
              updates: { extractedData: receipt.extractedData } 
            }),
          });
        }
      }

      await loadReceipts();

      // Navigate to the new item name
      const encodedNewName = encodeURIComponent(newName);
      router.push(`/items/${encodedNewName}`);

      alert(`Item renamed successfully! ${oldName} → ${newName}`);
    } catch (error) {
      console.error('Error renaming item:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p style={{ color: 'var(--black-secondary)' }}>Loading item...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <h2 style={{ color: 'var(--black-text)', marginBottom: '16px' }}>Item Not Found</h2>
        <p style={{ color: 'var(--black-secondary)', marginBottom: '24px' }}>
          The item "{itemName}" could not be found.
        </p>
        <button onClick={handleBack} className="btn-secondary">
          Back to Items
        </button>
      </div>
    );
  }

  return (
    <ItemDetail 
      item={item} 
      onBack={handleBack}
      onItemRename={handleItemRename}
    />
  );
}

