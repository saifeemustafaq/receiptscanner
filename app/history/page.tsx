'use client';

import ReceiptHistory from '../components/ReceiptHistory';
import { SavedReceipt } from '@/lib/types';
import { useReceipts } from '@/lib/hooks/useReceipts';
import { useStores } from '@/lib/hooks/useStores';
import { useUnits } from '@/lib/hooks/useUnits';

export default function HistoryPage() {
  const { receipts, isLoading, deleteReceipt, updateReceipt, exportReceipts } = useReceipts();
  const { stores } = useStores();
  const { units } = useUnits();

  const handleDelete = async (id: string) => {
    const result = await deleteReceipt(id);
    if (!result.success) {
      alert('Failed to delete receipt: ' + result.error);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<SavedReceipt>) => {
    const result = await updateReceipt(id, updates);
    if (!result.success) {
      alert('Failed to update receipt: ' + result.error);
    }
  };

  const handleExport = async () => {
    const result = await exportReceipts();
    if (!result.success) {
      alert(result.error || 'Failed to export receipts');
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <p style={{ color: 'var(--black-secondary)' }}>Loading receipts...</p>
      </div>
    );
  }

  return (
    <ReceiptHistory
      receipts={receipts}
      stores={stores}
      units={units}
      onDelete={handleDelete}
      onUpdate={handleUpdate}
      onExport={handleExport}
    />
  );
}

