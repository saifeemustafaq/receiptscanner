'use client';

import Settings from '../components/Settings';
import { useStores } from '@/lib/hooks/useStores';
import { useUnits } from '@/lib/hooks/useUnits';

export default function SettingsPage() {
  const { stores, addStore, deleteStore, clearAll: clearStores } = useStores();
  const { units, addUnit, deleteUnit, clearAll: clearUnits } = useUnits();

  const handleClearAll = () => {
    clearStores();
    clearUnits();
    alert('All settings cleared');
  };

  return (
    <Settings
      stores={stores}
      onAddStore={addStore}
      onDeleteStore={deleteStore}
      units={units}
      onAddUnit={addUnit}
      onDeleteUnit={deleteUnit}
      onClearAllData={handleClearAll}
    />
  );
}

