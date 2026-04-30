import { connectDB } from './db/mongoose';
import { Store } from './db/models/Store';
import { DEFAULT_STORES } from './constants';

export async function getAllStores(): Promise<string[]> {
  await connectDB();
  const docs = await Store.find({}).lean();
  if (docs.length === 0) {
    await saveAllStores(DEFAULT_STORES);
    return DEFAULT_STORES.slice().sort();
  }
  return docs.map(d => d.name).sort();
}

export async function saveAllStores(stores: string[]): Promise<boolean> {
  await connectDB();
  try {
    const unique = Array.from(new Set(stores.map(s => s.trim()))).filter(Boolean);
    await Store.deleteMany({});
    if (unique.length > 0) {
      await Store.insertMany(unique.map(name => ({ name })));
    }
    return true;
  } catch (error) {
    console.error('Error saving stores:', error);
    return false;
  }
}

export async function addStore(storeName: string): Promise<boolean> {
  const trimmed = storeName.trim();
  if (!trimmed) return false;
  await connectDB();
  try {
    const existing = await Store.findOne({ name: new RegExp(`^${trimmed}$`, 'i') });
    if (existing) return false;
    await Store.create({ name: trimmed });
    return true;
  } catch (error) {
    console.error('Error adding store:', error);
    return false;
  }
}

export async function deleteStore(storeName: string): Promise<boolean> {
  await connectDB();
  try {
    const result = await Store.deleteOne({ name: new RegExp(`^${storeName}$`, 'i') });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting store:', error);
    return false;
  }
}
