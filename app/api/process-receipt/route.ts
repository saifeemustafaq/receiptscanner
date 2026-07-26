import { NextRequest, NextResponse } from 'next/server';
import { getSettings, isValidProvider } from '@/lib/settingsStorage';
import { extractReceipt, PROVIDERS, MissingApiKeyError } from '@/lib/ai';
import { ExtractionParseError } from '@/lib/ai/parseResponse';
import type { AIProvider } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for processing

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const fileType = file.type;
    const isPDF = fileType === 'application/pdf';
    const isImage = fileType.startsWith('image/');

    if (!isPDF && !isImage) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload an image (JPG, PNG) or PDF file.' },
        { status: 400 }
      );
    }

    // Determine which provider to use. A `provider` form field can override the
    // stored setting (useful for testing); otherwise fall back to settings.
    const requestedProvider = formData.get('provider');
    const provider: AIProvider = isValidProvider(requestedProvider)
      ? requestedProvider
      : getSettings().aiProvider;

    console.log(`🤖 Using AI provider: ${provider}`);

    // Run extraction via the selected provider. The orchestrator picks the
    // text-first path for digital PDFs and falls back to vision automatically.
    const {
      data: extractedData,
      modelUsed,
      mode,
      pageCount,
    } = await extractReceipt(provider, { file, isPDF });

    const processingTime = Date.now() - startTime;

    console.log(`✅ Receipt processed successfully in ${processingTime}ms`);
    console.log(`🔎 Extraction mode: ${mode}`);
    console.log(`📊 Extracted ${extractedData.items.length} items`);
    if (isPDF) {
      console.log(`📄 PDF document processed - all pages analyzed`);
    }

    return NextResponse.json({
      data: extractedData,
      metadata: {
        processingTime,
        modelUsed,
        provider,
        mode,
        pageCount,
        itemCount: extractedData.items.length,
      },
    });
  } catch (error) {
    console.error('Receipt processing error:', error);

    // Missing API key for the selected provider
    if (error instanceof MissingApiKeyError) {
      return NextResponse.json(
        {
          error: error.message,
          details: `Add ${error.envVar} to .env.local to use this provider.`,
        },
        { status: 500 }
      );
    }

    // Failed to parse/validate the AI response
    if (error instanceof ExtractionParseError) {
      return NextResponse.json(
        {
          error: 'Failed to parse receipt data',
          details: error.message,
          rawResponse: error.rawResponse.substring(0, 500),
        },
        { status: 500 }
      );
    }

    // Provide more helpful error messages for common provider failures
    const message = error instanceof Error ? error.message : 'Unknown error';
    let errorMessage = 'Failed to process receipt';
    let details = message;

    if (message.includes('API key') || message.includes('Incorrect API key')) {
      errorMessage = 'Invalid API key. Please check your provider API key in .env.local';
      details = `Verify the correct key is set (${PROVIDERS.gemini.envVar} or ${PROVIDERS.openai.envVar}).`;
    } else if (message.includes('quota') || message.includes('429')) {
      errorMessage = 'API quota exceeded';
      details = 'Please wait a moment and try again.';
    } else if (message.includes('upload')) {
      errorMessage = 'Failed to upload file';
      details = 'File may be too large or in an unsupported format';
    }

    return NextResponse.json(
      { error: errorMessage, details },
      { status: 500 }
    );
  }
}
