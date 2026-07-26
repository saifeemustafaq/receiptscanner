import type { AIProvider } from '@/lib/settingsStorage';
import type { ReceiptItem, ExtractedData } from '@/lib/types';

// Re-export the canonical receipt shapes so existing `./types` imports in the
// AI layer keep working. Source of truth lives in `@/lib/types`.
export type { ReceiptItem, ExtractedData };

/**
 * How a receipt was read: `text` = the PDF's extracted text layer was sent to
 * the model; `vision` = the file (image or PDF pages) was uploaded for OCR.
 */
export type ExtractionMode = 'text' | 'vision';

/**
 * Resolved content a provider sends to the model. The orchestrator picks the
 * variant: `text` for PDFs with a usable text layer, `file` otherwise (and
 * always for images). A discriminated union prevents an ambiguous
 * "both file and text" input.
 */
export type ExtractionSource =
  | { kind: 'file'; file: File }
  | { kind: 'text'; text: string };

/**
 * Input passed to the extraction orchestrator (`extractReceipt`).
 */
export interface ProcessInput {
  file: File;
  isPDF: boolean;
}

/**
 * Normalized result returned by every provider.
 */
export interface ProviderResult {
  data: ExtractedData;
  modelUsed: string;
  mode: ExtractionMode;
}

export type { AIProvider };

/**
 * Error thrown when a provider's API key is not configured.
 * Allows the route to return a clear message naming the required env var.
 */
export class MissingApiKeyError extends Error {
  envVar: string;

  constructor(envVar: string, providerLabel: string) {
    super(`${providerLabel} API key not configured. Add ${envVar} to .env.local`);
    this.name = 'MissingApiKeyError';
    this.envVar = envVar;
  }
}
