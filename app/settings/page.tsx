'use client';

import Settings from '../components/Settings';
import { useStores } from '@/lib/hooks/useStores';

export default function SettingsPage() {
  const { stores, addStore, deleteStore, clearAll } = useStores();

  const handleClearAll = () => {
    clearAll();
    alert('Local store settings cleared');
  };

  return (
    <Settings
      stores={stores}
      onAddStore={addStore}
      onDeleteStore={deleteStore}
      onClearAllData={handleClearAll}
    />
  );
}

