'use client';

import { useState, useEffect } from 'react';
import { SavedReceipt } from '@/lib/types';

export function useReceipts() {
  const [receipts, setReceipts] = useState<SavedReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/receipts');
      const data = await response.json();
      if (data.success) {
        setReceipts(data.receipts);
      } else {
        setError('Failed to load receipts');
      }
    } catch (error) {
      console.error('Error loading receipts:', error);
      setError('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, []);

  const deleteReceipt = async (id: string) => {
    try {
      const response = await fetch(`/api/receipts?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        await loadReceipts();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error deleting receipt:', error);
      return { success: false, error: 'Failed to delete receipt' };
    }
  };

  const updateReceipt = async (id: string, updates: any) => {
    try {
      const response = await fetch('/api/receipts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates }),
      });

      const result = await response.json();

      if (result.success) {
        await loadReceipts();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error updating receipt:', error);
      return { success: false, error: 'Failed to update receipt' };
    }
  };

  const exportReceipts = async () => {
    if (receipts.length === 0) {
      return { success: false, error: 'No receipts to export' };
    }

    try {
      const response = await fetch('/api/receipts?action=export&format=json');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipts-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      return { success: true };
    } catch (error) {
      console.error('Error exporting receipts:', error);
      return { success: false, error: 'Failed to export receipts' };
    }
  };

  return {
    receipts,
    loading,
    error,
    loadReceipts,
    deleteReceipt,
    updateReceipt,
    exportReceipts,
  };
}

