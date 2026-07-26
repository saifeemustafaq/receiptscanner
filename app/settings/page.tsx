'use client';

import Settings from '../components/Settings';
import { useStores } from '@/lib/hooks/useStores';
import { useUnits } from '@/lib/hooks/useUnits';
import { useSettings } from '@/lib/hooks/useSettings';

export default function SettingsPage() {
  const { stores, addStore, deleteStore, clearAll: clearStores } = useStores();
  const { units, addUnit, deleteUnit, clearAll: clearUnits } = useUnits();
  const { aiProvider, setProvider } = useSettings();

  const handleClearAll = async () => {
    const [storesResult, unitsResult] = await Promise.all([clearStores(), clearUnits()]);
    if (!storesResult.success || !unitsResult.success) {
      alert('Failed to clear some settings: ' + (storesResult.error || unitsResult.error || 'Unknown error'));
      return;
    }
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
      aiProvider={aiProvider}
      onChangeProvider={setProvider}
    />
  );
}
