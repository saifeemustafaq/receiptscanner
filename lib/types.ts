export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice?: number;
  totalPrice: number;
  unit?: string;
}

export interface ExtractedData {
  items: ReceiptItem[];
  total: number;
  storeNameScanned?: string;
  receiptDate?: string;
}

export interface SavedReceipt {
  id: string;
  storeNameScanned: string;
  storeNameSelected: string;
  billingDate: string;
  uploadDate: string;
  extractedData: ExtractedData;
  timestamp: string;
}

export type QueueItem = {
  file: File;
  status: 'pending' | 'processing' | 'ready' | 'error';
  data?: ExtractedData;
  error?: string;
};
