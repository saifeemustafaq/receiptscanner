'use client';

import { useState, useEffect } from 'react';
import { Save, RotateCcw } from 'lucide-react';
import ReceiptUpload from './components/ReceiptUpload';
import StoreSelection from './components/StoreSelection';
import DatePicker from './components/DatePicker';
import ExtractedDataDisplay from './components/ExtractedDataDisplay';
import Button from './components/Button';
import Card from './components/Card';
import { getAllItemNames } from '@/lib/itemsProcessor';
import { applyItemMappings } from '@/lib/itemMappings';
import { useReceipts } from '@/lib/hooks/useReceipts';
import { useStores } from '@/lib/hooks/useStores';
import { useUnits } from '@/lib/hooks/useUnits';
import { useMappings } from '@/lib/hooks/useMappings';
import { SavedReceipt, QueueItem, ExtractedData, ReceiptItem } from '@/lib/types';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedStore, setSelectedStore] = useState('');
  const [billingDate, setBillingDate] = useState('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [existingItemNames, setExistingItemNames] = useState<string[]>([]);
  
  // Multi-receipt queue state
  const [receiptQueue, setReceiptQueue] = useState<QueueItem[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  // Use custom hooks
  const { receipts, loadReceipts } = useReceipts();
  const { stores, addStore: handleAddStore } = useStores();
  const { units } = useUnits();
  const { mappings, addMapping, deleteMapping } = useMappings();

  // Update existing item names when receipts or mappings change. Names are
  // derived from mapping-resolved receipts so autocomplete and mapping targets
  // suggest canonical names (e.g. "Ginger"), not raw scanned codes.
  useEffect(() => {
    if (receipts.length > 0) {
      setExistingItemNames(getAllItemNames(applyItemMappings(receipts, mappings)));
    }
  }, [receipts, mappings]);

  // Process receipt when file is selected (single mode only). Intentionally
  // triggers only on a new file selection.
  useEffect(() => {
    if (selectedFile && !isProcessingQueue) {
      processReceipt(selectedFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile]);

  // Handle parallel receipt queue processing. Runs when the queue or its
  // processing flag changes; `processReceiptInQueue` is intentionally omitted.
  useEffect(() => {
    if (isProcessingQueue && receiptQueue.length > 0) {
      receiptQueue.forEach((item, index) => {
        if (item.status === 'pending') {
          processReceiptInQueue(item.file, index);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessingQueue, receiptQueue]);

  // Load data from queue when moving to next receipt
  useEffect(() => {
    if (isProcessingQueue && receiptQueue.length > 0 && currentQueueIndex < receiptQueue.length) {
      const currentItem = receiptQueue[currentQueueIndex];
      
      if (currentItem.status === 'ready' && currentItem.data) {
        setExtractedData(currentItem.data);
        setSelectedFile(currentItem.file);
        if (currentItem.data.receiptDate) {
          setBillingDate(currentItem.data.receiptDate);
        }
      } else if (currentItem.status === 'error') {
        setError(currentItem.error || 'Failed to process receipt');
        setSelectedFile(currentItem.file);
      }
    }
  }, [currentQueueIndex, receiptQueue, isProcessingQueue]);

  const processReceipt = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setExtractedData(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/process-receipt', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process receipt');
      }

      const result = await response.json();
      setExtractedData(result.data);
      
      if (result.data.receiptDate) {
        setBillingDate(result.data.receiptDate);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred while processing the receipt';
      setError(message);
      console.error('Error processing receipt:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const processReceiptInQueue = async (file: File, queueIndex: number) => {
    setReceiptQueue(prev => {
      const updated = [...prev];
      updated[queueIndex] = { ...updated[queueIndex], status: 'processing' };
      return updated;
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/process-receipt', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process receipt');
      }

      const result = await response.json();
      
      setReceiptQueue(prev => {
        const updated = [...prev];
        updated[queueIndex] = {
          ...updated[queueIndex],
          status: 'ready',
          data: result.data
        };
        return updated;
      });

      if (queueIndex === currentQueueIndex) {
        setExtractedData(result.data);
        if (result.data.receiptDate) {
          setBillingDate(result.data.receiptDate);
        }
      }
    } catch (err) {
      console.error(`Error processing receipt ${queueIndex + 1}:`, err);
      const message = err instanceof Error ? err.message : 'Failed to process receipt';

      setReceiptQueue(prev => {
        const updated = [...prev];
        updated[queueIndex] = {
          ...updated[queueIndex],
          status: 'error',
          error: message
        };
        return updated;
      });

      if (queueIndex === currentQueueIndex) {
        setError(message);
      }
    }
  };

  const handleSaveReceipt = async () => {
    if (!extractedData || !selectedStore) {
      alert('Please select a store and process a receipt first');
      return;
    }

    if (!billingDate) {
      alert('Please enter the receipt date');
      return;
    }

    const now = new Date();
    const pacificTimeString = now.toLocaleString('en-US', { 
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const [month, day, year] = pacificTimeString.split(/[/, ]/);
    const uploadDate = `${year}-${month}-${day}`;

    const newReceipt: SavedReceipt = {
      id: Date.now().toString(),
      storeNameScanned: extractedData.storeNameScanned || 'Unknown',
      storeNameSelected: selectedStore,
      billingDate: billingDate,
      uploadDate: uploadDate,
      extractedData,
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReceipt),
      });

      const result = await response.json();

      if (result.success) {
        await loadReceipts();
        
        if (isProcessingQueue && receiptQueue.length > 0) {
          const nextIndex = currentQueueIndex + 1;
          
          if (nextIndex < receiptQueue.length) {
            const nextItem = receiptQueue[nextIndex];
            
            if (nextItem.status === 'ready') {
              alert(`Receipt ${currentQueueIndex + 1} of ${receiptQueue.length} saved! Moving to next receipt...`);
            } else if (nextItem.status === 'processing') {
              alert(`Receipt ${currentQueueIndex + 1} of ${receiptQueue.length} saved! Next receipt is still processing, please wait...`);
            } else if (nextItem.status === 'error') {
              alert(`Receipt ${currentQueueIndex + 1} of ${receiptQueue.length} saved! Note: Next receipt had an error.`);
            }
            
            setExtractedData(null);
            setSelectedStore('');
            setBillingDate('');
            setError(null);
            setCurrentQueueIndex(nextIndex);
          } else {
            const successCount = receiptQueue.filter(item => item.status === 'ready').length;
            const errorCount = receiptQueue.filter(item => item.status === 'error').length;
            
            if (errorCount > 0) {
              alert(`Queue complete! ${successCount} receipts saved successfully. ${errorCount} failed.`);
            } else {
              alert(`All ${receiptQueue.length} receipts saved successfully!`);
            }
            resetForm();
          }
        } else {
          alert('Receipt saved successfully!');
          resetForm();
        }
      } else {
        alert('Failed to save receipt: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert('Failed to save receipt');
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setExtractedData(null);
    setSelectedStore('');
    setBillingDate('');
    setError(null);
    setUploadKey(prev => prev + 1);
    setReceiptQueue([]);
    setCurrentQueueIndex(0);
    setIsProcessingQueue(false);
  };

  const handleReceiptSelect = (files: File[]) => {
    if (files.length === 0) {
      setSelectedFile(null);
      setReceiptQueue([]);
      setIsProcessingQueue(false);
      return;
    }

    if (files.length === 1) {
      setSelectedFile(files[0]);
      setReceiptQueue([]);
      setIsProcessingQueue(false);
    } else {
      const queueItems: QueueItem[] = files.map(file => ({
        file,
        status: 'pending',
      }));
      
      setReceiptQueue(queueItems);
      setCurrentQueueIndex(0);
      setIsProcessingQueue(true);
      setSelectedFile(files[0]);
    }
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
            statuses: receiptQueue.map(item => item.status)
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
                  color: 'var(--black-text)'
                }}>
                  Store
                </label>
                <StoreSelection
                  selectedStore={selectedStore}
                  onStoreChange={setSelectedStore}
                  stores={stores}
                  onAddStore={handleAddStore}
                  detectedStore={extractedData?.storeNameScanned || ''}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  color: 'var(--black-text)'
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
                mappings={mappings}
                onItemChange={handleItemChange}
                onMapItem={addMapping}
                onUnmapItem={deleteMapping}
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
