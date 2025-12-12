import { ExtractedData } from '@/app/components/ExtractedDataDisplay';

export interface SavedReceipt {
  id: string;
  storeNameScanned: string;
  storeNameSelected: string;
  billingDate: string;      // Date on the receipt
  uploadDate: string;        // Date when uploaded
  extractedData: ExtractedData;
  timestamp: string;
}

export type QueueItem = {
  file: File;
  status: 'pending' | 'processing' | 'ready' | 'error';
  data?: ExtractedData;
  error?: string;
};

