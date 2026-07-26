/**
 * A single line item extracted from a receipt.
 * `unitPrice` and `unit` are nullable because AI providers emit `null` for
 * values that are absent or not applicable (e.g. packaged items have no unit).
 */
export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice?: number | null;
  totalPrice: number;
  unit?: string | null;
}

/**
 * A named non-item charge printed on the receipt — service fee, delivery fee,
 * tip/gratuity, bag fee, bottle deposit/CRV, etc. Kept separate from line items
 * and tax so the totals breakdown can show exactly what was charged and why the
 * grand total exceeds the item subtotal.
 */
export interface AdditionalCharge {
  label: string;   // as printed, e.g. "Service Fee", "Delivery"
  amount: number;
}

/**
 * The structured payload an AI provider returns for one receipt.
 * Canonical definition — imported by the AI layer, the API, and UI components.
 */
export interface ExtractedData {
  items: ReceiptItem[];
  total: number;
  storeNameScanned?: string | null;
  receiptDate?: string | null; // Date extracted from receipt (YYYY-MM-DD)
  subtotal?: number | null;    // Pre-tax subtotal as printed (for reconciliation)
  tax?: number | null;         // Tax as printed (for reconciliation)
  additionalCharges?: AdditionalCharge[] | null; // service/delivery/bag fees, deposits, tips
}

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

/**
 * Shared result shape returned by client-hook mutations (§15/§21).
 * Callers branch on `success` and surface `error` to the user.
 */
export interface MutationResult {
  success: boolean;
  error?: string;
}

