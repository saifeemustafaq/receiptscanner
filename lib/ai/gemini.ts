import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';
import { buildExtractionPrompt } from './prompt';
import { parseAndValidate } from './parseResponse';
import { MissingApiKeyError } from './types';
import type { ExtractionSource, ProviderResult } from './types';

export const GEMINI_MODEL = 'gemini-2.0-flash-exp';

/**
 * Extract receipt data using Google Gemini.
 *
 * Two paths, selected by the resolved source:
 * - `text`: the PDF's extracted text layer is sent inline (no file upload) —
 *   cheaper, faster, and free of OCR misreads.
 * - `file`: the image/PDF is uploaded via the Files API for multimodal OCR.
 */
export async function extractWithGemini(
  source: ExtractionSource,
  isPDF: boolean
): Promise<ProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new MissingApiKeyError('GEMINI_API_KEY', 'Gemini');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Text path: analyze the extracted PDF text directly.
  if (source.kind === 'text') {
    console.log('🤖 Analyzing receipt text with Gemini AI (text mode)...');
    const prompt = buildExtractionPrompt({ isPDF, sourceText: source.text });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [createUserContent([prompt])],
      config: {
        temperature: 0.1, // Low temperature for factual extraction
        responseMimeType: 'application/json', // JSON mode: no markdown fences
      },
    });

    const data = parseAndValidate(response.text ?? '');
    return { data, modelUsed: GEMINI_MODEL, mode: 'text' };
  }

  // Vision path: upload the file, then run multimodal generation.
  const { file } = source;

  console.log(`📤 Uploading ${isPDF ? 'PDF' : 'image'} receipt to Gemini...`);
  if (isPDF) {
    console.log('📄 PDF detected - All pages will be processed automatically');
  }

  const uploaded = await ai.files.upload({ file });

  if (!uploaded.uri || !uploaded.mimeType) {
    throw new Error('Failed to upload file to Gemini');
  }

  console.log('✅ File uploaded successfully');
  console.log('🤖 Analyzing receipt with Gemini AI...');

  const prompt = buildExtractionPrompt({ isPDF });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      createUserContent([
        prompt,
        createPartFromUri(uploaded.uri as string, uploaded.mimeType as string),
      ]),
    ],
    config: {
      temperature: 0.1, // Low temperature for factual extraction
      responseMimeType: 'application/json', // JSON mode: no markdown fences
    },
  });

  const data = parseAndValidate(response.text ?? '');
  return { data, modelUsed: GEMINI_MODEL, mode: 'vision' };
}

/**
 * Run a plain text→JSON completion with Gemini (no receipt/file involved).
 * Used by the AI item-mapping feature. Returns the raw JSON text for the caller
 * to parse. Uses JSON mode so there are no markdown fences to strip.
 */
export async function completeJsonWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new MissingApiKeyError('GEMINI_API_KEY', 'Gemini');
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [createUserContent([prompt])],
    config: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  });

  return response.text ?? '';
}
