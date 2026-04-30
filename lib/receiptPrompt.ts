export function buildReceiptPrompt(isPDF: boolean): string {
  const documentType = isPDF
    ? 'receipt PDF document (which may contain multiple pages)'
    : 'receipt image';

  return `You are an expert receipt data extraction AI. Analyze this ${documentType} and extract ALL information with careful attention to multi-line items and pricing details.

${isPDF ? 'IMPORTANT: This is a PDF document. If it contains multiple pages, analyze ALL pages and extract receipt data from each page. Combine items from all pages into a single receipt if they belong to the same transaction, or extract them separately if they are different receipts.\n\n' : ''}CRITICAL INSTRUCTIONS:
1. Extract ALL items with their details from the receipt
2. Extract the DATE from the receipt (very important!)
3. Return ONLY a valid JSON object - no explanations, no markdown code blocks, no extra text
4. For missing or unreadable values, use null
5. For dates, use format: YYYY-MM-DD
6. For currency amounts, use numbers without symbols (e.g., 50.00 not "$50.00")
7. Be precise with decimal numbers for prices
8. CRITICAL: Look for multi-line items that should be combined into one item

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
      "unit": "unit type (e.g., kg, lb, lbs, g, oz, pcs, ea) or null"
    }
  ],
  "total": total amount as number
}

EXTRACTION RULES:
${isPDF ? '- If the PDF has multiple pages, process ALL pages and extract receipt data from each page\n' : ''}- Extract store name from the top of the receipt
- Extract the DATE from the receipt - look for date/time stamp (usually near top or bottom)
- Convert any date format to YYYY-MM-DD (e.g., "12/10/2025" → "2025-12-10", "Dec 10, 2025" → "2025-12-10")
- For each item, get: name, quantity, unit price (if shown), and total price
- Include units like "kg", "lb", "lbs", "g", "oz", "ea", "pcs" if specified
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

QUANTITY & UNIT PRICE CALCULATION:
- CRITICAL: Distinguish between BULK/LOOSE items and PACKAGED items:

  BULK/LOOSE ITEMS (extract weight/quantity from name):
  * Items sold by weight/volume where the quantity varies (e.g., "Gopi Paneer 226 G", "Shan Ginger Paste 310g", "Shastha Dosa Batter 64oz")
  * Keep the FULL item name including the weight (e.g., "Gopi Paneer 226 G")
  * Extract the numeric quantity (226, 310, 64, etc.)
  * Extract the unit (g, kg, oz, lb, ml, l, etc.)
  * Calculate unitPrice = totalPrice / quantity (e.g., $4.49 / 226 = $0.0199 per gram)
  * This allows proper price comparison across different package sizes

  PACKAGED ITEMS (treat as single unit):
  * Items with brand names and fixed package sizes where you buy 1 package (e.g., "HALDIRAM'S SAMBAR 283GM/10oz", "Britannia 50-50 Sweet&Salty")
  * The weight in the name is NET WEIGHT (descriptive), not the purchase quantity
  * quantity: 1 (you're buying 1 package)
  * unit: null (not sold by weight)
  * unitPrice: same as totalPrice (price per package)
  * Keep the full name with weight for reference, but don't extract it as quantity

- If you see patterns like "0.10 lb @ $2.99/lb", extract:
  * quantity: 0.10
  * unit: "lb"
  * unitPrice: 2.99 (price per pound)
  * totalPrice: calculate from quantity × unitPrice or use shown price
- For simple items without weight info (like "Mushroom Box $1.99"):
  * quantity: 1
  * unit: null
  * unitPrice: same as totalPrice

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

Example 3 - Bulk item with weight in name (extract weight as quantity):
Receipt shows:
  "Gopi Paneer 226 G    $4.49"
Extract as:
{
  "name": "Gopi Paneer 226 G",
  "quantity": 226,
  "unitPrice": 0.0199,
  "totalPrice": 4.49,
  "unit": "g"
}
(Note: unitPrice = 4.49 / 226 = $0.0199 per gram. This is a bulk item where weight = purchase quantity)

Example 4 - Packaged item with brand name (treat as 1 package):
Receipt shows:
  "HALDIRAM'S SAMBAR 283GM/10oz    $3.49"
Extract as:
{
  "name": "HALDIRAM'S SAMBAR 283GM/10oz",
  "quantity": 1,
  "unitPrice": 3.49,
  "totalPrice": 3.49,
  "unit": null
}
(Note: This is a PACKAGED item. The 283GM is NET WEIGHT (descriptive), not purchase quantity. You're buying 1 package. quantity = 1, unit = null)

Example 5 - Another bulk item with weight in name:
Receipt shows:
  "Shan Ginger Garlic Paste 310g    $3.99"
Extract as:
{
  "name": "Shan Ginger Garlic Paste 310g",
  "quantity": 310,
  "unitPrice": 0.0129,
  "totalPrice": 3.99,
  "unit": "g"
}
(Note: unitPrice = 3.99 / 310 = $0.0129 per gram. This is a bulk item where weight = purchase quantity)

Example 6 - Packaged item with brand (treat as 1 package):
Receipt shows:
  "Britannia 50-50 Sweet&Salty 200g    $4.49"
Extract as:
{
  "name": "Britannia 50-50 Sweet&Salty 200g",
  "quantity": 1,
  "unitPrice": 4.49,
  "totalPrice": 4.49,
  "unit": null
}
(Note: Brand name indicates packaged item. The 200g is net weight, not purchase quantity. quantity = 1, unit = null)

Example 7 - Item with ounces (bulk item):
Receipt shows:
  "Shastha Dosa Batter 64oz    $10.99"
Extract as:
{
  "name": "Shastha Dosa Batter 64oz",
  "quantity": 64,
  "unitPrice": 0.1717,
  "totalPrice": 10.99,
  "unit": "oz"
}
(Note: This is a bulk item where weight = purchase quantity)

RULE OF THUMB:
- Items with BRAND NAMES (HALDIRAM'S, Britannia, Shan, etc.) = PACKAGED items → quantity = 1, unit = null
- Generic items or items without brand names = BULK items → extract weight as quantity

OUTPUT: Return ONLY the JSON object, nothing else.`;
}
