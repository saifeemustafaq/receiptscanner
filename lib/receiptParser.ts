interface RawReceiptItem {
  unitPrice?: number | null;
  totalPrice?: number;
  quantity?: number;
  [key: string]: unknown;
}

export interface ParsedReceiptData {
  storeNameScanned: string | null;
  receiptDate: string | null;
  items: RawReceiptItem[];
  total: number;
}

export const receiptJsonSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    storeNameScanned: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    receiptDate: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          quantity: { type: 'number' },
          unitPrice: { anyOf: [{ type: 'number' }, { type: 'null' }] },
          totalPrice: { type: 'number' },
          unit: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        },
        required: ['name', 'quantity', 'totalPrice', 'unitPrice', 'unit'],
        additionalProperties: false,
      },
    },
    total: { type: 'number' },
  },
  required: ['storeNameScanned', 'receiptDate', 'items', 'total'],
  additionalProperties: false,
};

export function parseReceiptResponse(responseText: string): ParsedReceiptData {
  const data = JSON.parse(responseText) as ParsedReceiptData;

  if (!data.items || !Array.isArray(data.items)) {
    throw new Error('Invalid data structure: items array missing');
  }
  if (typeof data.total !== 'number') {
    throw new Error('Invalid data structure: total amount missing');
  }

  data.items = data.items.map((item) => {
    if (
      (item.unitPrice === null || item.unitPrice === undefined) &&
      item.totalPrice &&
      item.quantity
    ) {
      item.unitPrice = parseFloat((item.totalPrice / item.quantity).toFixed(2));
    }
    return item;
  });

  return data;
}
