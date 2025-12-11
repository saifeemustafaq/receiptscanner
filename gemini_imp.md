# Gemini Implementation Guide: Document Data Extraction

**A Complete Guide to Implementing Google Gemini AI for Extracting Structured Data from Uploaded Documents**

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup & Installation](#setup--installation)
4. [Core Implementation](#core-implementation)
5. [Integration Workflow](#integration-workflow)
6. [Code Examples](#code-examples)
7. [Testing](#testing)
8. [Best Practices](#best-practices)

---

## Overview

This implementation uses **Google Gemini AI (gemini-2.0-flash-exp)** to automatically extract structured data from document images (PDF, JPG, PNG). The system:

- ✅ Uploads document images to Gemini
- ✅ Sends document-specific prompts for accurate extraction
- ✅ Receives structured JSON responses
- ✅ Validates extracted data against predefined schemas
- ✅ Saves data to user storage
- ✅ Auto-fills forms with extracted data

**Supported Documents:**
- I-20 (Student Certificate)
- I-94 (Arrival/Departure Record)
- Passport
- Visa
- EAD (Employment Authorization Document)
- W-2 (Wage and Tax Statement)
- Travel History

---

## Architecture

### System Flow

```
User Uploads Document
    ↓
Frontend (React Component)
    ↓
useDocumentAutoFill Hook
    ↓
API Route (/api/analyze-document)
    ↓
Gemini Analyzer (lib/gemini)
    ├── Upload file to Gemini
    ├── Generate document-specific prompt
    ├── Analyze with Gemini AI
    ├── Parse JSON response
    └── Validate against schema
    ↓
Save to User Storage (data/users/{userId})
    ↓
Return Extracted Data to Frontend
    ↓
Auto-fill Form Fields
```

### Directory Structure

```
project-root/
├── app/
│   └── api/
│       └── analyze-document/
│           └── route.ts              # Main API endpoint
├── lib/
│   ├── gemini/
│   │   ├── index.ts                  # Main exports
│   │   ├── analyzer.ts               # Core analyzer class
│   │   ├── prompts.ts                # Dynamic prompt generator
│   │   ├── schemas.ts                # Schema registry
│   │   └── types.ts                  # TypeScript types
│   └── fileUtils.ts                  # File system utilities
├── hooks/
│   └── useDocumentAutoFill.ts        # React hook for frontend
├── JSON/
│   ├── i20.json                      # I-20 schema
│   ├── passport.json                 # Passport schema
│   └── ... (other document schemas)
└── data/
    └── users/
        └── default_user/
            ├── i20_data.json         # Saved extracted data
            └── ... (other data files)
```

---

## Setup & Installation

### 1. Install Dependencies

```bash
npm install @google/genai
```

**Package:** `@google/genai` (v1.27.0+)

### 2. Get Gemini API Key

1. Visit: https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy the key (starts with `AIzaSy...`)

### 3. Configure Environment

Create `.env.local` in your project root:

```env
GEMINI_API_KEY=your_actual_api_key_here
```

**Important:** Never commit this file to version control!

### 4. Test Your Setup

Run the test script:

```bash
node scripts/test-gemini.js
```

Expected output:
```
✅ SUCCESS!
Your Gemini API key is working correctly!
```

---

## Core Implementation

### 1. Type Definitions (`lib/gemini/types.ts`)

```typescript
/**
 * Supported document types
 */
export type DocumentType = 
  | 'i20' 
  | 'i94' 
  | 'passport' 
  | 'visa' 
  | 'ead' 
  | 'w2' 
  | 'travel-history'
  | 'w7' 
  | '1040nr' 
  | '540nr' 
  | '8843';

/**
 * Schema definition for a document type
 */
export interface DocumentSchema {
  documentType: DocumentType;
  description: string;
  schema: Record<string, any>;  // JSON structure template
}

/**
 * Analysis result returned by Gemini
 */
export interface AnalysisResult {
  success: boolean;
  documentType: DocumentType;
  extractedData: Record<string, any> | null;
  confidence?: number;
  error?: string;
  metadata?: {
    processingTime: number;
    modelUsed: string;
  };
}

/**
 * Options for document analysis
 */
export interface AnalysisOptions {
  validateSchema?: boolean;  // Validate against schema after extraction
  fillDefaults?: boolean;    // Fill in default values for missing fields
  strictMode?: boolean;      // Fail on any validation errors
}

/**
 * Configuration for DocumentAnalyzer
 */
export interface DocumentAnalyzerConfig {
  apiKey: string;
  model?: string;            // Default: 'gemini-2.0-flash-exp'
  temperature?: number;      // Default: 0.1 (low for factual extraction)
  maxRetries?: number;       // Default: 3
}
```

### 2. Schema Registry (`lib/gemini/schemas.ts`)

The schema registry maps document types to their JSON structures:

```typescript
import i20Schema from '@/JSON/i20.json';
import passportSchema from '@/JSON/passport.json';
import visaSchema from '@/JSON/visa.json';
// ... import other schemas

/**
 * Central registry of all document schemas
 */
const schemaRegistry: Record<DocumentType, DocumentSchema> = {
  i20: {
    documentType: 'i20',
    description: 'Certificate of Eligibility for Nonimmigrant Student Status (Form I-20)',
    schema: i20Schema.i20,
  },
  passport: {
    documentType: 'passport',
    description: 'International Passport Document',
    schema: passportSchema.passport,
  },
  // ... other document types
};

/**
 * Get schema for a specific document type
 */
export function getSchema(documentType: DocumentType): DocumentSchema {
  const schema = schemaRegistry[documentType];
  if (!schema || Object.keys(schema.schema).length === 0) {
    throw new Error(`Schema not yet implemented for document type: ${documentType}`);
  }
  return schema;
}

/**
 * Check if schema exists for a document type
 */
export function hasSchema(documentType: DocumentType): boolean {
  const schema = schemaRegistry[documentType];
  return schema && Object.keys(schema.schema).length > 0;
}

/**
 * Get all available document types with implemented schemas
 */
export function getAvailableDocumentTypes(): DocumentType[] {
  return Object.keys(schemaRegistry).filter((type) =>
    hasSchema(type as DocumentType)
  ) as DocumentType[];
}
```

### 3. Dynamic Prompt Generator (`lib/gemini/prompts.ts`)

Creates document-specific extraction prompts:

```typescript
import { DocumentType } from './types';
import { getSchema } from './schemas';

/**
 * Generate extraction prompt for a specific document type
 */
export function generateExtractionPrompt(documentType: DocumentType): string {
  const schema = getSchema(documentType);
  
  const prompt = `You are an expert document extraction AI. You are analyzing a ${schema.description}.

CRITICAL INSTRUCTIONS:
1. Extract ALL information from the uploaded document image
2. Return ONLY a valid JSON object - no explanations, no markdown code blocks, no extra text
3. Match the exact structure of the schema provided below
4. For missing or unreadable values, use null for objects/strings, 0 for numbers, false for booleans, [] for arrays
5. For dates, ALWAYS use format: YYYY-MM-DD (e.g., "2025-05-14") - convert any date you find to this format
6. For currency amounts, use numbers without symbols (e.g., 50000 not "$50,000")
7. Preserve exact text as it appears (names, addresses, codes)
8. If a field is partially visible or unclear, extract what you can and use null for unclear parts
9. Do NOT fabricate or infer information not present in the document
10. Pay special attention to:
    - Document identifiers (SEVIS ID, case numbers, etc.)
    - Personal information (names, dates of birth, addresses)
    - Financial information (amounts, funding sources)
    - Dates (issue dates, validity periods, program dates)
    - School/institution information
    - Official signatures and attestations

SCHEMA STRUCTURE TO FOLLOW:
${JSON.stringify(schema.schema, null, 2)}

VALIDATION RULES:
- Strings: Extract exactly as shown, trim whitespace
- Numbers: No currency symbols or commas
- Dates: MUST be in YYYY-MM-DD format (e.g., "2025-05-14")
- Booleans: true/false based on checkboxes or explicit statements
- Arrays: Include all entries if multiple items exist
- Nested objects: Maintain the hierarchy shown in schema

OUTPUT FORMAT:
Return a single JSON object matching the schema above. Do not wrap in code blocks or add any text before or after the JSON.`;

  return prompt;
}

/**
 * Document-specific extraction tips
 * These are appended to the base prompt for better accuracy
 */
export const DOCUMENT_EXTRACTION_TIPS: Record<DocumentType, string[]> = {
  i20: [
    '=== SEVIS ID: TOP RIGHT corner, format: N followed by 10 digits (e.g., N0012345678)',
    '=== Financial Information: Extract ALL cost fields in USD (tuition, living expenses, etc.)',
    '=== Dates: Convert ALL dates to YYYY-MM-DD format',
    '=== School Information: Extract full official school name and DSO contact details',
    // ... more tips
  ],
  passport: [
    '=== MRZ (Machine Readable Zone): Bottom 2 lines contain encoded data',
    '=== Passport Number: Alphanumeric, typically 6-9 characters',
    '=== Dates: Issue date and expiry date in YYYY-MM-DD format',
    // ... more tips
  ],
  // ... tips for other document types
};

/**
 * Generate complete prompt with document-specific tips
 */
export function generateCompletePrompt(documentType: DocumentType): string {
  const basePrompt = generateExtractionPrompt(documentType);
  const tips = DOCUMENT_EXTRACTION_TIPS[documentType] || [];
  
  if (tips.length === 0) return basePrompt;
  
  const tipsText = '\n\nDOCUMENT-SPECIFIC TIPS:\n' + 
    tips.map((tip, i) => `${i + 1}. ${tip}`).join('\n');
  
  return basePrompt + tipsText;
}
```

### 4. Document Analyzer (`lib/gemini/analyzer.ts`)

The core class that handles document analysis:

```typescript
import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';
import { DocumentType, AnalysisResult, AnalysisOptions, DocumentAnalyzerConfig } from './types';
import { generateCompletePrompt } from './prompts';
import { getSchema, hasSchema } from './schemas';

/**
 * Main Document Analyzer Class
 */
export class DocumentAnalyzer {
  private ai: GoogleGenAI;
  private config: DocumentAnalyzerConfig;

  constructor(config: DocumentAnalyzerConfig) {
    this.config = {
      model: 'gemini-2.0-flash-exp',
      temperature: 0.1,  // Low temperature for factual extraction
      maxRetries: 3,
      ...config,
    };
    
    this.ai = new GoogleGenAI({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Analyze a document and extract structured data
   */
  async analyzeDocument(
    file: Blob | File | string,
    documentType: DocumentType,
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      // Validate document type has schema
      if (!hasSchema(documentType)) {
        return {
          success: false,
          documentType,
          extractedData: null,
          error: `Schema not yet implemented for document type: ${documentType}`,
        };
      }

      // Step 1: Upload file to Gemini
      console.log(`Uploading ${documentType} document to Gemini...`);
      const uploaded = await this.ai.files.upload({ file });

      if (!uploaded.uri || !uploaded.mimeType) {
        return {
          success: false,
          documentType,
          extractedData: null,
          error: 'Failed to upload file to Gemini',
        };
      }

      // Step 2: Generate document-specific prompt
      const prompt = generateCompletePrompt(documentType);

      // Step 3: Analyze document with Gemini
      console.log(`Analyzing ${documentType} document with Gemini...`);
      const response = await this.ai.models.generateContent({
        model: this.config.model!,
        contents: [
          createUserContent([
            prompt,
            createPartFromUri(uploaded.uri as string, uploaded.mimeType as string),
          ]),
        ],
        config: {
          temperature: this.config.temperature,
        },
      });

      const responseText = response.text ?? '';
      
      if (!responseText) {
        return {
          success: false,
          documentType,
          extractedData: null,
          error: 'Empty response from Gemini',
        };
      }

      // Step 4: Parse JSON response
      const extractedData = this.parseResponse(responseText);

      if (!extractedData) {
        return {
          success: false,
          documentType,
          extractedData: null,
          error: 'Failed to parse response as JSON',
        };
      }

      // Step 5: Validate against schema if requested
      if (options.validateSchema) {
        const validationResult = this.validateAgainstSchema(extractedData, documentType);
        if (!validationResult.isValid) {
          console.warn('Schema validation warnings:', validationResult.warnings);
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        documentType,
        extractedData,
        metadata: {
          processingTime,
          modelUsed: this.config.model!,
        },
      };
    } catch (error) {
      console.error('Document analysis error:', error);
      return {
        success: false,
        documentType,
        extractedData: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Parse Gemini response to JSON
   * Handles various response formats (with/without code blocks)
   */
  private parseResponse(responseText: string): Record<string, any> | null {
    try {
      let cleaned = responseText.trim();
      
      // Remove markdown code blocks if present
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }

      cleaned = cleaned.trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('Failed to parse response:', error);
      return null;
    }
  }

  /**
   * Validate extracted data against schema
   */
  private validateAgainstSchema(
    data: Record<string, any>,
    documentType: DocumentType
  ): { isValid: boolean; warnings: string[] } {
    const schema = getSchema(documentType);
    const warnings: string[] = [];

    function validateStructure(extracted: any, template: any, path: string = ''): void {
      for (const key in template) {
        const fullPath = path ? `${path}.${key}` : key;
        
        if (!(key in extracted)) {
          warnings.push(`Missing field: ${fullPath}`);
          continue;
        }

        const extractedValue = extracted[key];
        const templateValue = template[key];

        // Type checking
        if (typeof templateValue !== typeof extractedValue) {
          if (extractedValue !== null) {
            warnings.push(`Type mismatch at ${fullPath}`);
          }
        }

        // Recursive validation for objects
        if (templateValue && typeof templateValue === 'object' && !Array.isArray(templateValue)) {
          if (extractedValue && typeof extractedValue === 'object') {
            validateStructure(extractedValue, templateValue, fullPath);
          }
        }
      }
    }

    validateStructure(data, schema.schema);

    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }
}

/**
 * Factory function to create analyzer instance
 */
export function createDocumentAnalyzer(apiKey?: string): DocumentAnalyzer {
  const key = apiKey || process.env.GEMINI_API_KEY;
  
  if (!key) {
    throw new Error('Gemini API key not provided');
  }

  return new DocumentAnalyzer({ apiKey: key });
}

/**
 * Convenience function for one-off analysis
 */
export async function analyzeDocument(
  file: Blob | File | string,
  documentType: DocumentType,
  options: AnalysisOptions = {}
): Promise<AnalysisResult> {
  const analyzer = createDocumentAnalyzer();
  return analyzer.analyzeDocument(file, documentType, options);
}
```

### 5. API Route (`app/api/analyze-document/route.ts`)

Next.js API endpoint that handles document upload and analysis:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { analyzeDocument } from '@/lib/gemini';
import { DocumentType } from '@/lib/gemini/types';
import { saveUserData } from '@/lib/fileUtils';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for analysis

/**
 * POST /api/analyze-document
 * Analyze uploaded document and optionally save to user data
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as DocumentType;
    const userId = formData.get('userId') as string || 'default_user';
    const autoSave = formData.get('autoSave') === 'true';

    // Validation
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!documentType) {
      return NextResponse.json(
        { success: false, error: 'Document type not specified' },
        { status: 400 }
      );
    }

    // Check API key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    console.log(`Analyzing ${documentType} document for user: ${userId}`);

    // Analyze document using Gemini
    const result = await analyzeDocument(file, documentType, {
      validateSchema: true,
      fillDefaults: true,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Document analysis failed',
        },
        { status: 500 }
      );
    }

    // Optionally save to user data storage
    if (autoSave && result.extractedData) {
      try {
        await saveUserData(userId, `${documentType}_data`, result.extractedData);
        console.log(`Auto-saved ${documentType} data for user: ${userId}`);
      } catch (saveError) {
        console.error('Failed to auto-save data:', saveError);
        // Continue even if save fails - return data to frontend
      }
    }

    // Return success response with extracted data
    return NextResponse.json({
      success: true,
      documentType: result.documentType,
      extractedData: result.extractedData,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analyze-document
 * Get supported document types and API status
 */
export async function GET() {
  try {
    const { getAvailableDocumentTypes } = await import('@/lib/gemini');
    const availableTypes = getAvailableDocumentTypes();

    return NextResponse.json({
      success: true,
      supportedDocumentTypes: availableTypes,
      apiConfigured: !!process.env.GEMINI_API_KEY,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get document types',
      },
      { status: 500 }
    );
  }
}
```

### 6. File Utilities (`lib/fileUtils.ts`)

Helper functions for saving/loading data:

```typescript
import fs from 'fs';
import path from 'path';

/**
 * Get user-specific data directory
 */
export function getUserDataDir(userId: string = 'default_user'): string {
  return path.join(process.cwd(), 'data', 'users', userId);
}

/**
 * Save user data to a specific file
 */
export async function saveUserData(
  userId: string,
  dataType: string,
  data: any
): Promise<boolean> {
  const userDir = getUserDataDir(userId);
  
  // Ensure user directory exists
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  
  const filename = `${dataType}.json`;
  const filePath = path.join(userDir, filename);
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`Saved ${dataType} data for user ${userId}`);
    return true;
  } catch (error) {
    console.error(`Error saving ${dataType} data:`, error);
    return false;
  }
}

/**
 * Read user data from a specific file
 */
export async function readUserData(
  userId: string,
  dataType: string
): Promise<any | null> {
  const userDir = getUserDataDir(userId);
  const filename = `${dataType}.json`;
  const filePath = path.join(userDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error reading ${dataType} data:`, error);
    return null;
  }
}
```

---

## Integration Workflow

### Frontend Hook (`hooks/useDocumentAutoFill.ts`)

React hook for easy frontend integration:

```typescript
import { useState, useCallback } from 'react';
import { DocumentType } from '@/lib/gemini/types';

interface AutoFillOptions {
  autoSave?: boolean;
  userId?: string;
  onSuccess?: (documentType: string, data: any) => void;
  onError?: (documentType: string, error: string) => void;
}

export function useDocumentAutoFill(options: AutoFillOptions = {}) {
  const { autoSave = false, userId = 'default_user', onSuccess, onError } = options;

  const [autoFillEnabled, setAutoFillEnabled] = useState(true);
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({});
  const [analysisResults, setAnalysisResults] = useState<Record<string, any>>({});

  /**
   * Analyze a document and extract data
   */
  const analyzeDocument = useCallback(
    async (file: File, documentType: DocumentType) => {
      if (!autoFillEnabled) return null;

      setAnalyzing((prev) => ({ ...prev, [documentType]: true }));

      try {
        // Create form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', documentType);
        formData.append('userId', userId);
        formData.append('autoSave', autoSave.toString());

        // Call analysis API
        const response = await fetch('/api/analyze-document', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Document analysis failed');
        }

        // Update success status
        setAnalysisResults((prev) => ({
          ...prev,
          [documentType]: { success: true, message: 'Data extracted successfully!' },
        }));

        // Call success callback
        if (onSuccess) {
          onSuccess(documentType, result.extractedData);
        }

        return result.extractedData;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to analyze document';
        
        setAnalysisResults((prev) => ({
          ...prev,
          [documentType]: { success: false, message: errorMessage },
        }));

        if (onError) {
          onError(documentType, errorMessage);
        }

        return null;
      } finally {
        setAnalyzing((prev) => ({ ...prev, [documentType]: false }));
      }
    },
    [autoFillEnabled, autoSave, userId, onSuccess, onError]
  );

  /**
   * Get analysis status for a specific document
   */
  const getStatus = useCallback(
    (documentType: string) => ({
      isAnalyzing: analyzing[documentType] || false,
      result: analysisResults[documentType] || null,
    }),
    [analyzing, analysisResults]
  );

  return {
    autoFillEnabled,
    setAutoFillEnabled,
    analyzeDocument,
    getStatus,
  };
}
```

### React Component Usage Example

```typescript
'use client';

import { useState } from 'react';
import { useDocumentAutoFill } from '@/hooks/useDocumentAutoFill';

export default function DocumentUploadPage() {
  const [formData, setFormData] = useState({});

  // Use the auto-fill hook
  const {
    autoFillEnabled,
    setAutoFillEnabled,
    analyzeDocument,
    getStatus,
  } = useDocumentAutoFill({
    autoSave: false,
    userId: 'default_user',
    onSuccess: (documentType, extractedData) => {
      console.log('Data extracted:', extractedData);
      // Merge extracted data into form
      setFormData((prev) => ({ ...prev, ...extractedData }));
    },
    onError: (documentType, error) => {
      console.error('Extraction failed:', error);
    },
  });

  // Get status for I-20 document
  const { isAnalyzing, result } = getStatus('i20');

  // Handle file upload
  const handleFileChange = async (file: File) => {
    if (autoFillEnabled) {
      await analyzeDocument(file, 'i20');
    }
  };

  return (
    <div>
      {/* Auto-fill toggle */}
      <label>
        <input
          type="checkbox"
          checked={autoFillEnabled}
          onChange={(e) => setAutoFillEnabled(e.target.checked)}
        />
        Enable AI Auto-Fill
      </label>

      {/* File upload */}
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => handleFileChange(e.target.files?.[0]!)}
      />

      {/* Status indicators */}
      {isAnalyzing && <p>Analyzing document...</p>}
      {result?.success && <p>✅ Data extracted successfully!</p>}
      {result?.success === false && <p>❌ {result.message}</p>}

      {/* Form fields auto-filled from extractedData */}
      {/* ... your form inputs here ... */}
    </div>
  );
}
```

---

## Code Examples

### Example 1: Simple Document Analysis

```typescript
import { analyzeDocument } from '@/lib/gemini';

// Analyze a passport
const file = new File([/* file data */], 'passport.jpg');
const result = await analyzeDocument(file, 'passport', {
  validateSchema: true,
  fillDefaults: false,
});

if (result.success) {
  console.log('Extracted data:', result.extractedData);
  console.log('Processing time:', result.metadata?.processingTime, 'ms');
} else {
  console.error('Error:', result.error);
}
```

### Example 2: Custom Analyzer Instance

```typescript
import { createDocumentAnalyzer } from '@/lib/gemini';

// Create custom analyzer
const analyzer = createDocumentAnalyzer('YOUR_API_KEY');

// Analyze multiple documents
const results = await Promise.all([
  analyzer.analyzeDocument(passportFile, 'passport'),
  analyzer.analyzeDocument(visaFile, 'visa'),
  analyzer.analyzeDocument(i20File, 'i20'),
]);

console.log('All documents analyzed:', results);
```

### Example 3: Server-side Usage in API Route

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { analyzeDocument } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  const result = await analyzeDocument(file, 'i94', {
    validateSchema: true,
  });

  return NextResponse.json(result);
}
```

### Example 4: Deep Merge Extracted Data with Form Data

```typescript
// Utility to merge extracted data without overwriting existing user input
function deepMerge(target: any, source: any): any {
  if (!source || typeof source !== 'object') return target;
  
  const result = { ...target };
  
  for (const key in source) {
    const targetValue = result[key];
    const sourceValue = source[key];

    // If target field is empty, use source value
    if (
      targetValue === null ||
      targetValue === '' ||
      targetValue === 0 ||
      (Array.isArray(targetValue) && targetValue.length === 0)
    ) {
      result[key] = sourceValue;
    } 
    // Recursively merge objects
    else if (typeof targetValue === 'object' && !Array.isArray(targetValue)) {
      result[key] = deepMerge(targetValue, sourceValue);
    }
    // Keep existing value
  }

  return result;
}

// Usage in component
const onSuccess = (documentType: string, extractedData: any) => {
  const mergedData = deepMerge(currentFormData, extractedData);
  setFormData(mergedData);
};
```

---

## Testing

### Test Script (`scripts/test-gemini.js`)

Create a simple test script to verify your setup:

```javascript
const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: '.env.local' });

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API Key...\n');

  // Check API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: GEMINI_API_KEY not found in .env.local');
    process.exit(1);
  }

  console.log(`📋 API Key found: ${apiKey.substring(0, 10)}...`);
  console.log('🔌 Connecting to Gemini AI...\n');

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    console.log('💬 Sending test message...\n');
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [{ role: 'user', parts: [{ text: 'Hello! Respond with: Your Gemini API key is working!' }] }],
    });

    console.log('✅ SUCCESS!');
    console.log('Your Gemini API key is working correctly!\n');
    console.log('📨 Gemini Response:');
    console.log('━'.repeat(50));
    console.log(response.text);
    console.log('━'.repeat(50));
    console.log('\n✨ You\'re all set! The auto-fill feature will work now.');
  } catch (error) {
    console.error('❌ ERROR');
    console.error('Failed to connect to Gemini API\n');
    console.error('Error Message:');
    console.error(error.message);
    console.error('\n💡 Possible issues:');
    console.error('   1. API key is invalid or expired');
    console.error('   2. API key doesn\'t have proper permissions');
    console.error('   3. Billing not enabled on your Google Cloud project');
    console.error('\nGet a valid API key from:');
    console.error('https://makersuite.google.com/app/apikey');
    process.exit(1);
  }
}

