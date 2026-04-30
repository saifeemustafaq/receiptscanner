'use client';

import { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import ReceiptUpload from './components/ReceiptUpload';
import StoreSelection from './components/StoreSelection';
import StoreSuggestionBanner from './components/StoreSuggestionBanner';
import DatePicker from './components/DatePicker';
import ExtractedDataDisplay from './components/ExtractedDataDisplay';
import Button from './components/Button';
import Card from './components/Card';
import { getAllItemNames } from '@/lib/itemsProcessor';
import { useReceipts } from '@/lib/hooks/useReceipts';
import { useStores } from '@/lib/hooks/useStores';
import { useUnits } from '@/lib/hooks/useUnits';
import { useReceiptProcessing } from '@/lib/hooks/useReceiptProcessing';
import { findClosestStore, StoreMatchResult } from '@/lib/storeMatching';
import { SavedReceipt, ReceiptItem } from '@/lib/types';
import { TIMEZONE } from '@/lib/constants';

export default function Home() {
  const [selectedStore, setSelectedStore] = useState('');
  const [uploadKey, setUploadKey] = useState(0);
  const [existingItemNames, setExistingItemNames] = useState<string[]>([]);
  const [storeMatch, setStoreMatch] = useState<StoreMatchResult | null>(null);
  const [storeBannerDismissed, setStoreBannerDismissed] = useState(false);

  const { receipts, saveReceipt } = useReceipts();
  const { stores, addStore: handleAddStore } = useStores();
  const { units } = useUnits();

  const {
    selectedFile,
    extractedData,
    setExtractedData,
    isProcessing,
    error,
    billingDate,
    setBillingDate,
    receiptQueue,
    currentQueueIndex,
    isProcessingQueue,
    handleReceiptSelect,
    advanceQueue,
    resetAll,
  } = useReceiptProcessing();

  useEffect(() => {
    if (receipts.length > 0) {
      setExistingItemNames(getAllItemNames(receipts));
    }
  }, [receipts]);

  useEffect(() => {
    if (extractedData?.storeNameScanned && stores.length > 0) {
      const result = findClosestStore(extractedData.storeNameScanned, stores);
      setStoreMatch(result);
      setStoreBannerDismissed(false);
      if (result.confidence !== 'none') {
        setSelectedStore(result.match);
      }
    } else {
      setStoreMatch(null);
    }
  }, [extractedData, stores]);

  const handleSaveReceipt = async () => {
    if (!extractedData || !selectedStore) {
      toast.error('Please select a store and process a receipt first');
      return;
    }

    if (!billingDate) {
      toast.error('Please enter the receipt date');
      return;
    }

    const now = new Date();
    const pacificTimeString = now.toLocaleString('en-US', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const [month, day, year] = pacificTimeString.split(/[/, ]/);
    const uploadDate = `${year}-${month}-${day}`;

    const newReceipt: SavedReceipt = {
      id: crypto.randomUUID(),
      storeNameScanned: extractedData.storeNameScanned || 'Unknown',
      storeNameSelected: selectedStore,
      billingDate,
      uploadDate,
      extractedData,
      timestamp: new Date().toISOString(),
    };

    const result = await saveReceipt(newReceipt);

    if (result.success) {
      if (isProcessingQueue && receiptQueue.length > 0) {
        const nextIndex = currentQueueIndex + 1;

        if (nextIndex < receiptQueue.length) {
          const nextItem = receiptQueue[nextIndex];

          if (nextItem.status === 'ready') {
            toast.success(`Receipt ${currentQueueIndex + 1} of ${receiptQueue.length} saved! Moving to next receipt...`);
          } else if (nextItem.status === 'processing') {
            toast.info(`Receipt ${currentQueueIndex + 1} of ${receiptQueue.length} saved! Next receipt is still processing, please wait...`);
          } else if (nextItem.status === 'error') {
            toast.warning(`Receipt ${currentQueueIndex + 1} of ${receiptQueue.length} saved! Note: Next receipt had an error.`);
          }

          setSelectedStore('');
          advanceQueue();
        } else {
          const successCount = receiptQueue.filter(item => item.status === 'ready').length;
          const errorCount = receiptQueue.filter(item => item.status === 'error').length;

          if (errorCount > 0) {
            toast.warning(`Queue complete! ${successCount} receipts saved successfully. ${errorCount} failed.`);
          } else {
            toast.success(`All ${receiptQueue.length} receipts saved successfully!`);
          }
          resetForm();
        }
      } else {
        toast.success('Receipt saved successfully!');
        resetForm();
      }
    } else {
      toast.error('Failed to save receipt: ' + result.error);
    }
  };

  const resetForm = () => {
    setSelectedStore('');
    setUploadKey(prev => prev + 1);
    setStoreMatch(null);
    setStoreBannerDismissed(false);
    resetAll();
  };

  const handleItemChange = (index: number, updatedItem: ReceiptItem) => {
    if (!extractedData) return;

    const updatedItems = [...extractedData.items];
    updatedItems[index] = updatedItem;

    setExtractedData({
      ...extractedData,
      items: updatedItems,
    });
  };

  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Receipt Scanner</h1>
        <p className="page-subtitle">
          Scan, extract, and organize your receipts
        </p>
      </header>

      <div className="content-section">
        <ReceiptUpload
          key={uploadKey}
          onReceiptSelect={handleReceiptSelect}
          selectedFile={selectedFile}
          queueInfo={isProcessingQueue && receiptQueue.length > 1 ? {
            current: currentQueueIndex + 1,
            total: receiptQueue.length,
            statuses: receiptQueue.map(item => item.status),
          } : null}
        />

        {selectedFile && (
          <Card>
            <h2 className="card-title">Receipt Details</h2>

            <div className="grid-2" style={{ marginBottom: '24px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: 'var(--black-text)',
                }}>
                  Store
                </label>
                {storeMatch && !storeBannerDismissed && extractedData?.storeNameScanned && (
                  <StoreSuggestionBanner
                    scannedName={extractedData.storeNameScanned}
                    matchedStore={storeMatch.match}
                    confidence={storeMatch.confidence}
                    onUseExisting={() => {
                      setSelectedStore(storeMatch.match);
                      setStoreBannerDismissed(true);
                    }}
                    onAddNew={async (name) => {
                      await handleAddStore(name);
                      setSelectedStore(name);
                      setStoreBannerDismissed(true);
                    }}
                    onDismiss={() => setStoreBannerDismissed(true)}
                  />
                )}
                <StoreSelection
                  selectedStore={selectedStore}
                  onStoreChange={setSelectedStore}
                  stores={stores}
                  onAddStore={handleAddStore}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: 'var(--black-text)',
                }}>
                  Receipt Date
                </label>
                <DatePicker
                  selectedDate={billingDate}
                  onDateChange={setBillingDate}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <ExtractedDataDisplay
                data={extractedData}
                isProcessing={isProcessing}
                error={error}
                existingItemNames={existingItemNames}
                units={units}
                onItemChange={handleItemChange}
              />
            </div>

            {extractedData && !isProcessing && !error && (
              <div className="flex flex-wrap gap-base justify-center">
                <Button
                  variant="success"
                  onClick={handleSaveReceipt}
                  disabled={!selectedStore || !billingDate}
                >
                  <Save size={20} />
                  Save Receipt
                </Button>
                <Button
                  variant="secondary"
                  onClick={resetForm}
                >
                  <RotateCcw size={20} />
                  Reset
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
