import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { OPENAI_MODEL } from '@/lib/constants';
import { buildReceiptPrompt } from '@/lib/receiptPrompt';
import { receiptJsonSchema, parseReceiptResponse } from '@/lib/receiptParser';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured. Add OPENAI_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    const fileType = file.type;
    const isPDF = fileType === 'application/pdf';
    const isImage = fileType.startsWith('image/');

    if (!isPDF && !isImage) {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type. Please upload an image (JPG, PNG) or PDF file.' },
        { status: 400 }
      );
    }

    const client = new OpenAI();
    const model = process.env.OPENAI_EXTRACTION_MODEL || OPENAI_MODEL;

    // Images use base64 input_image; PDFs use Files API + input_file
    // (OpenAI Files API doesn't accept image formats)
    type ContentPart =
      | { type: 'input_image'; image_url: string; detail?: string }
      | { type: 'input_file'; file_id: string }
      | { type: 'input_text'; text: string };

    let filePart: ContentPart;

    if (isPDF) {
      console.log('📤 Uploading PDF receipt to OpenAI Files API...');
      const uploaded = await client.files.create({ file, purpose: 'user_data' });
      console.log('✅ File uploaded:', uploaded.id);
      filePart = { type: 'input_file', file_id: uploaded.id };
    } else {
      console.log('📤 Encoding image receipt as base64...');
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      filePart = { type: 'input_image', image_url: `data:${fileType};base64,${base64}`, detail: 'high' };
      console.log('✅ Image encoded');
    }

    console.log('🤖 Analyzing receipt with OpenAI...');

    const response = await client.responses.create({
      model,
      input: [{
        role: 'user',
        content: [
          filePart as never,
          { type: 'input_text', text: buildReceiptPrompt(isPDF) },
        ],
      }],
      text: {
        format: {
          type: 'json_schema',
          name: 'extract_receipt',
          schema: receiptJsonSchema,
          strict: true,
        },
      },
    });

    const responseText = response.output_text;
    if (!responseText) {
      return NextResponse.json({ success: false, error: 'Empty response from OpenAI' }, { status: 500 });
    }

    console.log('📝 Parsing extracted data...');

    let extractedData;
    try {
      extractedData = parseReceiptResponse(responseText);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      return NextResponse.json(
        { success: false, error: 'Failed to parse receipt data', details: 'OpenAI returned unexpected JSON structure' },
        { status: 500 }
      );
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Receipt processed in ${processingTime}ms — ${extractedData.items.length} items`);

    return NextResponse.json({
      data: extractedData,
      metadata: { processingTime, modelUsed: model, itemCount: extractedData.items.length },
    });

  } catch (error: unknown) {
    console.error('Receipt processing error:', error);

    const errMsg = error instanceof Error ? error.message : '';
    let errorMessage = 'Failed to process receipt';
    let details = errMsg;

    if (errMsg.includes('API key') || errMsg.includes('401') || errMsg.includes('authentication')) {
      errorMessage = 'Invalid API key. Please check your OPENAI_API_KEY in .env.local';
      details = 'Get a valid API key from: https://platform.openai.com/api-keys';
    } else if (errMsg.includes('quota') || errMsg.includes('429') || errMsg.includes('rate_limit')) {
      errorMessage = 'API quota exceeded';
      details = 'Please wait a moment and try again';
    } else if (errMsg.includes('upload')) {
      errorMessage = 'Failed to upload file';
      details = 'File may be too large or in an unsupported format';
    }

    return NextResponse.json({ success: false, error: errorMessage, details }, { status: 500 });
  }
}
