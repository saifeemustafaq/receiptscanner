import fs from 'fs';
import path from 'path';

/**
 * Get receipts data directory
 */
export function getReceiptsDataDir(): string {
  return path.join(process.cwd(), 'data', 'receipts');
}

/**
 * Ensure data directory exists
 */
export function ensureDataDirExists(): void {
  const dir = getReceiptsDataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Get all receipts from JSON file
 */
export function getAllReceipts(): any[] {
  ensureDataDirExists();
  const filePath = path.join(getReceiptsDataDir(), 'receipts_data.json');
  
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading receipts data:', error);
    return [];
  }
}

/**
 * Save a new receipt
 */
export function saveReceipt(receipt: any): boolean {
  ensureDataDirExists();
  const filePath = path.join(getReceiptsDataDir(), 'receipts_data.json');
  
  try {
    const allReceipts = getAllReceipts();
    allReceipts.push(receipt);
    
    fs.writeFileSync(filePath, JSON.stringify(allReceipts, null, 2), 'utf-8');
    console.log(`✅ Saved receipt ID: ${receipt.id}`);
    return true;
  } catch (error) {
    console.error('Error saving receipt:', error);
    return false;
  }
}

/**
 * Update an existing receipt
 */
export function updateReceipt(receiptId: string, updates: any): boolean {
  ensureDataDirExists();
  const filePath = path.join(getReceiptsDataDir(), 'receipts_data.json');
  
  try {
    const allReceipts = getAllReceipts();
    const index = allReceipts.findIndex((r: any) => r.id === receiptId);
    
    if (index === -1) {
      console.error(`Receipt not found: ${receiptId}`);
      return false;
    }
    
    // Merge updates with existing receipt
    allReceipts[index] = { ...allReceipts[index], ...updates };
    
    fs.writeFileSync(filePath, JSON.stringify(allReceipts, null, 2), 'utf-8');
    console.log(`✅ Updated receipt ID: ${receiptId}`);
    return true;
  } catch (error) {
    console.error('Error updating receipt:', error);
    return false;
  }
}

/**
 * Delete a receipt
 */
export function deleteReceipt(receiptId: string): boolean {
  ensureDataDirExists();
  const filePath = path.join(getReceiptsDataDir(), 'receipts_data.json');
  
  try {
    const allReceipts = getAllReceipts();
    const filtered = allReceipts.filter((r: any) => r.id !== receiptId);
    
    if (filtered.length === allReceipts.length) {
      console.error(`Receipt not found: ${receiptId}`);
      return false;
    }
    
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
    console.log(`✅ Deleted receipt ID: ${receiptId}`);
    return true;
  } catch (error) {
    console.error('Error deleting receipt:', error);
    return false;
  }
}

/**
 * Export receipts to a file
 */
export function exportReceipts(format: 'json' | 'csv' = 'json'): string {
  const allReceipts = getAllReceipts();
  
  if (format === 'json') {
    return JSON.stringify(allReceipts, null, 2);
  }
  
  // CSV format (basic implementation)
  if (allReceipts.length === 0) return '';
  
  const headers = ['ID', 'Store', 'Billing Date', 'Upload Date', 'Total', 'Items Count'];
  const rows = allReceipts.map((r: any) => [
    r.id,
    r.storeNameSelected,
    r.billingDate,
    r.uploadDate,
    r.extractedData.total,
    r.extractedData.items.length
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

