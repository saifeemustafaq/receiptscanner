'use client';

import { useParams, useRouter } from 'next/navigation';
import ItemDetail from '../../components/ItemDetail';
import { SavedReceipt } from '@/lib/types';
import { getItemByName } from '@/lib/itemsProcessor';
import { applyItemMappings, normalizeItemName } from '@/lib/itemMappings';
import { useReceipts } from '@/lib/hooks/useReceipts';
import { useMappings } from '@/lib/hooks/useMappings';
import { useStores } from '@/lib/hooks/useStores';
import { useUnits } from '@/lib/hooks/useUnits';

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { receipts, isLoading, loadReceipts, updateReceipt, deleteReceipt } = useReceipts();
  const { mappings, isLoading: mappingsLoading, addMapping } = useMappings();
  const { stores } = useStores();
  const { units } = useUnits();
  
  // Decode the URL-encoded item name
  const itemName = decodeURIComponent(params.name as string);
  // Derive the item from mapping-resolved receipts so mapped raw names (e.g.
  // "AXFFDJ") fold into their canonical item. The raw `receipts` are still
  // passed to ItemDetail below so viewing/editing a linked receipt shows and
  // preserves its original scanned names.
  const item = getItemByName(applyItemMappings(receipts, mappings), itemName);

  const handleBack = () => {
    router.push('/items');
  };

  // Renaming is non-destructive: instead of rewriting every receipt, we adjust
  // the mapping layer so every raw name that currently resolves to `oldName`
  // now resolves to `newName`. This covers (a) existing mappings that target
  // the old canonical name and (b) receipt items literally named `oldName`.
  const handleItemRename = async (oldName: string, newName: string) => {
    try {
      const oldNorm = normalizeItemName(oldName);
      const newNorm = normalizeItemName(newName);

      // (a) Re-point existing mappings that target the old canonical name.
      const affected = mappings.filter(m => normalizeItemName(m.canonicalName) === oldNorm);
      for (const mapping of affected) {
        const result = await addMapping(mapping.rawName, newName);
        if (!result.success) throw new Error(result.error || 'Failed to update mapping');
      }

      // (b) Map the literal old name so unmapped items named exactly `oldName`
      // resolve to the new canonical name too. Skipped when only casing changed.
      if (oldNorm !== newNorm) {
        const result = await addMapping(oldName, newName);
        if (!result.success) throw new Error(result.error || 'Failed to create mapping');
      }

      // The redirect to the new item page is itself the success confirmation.
      const encodedNewName = encodeURIComponent(newName);
      router.push(`/items/${encodedNewName}`);
    } catch (error) {
      console.error('Error renaming item:', error);
      throw error;
    }
  };

  if (isLoading || mappingsLoading) {
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
          The item &ldquo;{itemName}&rdquo; could not be found.
        </p>
        <button onClick={handleBack} className="btn-secondary">
          Back to Items
        </button>
      </div>
    );
  }

  const handleReceiptUpdate = async (id: string, updates: Partial<SavedReceipt>) => {
    const result = await updateReceipt(id, updates);
    if (!result.success) {
      alert('Failed to update receipt: ' + result.error);
      throw new Error(result.error || 'Failed to update receipt');
    }
  };

  const handleReceiptDelete = async (id: string) => {
    const result = await deleteReceipt(id);
    if (!result.success) {
      alert('Failed to delete receipt: ' + result.error);
      throw new Error(result.error || 'Failed to delete receipt');
    }
  };

  return (
    <ItemDetail 
      item={item}
      receipts={receipts}
      stores={stores}
      units={units}
      onBack={handleBack}
      onItemRename={handleItemRename}
      onReceiptUpdate={handleReceiptUpdate}
      onReceiptDelete={handleReceiptDelete}
      onReceiptsReload={loadReceipts}
      receiptsLoading={isLoading}
    />
  );
}

