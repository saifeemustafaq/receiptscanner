import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';

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

    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured. Add GEMINI_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    console.log('📤 Uploading receipt to Gemini...');

    // Initialize Gemini AI
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    // Step 1: Upload file to Gemini
    const uploaded = await ai.files.upload({ file });

    if (!uploaded.uri || !uploaded.mimeType) {
      return NextResponse.json(
        { error: 'Failed to upload file to Gemini' },
        { status: 500 }
      );
    }

    console.log('✅ File uploaded successfully');
    console.log('🤖 Analyzing receipt with Gemini AI...');

    // Step 2: Create extraction prompt
    const prompt = `You are an expert receipt data extraction AI. Analyze this receipt image and extract ALL information.

CRITICAL INSTRUCTIONS:
1. Extract ALL items with their details from the receipt
2. Extract the DATE from the receipt (very important!)
3. Return ONLY a valid JSON object - no explanations, no markdown code blocks, no extra text
4. For missing or unreadable values, use null
5. For dates, use format: YYYY-MM-DD
6. For currency amounts, use numbers without symbols (e.g., 50.00 not "$50.00")
7. Be precise with decimal numbers for prices

REQUIRED JSON STRUCTURE:
{
  "storeNameScanned": "detected store name from receipt or null",
  "receiptDate": "YYYY-MM-DD format (date shown on receipt) or null",
  "items": [
    {
      "name": "item name",
      "quantity": number,
      "unitPrice": number or null,
      "totalPrice": number,
      "unit": "unit type (e.g., kg, lbs, pcs, ea) or null"
    }
  ],
  "total": total amount as number
}

EXTRACTION RULES:
- Extract store name from the top of the receipt
- Extract the DATE from the receipt - look for date/time stamp (usually near top or bottom)
- Convert any date format to YYYY-MM-DD (e.g., "12/10/2025" → "2025-12-10", "Dec 10, 2025" → "2025-12-10")
- For each item, get: name, quantity, unit price (if shown), and total price
- If unit price is not shown separately, set it to null
- Include units like "kg", "lbs", "ea" if specified
- The total should match the receipt's grand total
- Be precise with all decimal numbers
- Extract ALL items visible on the receipt

DATE EXTRACTION TIPS:
- Look at the top of the receipt for date/time
- Look at the bottom near transaction details
- Common formats: MM/DD/YYYY, DD/MM/YYYY, Month DD, YYYY
- Always convert to YYYY-MM-DD format

OUTPUT: Return ONLY the JSON object, nothing else.`;

    // Step 3: Analyze receipt with Gemini
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [
        createUserContent([
          prompt,
          createPartFromUri(uploaded.uri as string, uploaded.mimeType as string),
        ]),
      ],
      config: {
        temperature: 0.1, // Low temperature for factual extraction
      },
    });

    const responseText = response.text ?? '';
    
    if (!responseText) {
      return NextResponse.json(
        { error: 'Empty response from Gemini' },
        { status: 500 }
      );
    }

    console.log('📝 Parsing extracted data...');

    // Step 4: Parse JSON response
    let extractedData;
    try {
      let cleaned = responseText.trim();
      
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
      return NextResponse.json(
        { 
          error: 'Failed to parse receipt data', 
          details: 'Gemini returned invalid JSON format',
          rawResponse: responseText.substring(0, 500) // First 500 chars for debugging
        },
        { status: 500 }
      );
    }

    // Validate extracted data
    if (!extractedData.items || !Array.isArray(extractedData.items)) {
      return NextResponse.json(
        { error: 'Invalid data structure: items array missing' },
        { status: 500 }
      );
    }

    if (typeof extractedData.total !== 'number') {
      return NextResponse.json(
        { error: 'Invalid data structure: total amount missing' },
        { status: 500 }
      );
    }

    const processingTime = Date.now() - startTime;

    console.log(`✅ Receipt processed successfully in ${processingTime}ms`);
    console.log(`📊 Extracted ${extractedData.items.length} items`);

    return NextResponse.json({ 
      data: extractedData,
      metadata: {
        processingTime,
        modelUsed: 'gemini-2.0-flash-exp',
        itemCount: extractedData.items.length
      }
    });

  } catch (error: any) {
    console.error('Receipt processing error:', error);
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to process receipt';
    let details = error.message;
    
    if (error.message?.includes('API key')) {
      errorMessage = 'Invalid API key. Please check your GEMINI_API_KEY in .env.local';
      details = 'Get a valid API key from: https://makersuite.google.com/app/apikey';
    } else if (error.message?.includes('quota') || error.message?.includes('429')) {
      errorMessage = 'API quota exceeded';
      details = 'Please wait a moment and try again. Free tier: 15 requests/minute';
    } else if (error.message?.includes('upload')) {
      errorMessage = 'Failed to upload file';
      details = 'File may be too large or in an unsupported format';
    }
    
    return NextResponse.json(
      { error: errorMessage, details },
      { status: 500 }
    );
  }
}
