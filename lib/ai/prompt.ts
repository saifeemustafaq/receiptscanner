/**
 * Options for building the receipt extraction prompt.
 * When `sourceText` is provided, the prompt runs in TEXT mode: the receipt's
 * extracted PDF text is embedded and analyzed directly (no image/OCR). When it
 * is absent, the prompt runs in VISION mode and the receipt content comes from
 * an attached image/PDF.
 */
export interface BuildPromptOptions {
  isPDF: boolean;
  sourceText?: string;
}

/**
 * Build the receipt extraction prompt shared by all AI providers and both
 * extraction modes (text and vision). The model returns ONLY as-printed values
 * (name incl. size text, quantity, printed unit/unitPrice or null, totalPrice,
 * plus subtotal/tax); all pack-size parsing and price normalization happen in
 * deterministic code downstream (lib/measure.ts), not in the prompt. The rules
 * are identical across modes — only the framing and (in text mode) the embedded
 * receipt text differ, so keep them single-sourced here.
 */
export function buildExtractionPrompt({ isPDF, sourceText }: BuildPromptOptions): string {
  const isTextMode = typeof sourceText === 'string' && sourceText.length > 0;

  const documentType = isTextMode
    ? 'receipt text extracted from a PDF (it may span multiple pages; "=== Page N ===" markers separate pages)'
    : isPDF
      ? 'receipt PDF document (which may contain multiple pages)'
      : 'receipt image';

  const multiPageNote = isTextMode
    ? 'IMPORTANT: The receipt text below was extracted from a PDF. Reading order may be imperfect and totals/last items can appear out of order across "=== Page N ===" markers - reconstruct each line item carefully and combine pages that belong to one transaction.\n\n'
    : isPDF
      ? 'IMPORTANT: This is a PDF document. If it contains multiple pages, analyze ALL pages and extract receipt data from each page. Combine items from all pages into a single receipt if they belong to the same transaction, or extract them separately if they are different receipts.\n\n'
      : '';

  const sourceTextBlock = isTextMode
    ? `\nRECEIPT TEXT TO ANALYZE (extracted from the PDF; page markers included):
"""
${sourceText}
"""

`
    : '';

  return `You are an expert receipt data extraction AI. Analyze this ${documentType} and extract ALL information with careful attention to multi-line items and pricing details.

${multiPageNote}CRITICAL INSTRUCTIONS:
1. Extract ALL items with their details from the receipt
2. Extract the DATE from the receipt (very important!)
3. Return ONLY a valid JSON object - no explanations, no markdown code blocks, no extra text
4. For missing or unreadable values, use null
5. For dates, use format: YYYY-MM-DD
6. For currency amounts, use numbers without symbols (e.g., 50.00 not "$50.00")
7. Be precise with decimal numbers for prices
8. Record ONLY what is printed. Do NOT decide "bulk vs packaged", do NOT convert units, and do NOT compute per-gram or per-unit prices - downstream code handles all normalization
9. CRITICAL: Look for multi-line items that should be combined into one item

REQUIRED JSON STRUCTURE:
{
  "storeNameScanned": "detected store name from receipt or null",
  "receiptDate": "YYYY-MM-DD format (date shown on receipt) or null",
  "items": [
    {
      "name": "item name EXACTLY as printed, INCLUDING any size/weight text (e.g. \"Gopi Paneer 226 G\")",
      "quantity": "number from the quantity/count column; default to 1 when none is shown",
      "unitPrice": "the per-unit price PRINTED on the receipt, or null if none is printed (never calculate one)",
      "totalPrice": "the amount actually charged for this line, as a number",
      "unit": "unit of measure PRINTED next to the quantity (e.g., kg, lb, lbs, g, oz, ml, l) or null"
    }
  ],
  "subtotal": "pre-tax subtotal as a number, or null if not printed",
  "tax": "tax amount as a number, or null if not printed",
  "additionalCharges": [
    { "label": "name of the charge exactly as printed (e.g. \"Service Fee\", \"Delivery\", \"Bag Fee\", \"Bottle Deposit\", \"Tip\")", "amount": number }
  ],
  "total": "grand total amount as a number"
}

EXTRACTION RULES:
${isPDF ? '- If the PDF has multiple pages, process ALL pages and extract receipt data from each page\n' : ''}- Extract store name from the top of the receipt
- Extract the DATE from the receipt - look for date/time stamp (usually near top or bottom)
- Convert any date format to YYYY-MM-DD (e.g., "12/10/2025" → "2025-12-10", "Dec 10, 2025" → "2025-12-10")
- For each item, get: name (with any size text), quantity, unit price (only if shown), and total price
- Include units like "kg", "lb", "lbs", "g", "oz", "ea", "pcs" only when printed next to the quantity
- Extract the SUBTOTAL (pre-tax) and TAX amounts when the receipt prints them; otherwise use null
- Extract every NON-ITEM charge between the subtotal and the grand total into "additionalCharges" — service fees, delivery/shipping fees, tips/gratuity, bag fees, bottle deposits/CRV, handling, etc. Use the label exactly as printed and the charged amount. These are NOT line items and NOT tax. Use an empty array [] if there are none. A credit/discount line may be a negative amount.
- The subtotal + tax + all additionalCharges should account for the grand total
- The total should match the receipt's grand total
- Be precise with all decimal numbers
- Extract ALL items visible on the receipt${isPDF ? ' (including items on all pages if multi-page)' : ''}

MULTI-LINE ITEM DETECTION (VERY IMPORTANT):
- Some items span multiple lines on receipts. Look for patterns like:
  * Line 1: "Thai Chilli per lb" (item name)
  * Line 2: "0.10 lb @ $2.99/lb" (quantity/weight and unit price with total)
  * These should be COMBINED into ONE item with:
    - name: "Thai Chilli per lb"
    - quantity: 0.10
    - unit: "lb"
    - unitPrice: 2.99
    - totalPrice: 0.30 (calculated from 0.10 × 2.99)
- Look for lines with @ symbol (e.g., "0.10 lb @ $2.99/lb") - this indicates weight/quantity info for the previous line
- Lines starting with numbers followed by units (lb, kg, oz) often belong to the previous item name

DISCOUNTS & PROMOTIONS (VERY IMPORTANT):
- Some line items show BOTH an original price and a discounted/promotional price via wording like "Buy 6 for $80.60", "Loyalty savings: $4.00", "You saved", or two dollar amounts listed for one item.
- ALWAYS use the ACTUAL CHARGED (discounted) amount as totalPrice - never the higher original/pre-discount amount.
- When an item lists two amounts (e.g. "$203.88" then "$161.20"), the LOWER amount is the charged price after the promo; use it as totalPrice.
- For a promo line, set unitPrice to null (the per-unit price actually charged is not printed) - record only the charged totalPrice. Do NOT calculate a per-unit price.
- NOTE: extracted PDF text has NO strikethrough formatting, so rely on the promo wording and the presence of two amounts to identify the charged (discounted) price.

AS-PRINTED RULES (IMPORTANT):
- Record exactly what the receipt shows for each line. Do NOT reinterpret weights, do NOT convert units, and do NOT compute price-per-gram or price-per-unit. Downstream code parses pack sizes from the name and normalizes prices.
- name: keep the FULL printed name, INCLUDING any pack-size or weight text (e.g., "Shan Ginger Paste 310g", "RED ONION 25LBS", "HALDIRAM'S SAMBAR 283GM/10oz"). Never strip the size, and never move a net-weight figure from the name into quantity.
- quantity: take the number from the quantity/count column. If no quantity is shown, use 1. For a bag/package you buy once, quantity is 1 even if the name contains a weight.
- unit: set this ONLY to a unit printed next to a measured quantity (e.g., "0.10 lb @ $2.99/lb" -> unit "lb"). If the line is just a name and a price, use null.
- unitPrice: the per-unit price the receipt prints (e.g., "@ $2.99/lb" -> 2.99). If no per-unit price is printed, use null - do NOT calculate one.
- totalPrice: the amount actually charged for the line.
- Example patterns:
  * "0.10 lb @ $2.99/lb   $0.30" -> quantity 0.10, unit "lb", unitPrice 2.99, totalPrice 0.30
  * "Mushroom Box   $1.99" -> quantity 1, unit null, unitPrice null, totalPrice 1.99
  * "Gopi Paneer 226 G   $4.49" -> name "Gopi Paneer 226 G", quantity 1, unit null, unitPrice null, totalPrice 4.49

DATE EXTRACTION TIPS:
- Look at the top of the receipt for date/time
- Look at the bottom near transaction details
- Common formats: MM/DD/YYYY, DD/MM/YYYY, Month DD, YYYY
- Always convert to YYYY-MM-DD format

EXAMPLES:
Example 1 - Multi-line item with weight:
Receipt shows:
  "Thai Chilli per lb"
  "0.10 lb @ $2.99/lb         $0.30"
Extract as ONE item:
{
  "name": "Thai Chilli per lb",
  "quantity": 0.10,
  "unitPrice": 2.99,
  "totalPrice": 0.30,
  "unit": "lb"
}

Example 2 - Simple fixed-price item (no weight):
Receipt shows:
  "Mushroom Box     $1.99"
Extract as:
{
  "name": "Mushroom Box",
  "quantity": 1,
  "unitPrice": 1.99,
  "totalPrice": 1.99,
  "unit": null
}

Example 3 - Item with size text in the name (record exactly as printed):
Receipt shows:
  "Gopi Paneer 226 G    $4.49"
Extract as:
{
  "name": "Gopi Paneer 226 G",
  "quantity": 1,
  "unitPrice": null,
  "totalPrice": 4.49,
  "unit": null
}
(Note: KEEP "226 G" in the name and set quantity to 1 (one package). Do NOT put 226 into quantity, do NOT set unit, and do NOT compute a per-gram price - downstream code parses the size from the name and normalizes prices.)

Example 4 - Discounted/promo item (use the charged price, not the original):
Receipt shows:
  "Chaokoh - Coconut Milk - # 10 can (98 fl oz)"
  "12 x $16.99"
  "✓ Buy 6 for $80.60"
  "$203.88"
  "$161.20"
Extract as:
{
  "name": "Chaokoh - Coconut Milk - # 10 can (98 fl oz)",
  "quantity": 12,
  "unitPrice": null,
  "totalPrice": 161.20,
  "unit": null
}
(Note: $203.88 is the pre-discount original; $161.20 is the charged promo price. Use the LOWER charged amount as totalPrice. Set unitPrice to null because the per-unit price actually charged is not printed.)
${sourceTextBlock}
OUTPUT: Return ONLY the JSON object, nothing else.`;
}
