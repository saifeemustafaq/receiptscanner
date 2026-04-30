import { connectDB } from './db/mongoose';
import { Unit } from './db/models/Unit';
import { DEFAULT_UNITS } from './constants';
import { SavedReceipt } from './types';

export async function getAllUnits(): Promise<string[]> {
  await connectDB();
  const docs = await Unit.find({}).lean();
  if (docs.length === 0) {
    await saveAllUnits(DEFAULT_UNITS);
    return DEFAULT_UNITS.slice().sort();
  }
  return docs.map(d => d.name).sort();
}

export async function saveAllUnits(units: string[]): Promise<boolean> {
  await connectDB();
  try {
    const unique = Array.from(new Set(units.map(u => u.toLowerCase().trim()))).filter(Boolean);
    await Unit.deleteMany({});
    if (unique.length > 0) {
      await Unit.insertMany(unique.map(name => ({ name })));
    }
    return true;
  } catch (error) {
    console.error('Error saving units:', error);
    return false;
  }
}

export async function addUnit(unit: string): Promise<boolean> {
  const trimmed = unit.trim().toLowerCase();
  if (!trimmed) return false;
  await connectDB();
  try {
    const existing = await Unit.findOne({ name: trimmed });
    if (existing) return false;
    await Unit.create({ name: trimmed });
    return true;
  } catch (error) {
    console.error('Error adding unit:', error);
    return false;
  }
}

export async function deleteUnit(unit: string): Promise<boolean> {
  await connectDB();
  try {
    const result = await Unit.deleteOne({ name: unit.toLowerCase() });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting unit:', error);
    return false;
  }
}

export async function discoverUnitsFromReceipts(receipts: SavedReceipt[]): Promise<string[]> {
  const existingUnits = await getAllUnits();
  const discovered = new Set<string>(existingUnits);

  if (Array.isArray(receipts)) {
    receipts.forEach((receipt) => {
      receipt.extractedData?.items?.forEach((item) => {
        if (item.unit?.trim()) {
          discovered.add(item.unit.trim().toLowerCase());
        }
      });
    });
  }

  const allUnits = Array.from(discovered).sort();
  const hasNew = allUnits.some(u => !existingUnits.includes(u));
  if (hasNew) {
    await saveAllUnits(allUnits);
  }
  return allUnits;
}
