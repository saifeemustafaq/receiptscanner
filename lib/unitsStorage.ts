import fs from 'fs';
import path from 'path';

const DEFAULT_UNITS = ['g', 'kg', 'oz', 'lb', 'lbs', 'ml', 'l', 'ea', 'pcs', 'ct'];

/**
 * Get units data directory
 */
export function getUnitsDataDir(): string {
  return path.join(process.cwd(), 'data', 'units');
}

/**
 * Ensure data directory exists
 */
export function ensureUnitsDataDirExists(): void {
  const dir = getUnitsDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Get all units from JSON file
 */
export function getAllUnits(): string[] {
  ensureUnitsDataDirExists();
  const filePath = path.join(getUnitsDataDir(), 'units_data.json');
  
  if (!fs.existsSync(filePath)) {
    // If file doesn't exist, initialize with default units
    const defaultUnits = DEFAULT_UNITS;
    saveAllUnits(defaultUnits);
    return defaultUnits;
  }
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const units = JSON.parse(fileContent);
    // Ensure it's an array
    if (Array.isArray(units)) {
      return units;
    }
    return DEFAULT_UNITS;
  } catch (error) {
    console.error('Error reading units data:', error);
    return DEFAULT_UNITS;
  }
}

/**
 * Save all units to JSON file
 */
export function saveAllUnits(units: string[]): boolean {
  ensureUnitsDataDirExists();
  const filePath = path.join(getUnitsDataDir(), 'units_data.json');
  
  try {
    // Ensure units are sorted and unique
    const uniqueUnits = Array.from(new Set(units.map(u => u.toLowerCase().trim()))).filter(u => u !== '').sort();
    fs.writeFileSync(filePath, JSON.stringify(uniqueUnits, null, 2), 'utf-8');
    console.log(`✅ Saved ${uniqueUnits.length} units`);
    return true;
  } catch (error) {
    console.error('Error saving units:', error);
    return false;
  }
}

/**
 * Add a new unit
 */
export function addUnit(unit: string): boolean {
  const trimmed = unit.trim().toLowerCase();
  if (!trimmed) {
    return false;
  }
  
  const allUnits = getAllUnits();
  
  if (allUnits.includes(trimmed)) {
    return false; // Already exists
  }
  
  const newUnits = [...allUnits, trimmed].sort();
  return saveAllUnits(newUnits);
}

/**
 * Delete a unit
 */
export function deleteUnit(unit: string): boolean {
  const allUnits = getAllUnits();
  const filtered = allUnits.filter(u => u !== unit.toLowerCase());
  
  if (filtered.length === allUnits.length) {
    return false; // Unit not found
  }
  
  return saveAllUnits(filtered);
}

/**
 * Discover units from receipts and merge with existing units
 */
export function discoverUnitsFromReceipts(receipts: any[]): string[] {
  const existingUnits = getAllUnits();
  const discoveredUnits = new Set<string>();
  
  // Start with existing units
  existingUnits.forEach(unit => discoveredUnits.add(unit.toLowerCase()));
  
  // Discover units from receipts
  if (Array.isArray(receipts)) {
    receipts.forEach((receipt: any) => {
      if (receipt.extractedData?.items) {
        receipt.extractedData.items.forEach((item: any) => {
          if (item.unit && item.unit.trim() !== '') {
            discoveredUnits.add(item.unit.trim().toLowerCase());
          }
        });
      }
    });
  }
  
  const allUnits = Array.from(discoveredUnits).sort();
  
  // Only save if there are new units
  const hasNewUnits = allUnits.some(unit => !existingUnits.includes(unit));
  if (hasNewUnits) {
    saveAllUnits(allUnits);
  }
  
  return allUnits;
}

