import type { ExtractedData } from './types';

/**
 * Thrown when the AI response cannot be parsed into valid extracted data.
 * Carries the raw response for debugging (surfaced by the API route).
 */
export class ExtractionParseError extends Error {
  rawResponse: string;

  constructor(message: string, rawResponse: string) {
    super(message);
    this.name = 'ExtractionParseError';
    this.rawResponse = rawResponse;
  }
}

/**
 * Parse and validate the raw text returned by an AI provider.
 * Handles markdown-fence stripping, JSON extraction, structural validation,
 * and unit-price backfill. Moved verbatim from the original route so behavior
 * is identical regardless of provider.
 */
export function parseAndValidate(responseText: string): ExtractedData {
  const text = responseText?.trim() ?? '';

  if (!text) {
    throw new ExtractionParseError('Empty response from AI provider', '');
  }

  let extractedData: any;
  try {
    let cleaned = text;

    // Remove markdown code blocks if present
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }

    cleaned = cleaned.trim();

    // Try to find JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      extractedData = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (parseError) {
    console.error('JSON Parse Error:', parseError);
    console.error('Raw response:', responseText);
    throw new ExtractionParseError(
      'AI provider returned invalid JSON format',
      text
    );
  }

  // Validate extracted data
  if (!extractedData.items || !Array.isArray(extractedData.items)) {
    throw new ExtractionParseError(
      'Invalid data structure: items array missing',
      text
    );
  }

  if (typeof extractedData.total !== 'number') {
    throw new ExtractionParseError(
      'Invalid data structure: total amount missing',
      text
    );
  }

  // Keep `unitPrice` strictly AS-PRINTED (null when the receipt printed none).
  // We deliberately do NOT backfill it from totalPrice / quantity: the review
  // screen's line-math check must validate against what the receipt actually
  // showed, and analytics derive comparisons from totalPrice via the measure
  // layer (lib/measure.ts), not from unitPrice. UI uses displayUnitPrice() to
  // show a computed value where none was printed.

  // Normalize optional subtotal/tax to a number or null (never undefined) so
  // reconciliation has a consistent shape to read.
  extractedData.subtotal = typeof extractedData.subtotal === 'number' ? extractedData.subtotal : null;
  extractedData.tax = typeof extractedData.tax === 'number' ? extractedData.tax : null;

  // Normalize additionalCharges to a clean { label, amount } array. Drop any
  // malformed entries (missing/non-numeric amount) so the UI and reconciliation
  // can trust the shape. Absent/invalid -> [] (never undefined).
  extractedData.additionalCharges = Array.isArray(extractedData.additionalCharges)
    ? extractedData.additionalCharges
        .filter((c: any) => c && typeof c.amount === 'number' && Number.isFinite(c.amount))
        .map((c: any) => ({ label: typeof c.label === 'string' && c.label.trim() ? c.label.trim() : 'Additional charge', amount: c.amount }))
    : [];

  return extractedData as ExtractedData;
}
