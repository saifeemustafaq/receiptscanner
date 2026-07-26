/**
 * AI-assisted item mapping orchestrator.
 *
 * Builds the mapping prompt, dispatches to the active provider's text→JSON
 * completion, and parses/validates the result into clean suggestions. This only
 * PROPOSES mappings — nothing is written here; the user reviews and applies via
 * the normal mappings API.
 */

import { completeJsonWithOpenAI } from './openai';
import { completeJsonWithGemini } from './gemini';
import { buildMappingPrompt, type MappingPromptInput } from './mappingPrompt';
import type { AIProvider } from './types';

export interface MappingSuggestion {
  rawName: string;   // exact raw name from the request
  canonical: string; // proposed canonical item name
}

function completeJson(provider: AIProvider, prompt: string): Promise<string> {
  switch (provider) {
    case 'openai':
      return completeJsonWithOpenAI(prompt);
    case 'gemini':
    default:
      return completeJsonWithGemini(prompt);
  }
}

/**
 * Suggest a canonical mapping for each target raw name using the given provider.
 * Returns at most one suggestion per target; malformed or off-list entries are
 * dropped so callers can trust the shape.
 */
export async function suggestMappings(
  provider: AIProvider,
  input: MappingPromptInput
): Promise<MappingSuggestion[]> {
  const prompt = buildMappingPrompt(input);
  const raw = await completeJson(provider, prompt);
  return parseMappingResponse(raw, input.targets);
}

/** Extract the entries array from either `{ mappings: [...] }` or a bare `[...]`. */
function extractEntries(text: string): unknown[] {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/```\s*$/, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Fall back to grabbing the first {...} or [...] block.
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (!match) throw new Error('AI returned no parseable JSON for mappings');
    parsed = JSON.parse(match[0]);
  }

  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { mappings?: unknown[] }).mappings)) {
    return (parsed as { mappings: unknown[] }).mappings;
  }
  throw new Error('AI mapping response was not in the expected shape');
}

export function parseMappingResponse(text: string, targets: string[]): MappingSuggestion[] {
  const entries = extractEntries(text);

  // Map lowercase raw name -> original target spelling, so we only accept
  // suggestions for names we actually asked about.
  const targetByKey = new Map(targets.map(t => [t.trim().toLowerCase(), t]));
  const seen = new Set<string>();
  const out: MappingSuggestion[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue;
    const { rawName, canonical } = entry as { rawName?: unknown; canonical?: unknown };
    if (typeof rawName !== 'string' || typeof canonical !== 'string') continue;

    const key = rawName.trim().toLowerCase();
    const original = targetByKey.get(key);
    const canonicalTrimmed = canonical.trim();
    if (!original || !canonicalTrimmed || seen.has(key)) continue;

    seen.add(key);
    out.push({ rawName: original, canonical: canonicalTrimmed });
  }

  return out;
}
