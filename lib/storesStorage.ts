import fs from 'fs';
import path from 'path';

const DEFAULT_STORES = ['Walmart', 'Target', 'Costco', 'Whole Foods', 'Kroger'];

/**
 * Get stores data directory
 */
export function getStoresDataDir(): string {
  return path.join(process.cwd(), 'data', 'stores');
}

/**
 * Ensure data directory exists
 */
export function ensureStoresDataDirExists(): void {
  const dir = getStoresDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Get all stores from JSON file
 */
export function getAllStores(): string[] {
  ensureStoresDataDirExists();
  const filePath = path.join(getStoresDataDir(), 'stores_data.json');
  
  if (!fs.existsSync(filePath)) {
    // If file doesn't exist, initialize with default stores
    const defaultStores = DEFAULT_STORES;
    saveAllStores(defaultStores);
    return defaultStores;
  }
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const stores = JSON.parse(fileContent);
    // Ensure it's an array
    if (Array.isArray(stores)) {
      return stores;
    }
    return DEFAULT_STORES;
  } catch (error) {
    console.error('Error reading stores data:', error);
    return DEFAULT_STORES;
  }
}

/**
 * Save all stores to JSON file
 */
export function saveAllStores(stores: string[]): boolean {
  ensureStoresDataDirExists();
  const filePath = path.join(getStoresDataDir(), 'stores_data.json');
  
  try {
    // Ensure stores are unique and filter out empty strings
    const uniqueStores = Array.from(new Set(stores.map(s => s.trim()))).filter(s => s !== '').sort();
    fs.writeFileSync(filePath, JSON.stringify(uniqueStores, null, 2), 'utf-8');
    console.log(`✅ Saved ${uniqueStores.length} stores`);
    return true;
  } catch (error) {
    console.error('Error saving stores:', error);
    return false;
  }
}

/**
 * Add a new store
 */
export function addStore(storeName: string): boolean {
  const trimmed = storeName.trim();
  if (!trimmed) {
    return false;
  }
  
  const allStores = getAllStores();
  
  // Check case-insensitive for duplicates
  const lowerCased = trimmed.toLowerCase();
  if (allStores.some(s => s.toLowerCase() === lowerCased)) {
    return false; // Already exists
  }
  
  const newStores = [...allStores, trimmed].sort();
  return saveAllStores(newStores);
}

/**
 * Delete a store
 */
export function deleteStore(storeName: string): boolean {
  const allStores = getAllStores();
  // Case-insensitive deletion
  const filtered = allStores.filter(s => s.toLowerCase() !== storeName.toLowerCase());
  
  if (filtered.length === allStores.length) {
    return false; // Store not found
  }
  
  return saveAllStores(filtered);
}

