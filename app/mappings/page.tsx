'use client';

import ItemMappingsManager from '../components/ItemMappingsManager';
import { useMappings } from '@/lib/hooks/useMappings';
import { useReceipts } from '@/lib/hooks/useReceipts';

export default function MappingsPage() {
  const { mappings, addMapping, applyMappings, deleteMapping } = useMappings();
  const { receipts } = useReceipts();

  return (
    <div>
      <header className="page-header">
        <h1 className="page-title">Mappings</h1>
        <p className="page-subtitle">
          Link cryptic or differently-named scanned items to one canonical item
        </p>
      </header>

      <div className="content-section">
        <ItemMappingsManager
          mappings={mappings}
          receipts={receipts}
          onAddMapping={addMapping}
          onDeleteMapping={deleteMapping}
          onApplyMappings={applyMappings}
        />
      </div>
    </div>
  );
}
