export interface StoreMatchResult {
  match: string;
  confidence: 'exact' | 'high' | 'none';
}

const STRIP_PATTERNS = [
  /#\d+/g,
  /\b(supercenter|superstore|supermarket|marketplace|express|inc|llc|corp|co\.?|store|stores|pharmacy)\b/g,
];

function normalize(name: string): string {
  let s = name.toLowerCase().trim();
  for (const pattern of STRIP_PATTERNS) {
    s = s.replace(pattern, ' ');
  }
  return s.replace(/\s+/g, ' ').trim();
}

export function toTitleCase(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function findClosestStore(scannedName: string, stores: string[]): StoreMatchResult {
  if (!scannedName || stores.length === 0) return { match: '', confidence: 'none' };

  const normalizedScanned = normalize(scannedName);

  for (const store of stores) {
    if (normalize(store) === normalizedScanned) {
      return { match: store, confidence: 'exact' };
    }
  }

  for (const store of stores) {
    const normalizedStore = normalize(store);
    if (normalizedScanned.includes(normalizedStore) || normalizedStore.includes(normalizedScanned)) {
      return { match: store, confidence: 'high' };
    }
  }

  return { match: '', confidence: 'none' };
}
