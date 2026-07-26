import { NextRequest, NextResponse } from 'next/server';
import { getSettings, isValidProvider } from '@/lib/settingsStorage';
import { suggestMappings } from '@/lib/ai/mapping';
import { MissingApiKeyError } from '@/lib/ai';
import type { AIProvider } from '@/lib/ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/ai-mappings — suggest canonical mappings for a batch of raw item
 * names using the active AI provider. Read-only: it returns suggestions only
 * and never writes mappings (the client applies approved ones via /api/mappings).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const targets: string[] = Array.isArray(body?.targets)
      ? body.targets.filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
      : [];
    const existingItems: string[] = Array.isArray(body?.existingItems)
      ? body.existingItems.filter((t: unknown): t is string => typeof t === 'string')
      : [];
    const existingMappings = Array.isArray(body?.existingMappings)
      ? body.existingMappings.filter(
          (m: unknown): m is { rawName: string; canonicalName: string } =>
            !!m &&
            typeof (m as { rawName?: unknown }).rawName === 'string' &&
            typeof (m as { canonicalName?: unknown }).canonicalName === 'string'
        )
      : [];

    if (targets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items to map' },
        { status: 400 }
      );
    }

    // A `provider` field can override the stored setting; otherwise use settings.
    const requested = body?.provider;
    const provider: AIProvider = isValidProvider(requested)
      ? requested
      : getSettings().aiProvider;

    const suggestions = await suggestMappings(provider, {
      targets,
      existingItems,
      existingMappings,
    });

    return NextResponse.json({ success: true, suggestions, provider });
  } catch (error) {
    console.error('AI mapping error:', error);

    if (error instanceof MissingApiKeyError) {
      return NextResponse.json(
        { success: false, error: error.message, details: `Add ${error.envVar} to .env.local to use this provider.` },
        { status: 500 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Failed to generate mappings', details: message },
      { status: 500 }
    );
  }
}
