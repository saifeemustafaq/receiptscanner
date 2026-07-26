import fs from 'fs';
import path from 'path';
import type { ItemMapping } from './itemMappings';
import { normalizeItemName } from './itemMappings';

/**
 * Get mappings data directory
 */
export function getMappingsDataDir(): string {
  return path.join(process.cwd(), 'data', 'mappings');
}

/**
 * Ensure data directory exists
 */
export function ensureMappingsDataDirExists(): void {
  const dir = getMappingsDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Get all item mappings from JSON file. Missing file is seeded with an empty
 * list (there are no default mappings — they are learned by the user).
 */
export function getAllMappings(): ItemMapping[] {
  ensureMappingsDataDirExists();
  const filePath = path.join(getMappingsDataDir(), 'mappings_data.json');

  if (!fs.existsSync(filePath)) {
    saveAllMappings([]);
    return [];
  }

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const mappings = JSON.parse(fileContent);
    return Array.isArray(mappings) ? mappings : [];
  } catch (error) {
    console.error('Error reading mappings data:', error);
    return [];
  }
}

/**
 * Save all item mappings to JSON file
 */
export function saveAllMappings(mappings: ItemMapping[]): boolean {
  ensureMappingsDataDirExists();
  const filePath = path.join(getMappingsDataDir(), 'mappings_data.json');

  try {
    fs.writeFileSync(filePath, JSON.stringify(mappings, null, 2), 'utf-8');
    console.log(`✅ Saved ${mappings.length} item mappings`);
    return true;
  } catch (error) {
    console.error('Error saving mappings:', error);
    return false;
  }
}

/**
 * Add or update a mapping (upsert by normalized raw name). A raw name maps to
 * exactly one canonical name; re-associating overwrites the existing target.
 * Self-maps (raw already equals canonical) are ignored — nothing to learn.
 */
export function addMapping(rawName: string, canonicalName: string): boolean {
  const trimmedRaw = rawName.trim();
  const trimmedCanonical = canonicalName.trim();
  if (!trimmedRaw || !trimmedCanonical) {
    return false;
  }

  const normalizedRaw = normalizeItemName(trimmedRaw);
  if (normalizeItemName(trimmedCanonical) === normalizedRaw) {
    return false;
  }

  const now = new Date().toISOString();
  const allMappings = getAllMappings();
  const existing = allMappings.find(m => m.normalizedRaw === normalizedRaw);

  if (existing) {
    existing.rawName = trimmedRaw;
    existing.canonicalName = trimmedCanonical;
    existing.updatedAt = now;
  } else {
    allMappings.push({
      normalizedRaw,
      rawName: trimmedRaw,
      canonicalName: trimmedCanonical,
      createdAt: now,
      updatedAt: now,
    });
  }

  return saveAllMappings(allMappings);
}

/**
 * Delete a mapping by its normalized raw name.
 */
export function deleteMapping(normalizedRaw: string): boolean {
  const key = normalizeItemName(normalizedRaw);
  const allMappings = getAllMappings();
  const filtered = allMappings.filter(m => m.normalizedRaw !== key);

  if (filtered.length === allMappings.length) {
    return false; // Not found
  }

  return saveAllMappings(filtered);
}
