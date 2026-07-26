/**
 * Prompt builder for AI-assisted item mapping.
 *
 * Given a batch of raw scanned item names, plus the existing canonical items and
 * mappings for context, the model proposes a canonical name for each raw name.
 * The output is only SUGGESTED — the user reviews and can edit every row before
 * anything is applied (see AiMappingPanel).
 *
 * The guiding rule is CONSERVATIVE: strip brand/size/packaging noise but keep
 * distinctions that make something a genuinely different product (e.g. Red vs
 * Yellow vs White Onion). Over-merging loses data and is hard to undo; the user
 * can always collapse further by editing a suggestion.
 */

export interface MappingPromptInput {
  /** Raw scanned names that need a canonical mapping. */
  targets: string[];
  /** Existing canonical item names — prefer these when a raw name fits one. */
  existingItems: string[];
  /** Existing raw→canonical mappings, shown as style examples. */
  existingMappings: { rawName: string; canonicalName: string }[];
}

export function buildMappingPrompt({
  targets,
  existingItems,
  existingMappings,
}: MappingPromptInput): string {
  const itemsBlock = existingItems.length
    ? existingItems.map(n => `- ${n}`).join('\n')
    : '(none yet)';

  const mapsBlock = existingMappings.length
    ? existingMappings.map(m => `- "${m.rawName}" => "${m.canonicalName}"`).join('\n')
    : '(none yet)';

  const targetsBlock = targets.map((t, i) => `${i + 1}. "${t}"`).join('\n');

  return `You organize a grocery price tracker. Each scanned receipt line has a raw item name; we group purchases under a shared "canonical" item so prices can be compared over time.

TASK: For each RAW NAME listed below, choose the best canonical item name.

RULES:
- Prefer an EXISTING canonical item from the list when the raw name is genuinely the SAME product — reuse its exact spelling.
- Otherwise propose a NEW, concise canonical name (usually 1-4 words, human-readable).
- STRIP noise: brand/vendor names, sizes/weights/counts (e.g. "25 lb", "12 ct", "Half Gallon", "2.5 lbs"), and packaging words ("bag", "pack", "box", "case").
- PRESERVE any attribute that makes it a genuinely DIFFERENT product to a shopper. This is the most important rule:
  * Color or variety that denotes a different produce item — "Red Onion", "Yellow Onion", and "White Onion" are THREE DIFFERENT items. NEVER merge them into just "Onion".
  * Form/cut — whole vs ground vs sliced vs shredded.
  * Meaningful type — fat content (whole vs skim milk), salted vs unsalted, organic vs conventional.
- Be CONSERVATIVE: if you are unsure whether two things are the same product, KEEP THEM SEPARATE. Under-merging is trivial for the user to fix; over-merging destroys data.
- Use the SAME canonical for two raw names in this batch ONLY if they are truly the same product.
- Match the naming style of the existing items and mappings shown below.
- If a raw name is an opaque code with no product hint, propose your best cleaned guess — the user will correct it.

EXISTING CANONICAL ITEMS (prefer these when they fit):
${itemsBlock}

EXISTING MAPPINGS (examples of the intended style):
${mapsBlock}

RAW NAMES TO MAP:
${targetsBlock}

Return ONLY a JSON object of this exact shape, with one entry per raw name and no extra text:
{ "mappings": [ { "rawName": "<exact raw name from the list>", "canonical": "<canonical item name>" } ] }`;
}
