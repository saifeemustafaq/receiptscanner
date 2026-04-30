/**
 * One-time migration script: copies JSON files from data/ into MongoDB.
 *
 * Usage:
 *   MONGODB_URI=<uri> npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-to-mongo.ts
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is required');
  process.exit(1);
}

// ---- inline schemas (avoids Next.js module resolution issues) ----

const ReceiptItemSchema = new mongoose.Schema({ name: String, quantity: Number, unitPrice: Number, totalPrice: Number, unit: String }, { _id: false });
const ExtractedDataSchema = new mongoose.Schema({ items: [ReceiptItemSchema], total: Number, storeNameScanned: String, receiptDate: String }, { _id: false });
const ReceiptSchema = new mongoose.Schema({ id: { type: String, required: true, unique: true }, storeNameScanned: String, storeNameSelected: { type: String, required: true }, billingDate: String, uploadDate: String, extractedData: ExtractedDataSchema, timestamp: String });
const StoreSchema = new mongoose.Schema({ name: { type: String, required: true, unique: true } });
const UnitSchema = new mongoose.Schema({ name: { type: String, required: true, unique: true, lowercase: true } });

const ReceiptModel = mongoose.model('Receipt', ReceiptSchema);
const StoreModel = mongoose.model('Store', StoreSchema);
const UnitModel = mongoose.model('Unit', UnitSchema);

// ---- helpers ----

function readJSON<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

async function migrate() {
  await mongoose.connect(MONGODB_URI!, { dbName: 'receiptscanner' });
  console.log('Connected to MongoDB');

  const dataDir = path.join(process.cwd(), 'data');

  // Receipts
  const receipts = readJSON<any[]>(path.join(dataDir, 'receipts', 'receipts_data.json')) ?? [];
  if (receipts.length > 0) {
    let inserted = 0;
    for (const r of receipts) {
      try {
        await ReceiptModel.create(r);
        inserted++;
      } catch (e: any) {
        if (e.code === 11000) {
          // duplicate – skip
        } else {
          console.error(`Receipt ${r.id} failed:`, e.message);
        }
      }
    }
    console.log(`Receipts: ${inserted} inserted (${receipts.length - inserted} skipped as duplicates)`);
  } else {
    console.log('Receipts: no data file found, skipping');
  }

  // Stores
  const stores = readJSON<string[]>(path.join(dataDir, 'stores', 'stores_data.json')) ?? [];
  if (stores.length > 0) {
    let inserted = 0;
    for (const name of stores) {
      try {
        await StoreModel.create({ name });
        inserted++;
      } catch (e: any) {
        if (e.code !== 11000) console.error(`Store "${name}" failed:`, e.message);
      }
    }
    console.log(`Stores: ${inserted} inserted`);
  } else {
    console.log('Stores: no data file found, skipping');
  }

  // Units
  const units = readJSON<string[]>(path.join(dataDir, 'units', 'units_data.json')) ?? [];
  if (units.length > 0) {
    let inserted = 0;
    for (const name of units) {
      try {
        await UnitModel.create({ name });
        inserted++;
      } catch (e: any) {
        if (e.code !== 11000) console.error(`Unit "${name}" failed:`, e.message);
      }
    }
    console.log(`Units: ${inserted} inserted`);
  } else {
    console.log('Units: no data file found, skipping');
  }

  await mongoose.disconnect();
  console.log('Migration complete. You can now remove the data/ directory.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
