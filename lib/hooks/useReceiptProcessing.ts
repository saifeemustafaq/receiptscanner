'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExtractedData, QueueItem } from '@/lib/types';

async function postProcessReceipt(file: File): Promise<ExtractedData> {
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
  return result.data;
}

export function useReceiptProcessing() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billingDate, setBillingDate] = useState('');

  const [receiptQueue, setReceiptQueue] = useState<QueueItem[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);

  const processSingle = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setExtractedData(null);

    try {
      const data = await postProcessReceipt(file);
      setExtractedData(data);
      if (data.receiptDate) {
        setBillingDate(data.receiptDate);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred while processing the receipt';
      setError(message);
      console.error('Error processing receipt:', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const processInQueue = useCallback(async (file: File, queueIndex: number) => {
    setReceiptQueue(prev => {
      const updated = [...prev];
      updated[queueIndex] = { ...updated[queueIndex], status: 'processing' };
      return updated;
    });

    try {
      const data = await postProcessReceipt(file);

      setReceiptQueue(prev => {
        const updated = [...prev];
        updated[queueIndex] = { ...updated[queueIndex], status: 'ready', data };
        return updated;
      });

      if (queueIndex === currentQueueIndex) {
        setExtractedData(data);
        if (data.receiptDate) {
          setBillingDate(data.receiptDate);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process receipt';
      console.error(`Error processing receipt ${queueIndex + 1}:`, err);

      setReceiptQueue(prev => {
        const updated = [...prev];
        updated[queueIndex] = { ...updated[queueIndex], status: 'error', error: message };
        return updated;
      });

      if (queueIndex === currentQueueIndex) {
        setError(message);
      }
    }
  }, [currentQueueIndex]);

  useEffect(() => {
    if (selectedFile && !isProcessingQueue) {
      processSingle(selectedFile);
    }
  }, [selectedFile, isProcessingQueue, processSingle]);

  useEffect(() => {
    if (isProcessingQueue && receiptQueue.length > 0) {
      receiptQueue.forEach((item, index) => {
        if (item.status === 'pending') {
          processInQueue(item.file, index);
        }
      });
    }
  }, [isProcessingQueue, receiptQueue, processInQueue]);

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

  const handleReceiptSelect = useCallback((files: File[]) => {
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
      const queueItems: QueueItem[] = files.map(file => ({ file, status: 'pending' }));
      setReceiptQueue(queueItems);
      setCurrentQueueIndex(0);
      setIsProcessingQueue(true);
      setSelectedFile(files[0]);
    }
  }, []);

  const advanceQueue = useCallback(() => {
    setExtractedData(null);
    setBillingDate('');
    setError(null);
    setCurrentQueueIndex(prev => prev + 1);
  }, []);

  const resetAll = useCallback(() => {
    setSelectedFile(null);
    setExtractedData(null);
    setBillingDate('');
    setError(null);
    setReceiptQueue([]);
    setCurrentQueueIndex(0);
    setIsProcessingQueue(false);
  }, []);

  return {
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
  };
}