testGeminiAPI();
```

Run the test:

```bash
node scripts/test-gemini.js
```

### Manual Testing with curl

Test the API endpoint:

```bash
curl -X POST http://localhost:3000/api/analyze-document \
  -F "file=@/path/to/document.jpg" \
  -F "documentType=passport" \
  -F "userId=test_user" \
  -F "autoSave=true"
```

Expected response:

```json
{
  "success": true,
  "documentType": "passport",
  "extractedData": {
    "metadata": { ... },
    "identifiers": { ... },
    "holder": { ... }
  },
  "metadata": {
    "processingTime": 3421,
    "modelUsed": "gemini-2.0-flash-exp"
  }
}
```

---

## Best Practices

### 1. **Schema Design**

- Keep schemas comprehensive but not overly complex
- Use consistent naming conventions (camelCase)
- Include all expected fields even if optional
- Use proper data types (string, number, boolean, arrays, objects)

**Example schema structure:**

```json
{
  "passport": {
    "metadata": {
      "formName": "Passport",
      "formTitle": "",
      "issuer": ""
    },
    "identifiers": {
      "passportNumber": ""
    },
    "holder": {
      "surname": "",
      "givenNames": "",
      "dateOfBirth": "",
      "sex": "",
      "nationality": ""
    }
  }
}
```

### 2. **Prompt Engineering**

- Be specific and clear in instructions
- Provide document-specific tips for each type
- Emphasize critical fields (IDs, dates, amounts)
- Explicitly state the output format (JSON only, no markdown)
- Use low temperature (0.1) for factual extraction

### 3. **Error Handling**

```typescript
try {
  const result = await analyzeDocument(file, documentType);
  
  if (!result.success) {
    // Handle specific error types
    if (result.error?.includes('API key')) {
      // API key issue
    } else if (result.error?.includes('Schema not implemented')) {
      // Unsupported document type
    } else {
      // Generic error
    }
  }
} catch (error) {
  // Network or unexpected errors
  console.error('Unexpected error:', error);
}
```

### 4. **Performance Optimization**

- Set appropriate timeout (`maxDuration: 60` in Next.js API routes)
- Use streaming responses for large documents (if supported)
- Cache extracted data to avoid re-analysis
- Batch multiple documents when possible

### 5. **Security**

- Never expose API keys in client-side code
- Use environment variables for all sensitive data
- Validate file types and sizes before upload
- Sanitize extracted data before using in UI
- Implement rate limiting to prevent abuse

### 6. **User Experience**

- Show clear loading states during analysis
- Display success/error messages with context
- Allow users to review and edit extracted data
- Provide option to disable auto-fill
- Show confidence scores when available

### 7. **Cost Management**

- Gemini API has token-based pricing
- Monitor API usage in Google Cloud Console
- Implement caching to reduce redundant calls
- Consider free tier limits (15 requests/minute)

### 8. **Data Validation**

Always validate extracted data before using:

```typescript
function validateI94Data(data: any): boolean {
  // Check required fields
  if (!data.identifiers?.i94Number) return false;
  if (data.identifiers.i94Number.length !== 11) return false;
  
  // Validate date format
  if (data.admission?.mostRecentDateOfEntry) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.admission.mostRecentDateOfEntry)) return false;
  }
  
  return true;
}
```

---

## Summary

This implementation provides a complete, production-ready system for extracting structured data from document images using Google Gemini AI. Key features:

✅ **Modular Architecture**: Separate concerns (analyzer, prompts, schemas)
✅ **Type-Safe**: Full TypeScript support
✅ **Extensible**: Easy to add new document types
✅ **Error-Resilient**: Comprehensive error handling
✅ **User-Friendly**: React hooks for easy frontend integration
✅ **Validated**: Schema validation ensures data quality
✅ **Persistent**: Automatic data storage

**Next Steps for Your Implementation:**

1. Install `@google/genai` package
2. Get Gemini API key and add to `.env.local`
3. Create your document schemas in `JSON/` folder
4. Copy the analyzer, prompts, and schemas code
5. Create the API route handler
6. Use the React hook in your components
7. Test with real documents
8. Iterate on prompts for better accuracy

Good luck with your implementation! 🚀

---

**For questions or issues, refer to:**
- Gemini API Docs: https://ai.google.dev/docs
- Google AI Studio: https://makersuite.google.com/

