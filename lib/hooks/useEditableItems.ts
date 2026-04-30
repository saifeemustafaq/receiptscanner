'use client';

import { useState, useCallback } from 'react';
import { ReceiptItem } from '@/lib/types';

type EditingField = { index: number; field: string } | null;

interface UseEditableItemsOptions {
  onItemsChange?: (items: ReceiptItem[], changedIndex: number) => void;
}

export function useEditableItems(
  initialItems: ReceiptItem[],
  options: UseEditableItemsOptions = {}
) {
  const [editedItems, setEditedItems] = useState<ReceiptItem[]>(initialItems);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [tempValue, setTempValue] = useState<string | number>('');

  const syncItems = useCallback((items: ReceiptItem[]) => {
    setEditedItems(items);
  }, []);

  const startEditing = useCallback(
    (index: number, field: string, currentValue: string | number | undefined) => {
      setEditingField({ index, field });
      setTempValue(currentValue ?? '');
    },
    []
  );

  const cancelEditing = useCallback(() => {
    setEditingField(null);
    setTempValue('');
  }, []);

  const saveFieldEdit = useCallback(() => {
    if (!editingField) return;

    const { index, field } = editingField;
    const updatedItems = [...editedItems];

    if (field === 'unit') {
      updatedItems[index] = {
        ...updatedItems[index],
        unit: tempValue === '' || tempValue === null ? undefined : String(tempValue),
      };
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: tempValue };
    }

    const item = updatedItems[index];
    if (field === 'quantity' || field === 'unitPrice') {
      const qty = parseFloat(item.quantity?.toString() || '0');
      const price = parseFloat(item.unitPrice?.toString() || '0');
      if (!isNaN(qty) && !isNaN(price)) {
        updatedItems[index].totalPrice = qty * price;
      }
    }

    setEditedItems(updatedItems);
    options.onItemsChange?.(updatedItems, index);

    setEditingField(null);
    setTempValue('');
  }, [editingField, editedItems, tempValue, options]);

  const handleFieldKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        saveFieldEdit();
      } else if (e.key === 'Escape') {
        cancelEditing();
      }
    },
    [saveFieldEdit, cancelEditing]
  );

  const handleItemNameChange = useCallback(
    (index: number, newName: string) => {
      const updatedItems = [...editedItems];
      updatedItems[index] = { ...updatedItems[index], name: newName };
      setEditedItems(updatedItems);
      options.onItemsChange?.(updatedItems, index);
    },
    [editedItems, options]
  );

  const isEditing = useCallback(
    (index: number, field: string) =>
      editingField?.index === index && editingField?.field === field,
    [editingField]
  );

  return {
    editedItems,
    editingField,
    tempValue,
    setTempValue,
    syncItems,
    startEditing,
    cancelEditing,
    saveFieldEdit,
    handleFieldKeyDown,
    handleItemNameChange,
    isEditing,
  };
}
