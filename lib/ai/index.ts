import { extractWithGemini, GEMINI_MODEL } from './gemini';
import { extractWithOpenAI, OPENAI_MODEL } from './openai';
import { extractPdfText } from './pdfText';
import { ExtractionParseError } from './parseResponse';
import type {
  AIProvider,
  ExtractionSource,
  ProcessInput,
  ProviderResult,
} from './types';

export interface ProviderMeta {
  id: AIProvider;
  label: string;
  model: string;
  envVar: string;
}

/**
 * Metadata for each supported provider. Shared by the API route and UI so the
 * settings screen and "About" section stay in sync with the backend.
 */
export const PROVIDERS: Record<AIProvider, ProviderMeta> = {
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    model: GEMINI_MODEL,
    envVar: 'GEMINI_API_KEY',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    model: OPENAI_MODEL,
    envVar: 'OPENAI_API_KEY',
  },
};

/**
 * Result of the extraction orchestrator: a provider result plus optional PDF
 * telemetry surfaced in the route's response metadata.
 */
export interface ExtractionResult extends ProviderResult {
  /** Number of PDF pages parsed (present only when a PDF text layer was read). */
  pageCount?: number;
}

/**
 * Pure provider dispatcher: send an already-resolved source to the selected
 * provider. Source resolution (text vs vision) is the orchestrator's job.
 */
function runProvider(
  provider: AIProvider,
  source: ExtractionSource,
  isPDF: boolean
): Promise<ProviderResult> {
  switch (provider) {
    case 'openai':
      return extractWithOpenAI(source, isPDF);
    case 'gemini':
    default:
      return extractWithGemini(source, isPDF);
  }
}

/**
 * Orchestrate receipt extraction with a text-first strategy.
 *
 * - Images (and anything non-PDF) go straight to the vision path.
 * - PDFs are probed for a usable text layer ({@link extractPdfText}). When one
 *   exists, the extracted text is sent to the model (cheaper/faster, no OCR
 *   misreads). If that text attempt yields no items or fails to parse, we fall
 *   back once to the vision path so a bad/garbled text layer never fails a
 *   receipt that vision could have read.
 *
 * Both paths converge on `parseAndValidate()` inside the providers, so the
 * returned `ExtractedData` shape is identical regardless of mode.
 */
export async function extractReceipt(
  provider: AIProvider,
  input: ProcessInput
): Promise<ExtractionResult> {
  const { file, isPDF } = input;

  // Images always use vision.
  if (!isPDF) {
    return runProvider(provider, { kind: 'file', file }, isPDF);
  }

  // PDF: probe the text layer first. extractPdfText never throws — a failed or
  // image-only PDF resolves to hasTextLayer: false and we use vision below.
  const pdf = await extractPdfText(file);
  const pageCount = pdf.pageCount > 0 ? pdf.pageCount : undefined;

  if (pdf.hasTextLayer) {
    try {
      const result = await runProvider(provider, { kind: 'text', text: pdf.text }, isPDF);
      if (result.data.items.length > 0) {
        return { ...result, pageCount };
      }
      console.warn('⚠️ Text-mode extraction returned 0 items; falling back to vision.');
    } catch (error) {
      // Only a parse/validation failure warrants a vision retry; real infra
      // errors (missing key, network) should surface to the route unchanged.
      if (error instanceof ExtractionParseError) {
        console.warn(
          `⚠️ Text-mode extraction failed to parse (${error.message}); falling back to vision.`
        );
      } else {
        throw error;
      }
    }
  }

  // Fallback / no usable text layer: vision path.
  const result = await runProvider(provider, { kind: 'file', file }, isPDF);
  return { ...result, pageCount };
}

export type { AIProvider, ProcessInput, ProviderResult } from './types';
export { MissingApiKeyError } from './types';
