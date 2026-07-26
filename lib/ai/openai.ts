import OpenAI from 'openai';
import { buildExtractionPrompt } from './prompt';
import { parseAndValidate } from './parseResponse';
import { MissingApiKeyError } from './types';
import type { ExtractionSource, ProviderResult } from './types';

export const OPENAI_MODEL = 'gpt-4o';

/**
 * Extract receipt data using OpenAI (Responses API).
 *
 * Two paths, selected by the resolved source:
 * - `text`: the PDF's extracted text layer is sent as input_text (no upload).
 * - `file`: images are sent inline as a base64 data URL (input_image); PDFs are
 *   uploaded via the Files API and referenced by file_id (input_file) so all
 *   pages are processed.
 */
export async function extractWithOpenAI(
  source: ExtractionSource,
  isPDF: boolean
): Promise<ProviderResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new MissingApiKeyError('OPENAI_API_KEY', 'OpenAI');
  }

  const client = new OpenAI({ apiKey });

  // Text path: analyze the extracted PDF text directly.
  if (source.kind === 'text') {
    console.log('🤖 Analyzing receipt text with OpenAI (text mode)...');
    const prompt = buildExtractionPrompt({ isPDF, sourceText: source.text });

    const response = await client.responses.create({
      model: OPENAI_MODEL,
      temperature: 0.1, // Low temperature for factual extraction
      text: { format: { type: 'json_object' } }, // JSON mode: no markdown fences
      input: [
        {
          role: 'user',
          content: [{ type: 'input_text', text: prompt }],
        },
      ],
    });

    const data = parseAndValidate(response.output_text ?? '');
    return { data, modelUsed: OPENAI_MODEL, mode: 'text' };
  }

  // Vision path.
  const { file } = source;

  console.log(`📤 Preparing ${isPDF ? 'PDF' : 'image'} receipt for OpenAI...`);
  if (isPDF) {
    console.log('📄 PDF detected - All pages will be processed automatically');
  }

  const prompt = buildExtractionPrompt({ isPDF });

  let fileContent:
    | { type: 'input_image'; image_url: string; detail: 'auto' }
    | { type: 'input_file'; file_id: string };

  if (isPDF) {
    // Upload the PDF so OpenAI can read all pages.
    const uploaded = await client.files.create({
      file,
      purpose: 'user_data',
    });

    if (!uploaded.id) {
      throw new Error('Failed to upload file to OpenAI');
    }

    console.log('✅ File uploaded successfully');
    fileContent = { type: 'input_file', file_id: uploaded.id };
  } else {
    // Encode the image inline as a base64 data URL.
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';
    fileContent = {
      type: 'input_image',
      image_url: `data:${mimeType};base64,${base64}`,
      detail: 'auto',
    };
  }

  console.log('🤖 Analyzing receipt with OpenAI...');

  const response = await client.responses.create({
    model: OPENAI_MODEL,
    temperature: 0.1, // Low temperature for factual extraction
    text: { format: { type: 'json_object' } }, // JSON mode: no markdown fences
    input: [
      {
        role: 'user',
        content: [{ type: 'input_text', text: prompt }, fileContent],
      },
    ],
  });

  const data = parseAndValidate(response.output_text ?? '');
  return { data, modelUsed: OPENAI_MODEL, mode: 'vision' };
}

/**
 * Run a plain text→JSON completion with OpenAI (no receipt/file involved).
 * Used by the AI item-mapping feature. Returns the raw JSON text for the caller
 * to parse. Uses JSON mode so there are no markdown fences to strip.
 */
export async function completeJsonWithOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new MissingApiKeyError('OPENAI_API_KEY', 'OpenAI');
  }

  const client = new OpenAI({ apiKey });

  const response = await client.responses.create({
    model: OPENAI_MODEL,
    temperature: 0.2,
    text: { format: { type: 'json_object' } },
    input: [
      {
        role: 'user',
        content: [{ type: 'input_text', text: prompt }],
      },
    ],
  });

  return response.output_text ?? '';
}
