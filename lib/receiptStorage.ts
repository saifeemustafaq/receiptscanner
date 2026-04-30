import { connectDB } from './db/mongoose';
import { Receipt } from './db/models/Receipt';
import { SavedReceipt } from './types';

export async function getAllReceipts(): Promise<SavedReceipt[]> {
  await connectDB();
  const docs = await Receipt.find({}).lean();
  return docs.map(({ _id, __v, ...rest }) => rest as SavedReceipt);
}

export async function saveReceipt(receipt: SavedReceipt): Promise<boolean> {
  await connectDB();
  try {
    await Receipt.create(receipt);
    return true;
  } catch (error) {
    console.error('Error saving receipt:', error);
    return false;
  }
}

export async function updateReceipt(receiptId: string, updates: Partial<SavedReceipt>): Promise<boolean> {
  await connectDB();
  try {
    const result = await Receipt.findOneAndUpdate({ id: receiptId }, { $set: updates });
    if (!result) {
      console.error(`Receipt not found: ${receiptId}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error updating receipt:', error);
    return false;
  }
}

export async function deleteReceipt(receiptId: string): Promise<boolean> {
  await connectDB();
  try {
    const result = await Receipt.deleteOne({ id: receiptId });
    if (result.deletedCount === 0) {
      console.error(`Receipt not found: ${receiptId}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error deleting receipt:', error);
    return false;
  }
}

export async function exportReceipts(format: 'json' | 'csv' = 'json'): Promise<string> {
  const allReceipts = await getAllReceipts();

  if (format === 'json') {
    return JSON.stringify(allReceipts, null, 2);
  }

  if (allReceipts.length === 0) return '';

  const headers = ['ID', 'Store', 'Billing Date', 'Upload Date', 'Total', 'Items Count'];
  const rows = allReceipts.map((r) => [
    r.id,
    r.storeNameSelected,
    r.billingDate,
    r.uploadDate,
    r.extractedData.total,
    r.extractedData.items.length,
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}
