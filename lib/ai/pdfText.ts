import { extractText, getDocumentProxy } from 'unpdf';

/**
 * Text-layer classification thresholds and PDF safety limits.
 * Co-located here as the single consumer (DEVELOPER_GUIDE.md §7, §18).
 */
const MIN_CHARS_PER_PAGE = 100; // digital receipts have hundreds/page; photo-only PDFs ~0
const MIN_TOTAL_CHARS = 200; // guard against near-empty extractions
const MAX_GARBLED_RATIO = 0.1; // >10% replacement/control chars => text layer unusable
const MAX_PDF_PAGES = 20; // receipts are 1-3 pages; beyond this, fall back to vision
const PDF_EXTRACT_TIMEOUT_MS = 15_000; // serverless build runs on the event loop; bound it
const MAX_PDF_IMAGE_SIZE = 16_777_216; // ~16 MP cap so one declared image can't allocate GBs

export interface PdfTextResult {
  /** Extracted text with per-page markers, or '' when there is no usable text layer. */
  text: string;
  pageCount: number;
  charCount: number;
  /** True when the PDF has a usable, non-garbled text layer worth sending to the LLM. */
  hasTextLayer: boolean;
  /** 0-1 heuristic confidence in the text layer (informational; for logs/metadata). */
  confidence: number;
}

const EMPTY_RESULT: PdfTextResult = {
  text: '',
  pageCount: 0,
  charCount: 0,
  hasTextLayer: false,
  confidence: 0,
};

/**
 * Reject a promise if it does not settle within `ms`. The unpdf serverless build
 * parses on the event loop (no worker thread), so extraction must be bounded.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`PDF text extraction timed out after ${ms}ms`)),
      ms
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Ratio of replacement (U+FFFD) and non-whitespace control characters in the
 * text. A high ratio signals a broken/garbled text layer (e.g. bad font
 * encoding), which should be treated as no usable text.
 */
function garbledRatio(text: string): number {
  if (!text) return 1;
  let bad = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const isReplacement = code === 0xfffd;
    const isControl =
      (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) ||
      (code >= 0x7f && code <= 0x9f);
    if (isReplacement || isControl) bad++;
  }
  return bad / text.length;
}

/**
 * Extract and classify the text layer of a PDF.
 *
 * Text-first extraction: when a PDF carries a real (digital) text layer we can
 * send its text to the LLM instead of uploading page images — cheaper, faster,
 * and free of OCR misreads. Image-only PDFs (e.g. a photographed receipt saved
 * as a PDF) and scans return `hasTextLayer: false` so the caller falls back to
 * the vision path.
 *
 * Never throws: any parse error or timeout resolves to a no-text-layer result
 * so the extraction pipeline degrades gracefully to vision.
 */
export async function extractPdfText(file: File): Promise<PdfTextResult> {
  try {
    const buffer = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buffer, {
      maxImageSize: MAX_PDF_IMAGE_SIZE,
    });

    try {
      const pageCount = pdf.numPages;
      if (pageCount < 1 || pageCount > MAX_PDF_PAGES) {
        return { ...EMPTY_RESULT, pageCount };
      }

      const { text: pages } = await withTimeout(
        extractText(pdf, { mergePages: false }),
        PDF_EXTRACT_TIMEOUT_MS
      );

      // Join pages with explicit markers so the model can reason about page
      // boundaries (these receipts often list totals out of reading order).
      const text = pages
        .map((pageText, i) => `=== Page ${i + 1} ===\n${pageText.trim()}`)
        .join('\n\n');

      const charCount = pages.reduce((sum, p) => sum + p.trim().length, 0);
      const charsPerPage = charCount / pageCount;
      const garbled = garbledRatio(text);

      const hasTextLayer =
        charsPerPage >= MIN_CHARS_PER_PAGE &&
        charCount >= MIN_TOTAL_CHARS &&
        garbled <= MAX_GARBLED_RATIO;

      const confidence = hasTextLayer
        ? Math.max(
            0,
            Math.min(1, charsPerPage / (MIN_CHARS_PER_PAGE * 3)) * (1 - garbled)
          )
        : 0;

      return {
        text: hasTextLayer ? text : '',
        pageCount,
        charCount,
        hasTextLayer,
        confidence,
      };
    } finally {
      // Release PDF.js cached resources (important on serverless). Never let a
      // cleanup failure discard a successful extraction.
      try {
        await pdf.cleanup();
      } catch {
        // ignore cleanup errors
      }
    }
  } catch (error) {
    console.error('PDF text extraction failed; falling back to vision:', error);
    return EMPTY_RESULT;
  }
}
