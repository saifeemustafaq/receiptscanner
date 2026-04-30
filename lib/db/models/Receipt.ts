import mongoose, { Schema, Model } from 'mongoose';
import { SavedReceipt } from '@/lib/types';

const ReceiptItemSchema = new Schema({
  name: String,
  quantity: Number,
  unitPrice: Number,
  totalPrice: Number,
  unit: String,
}, { _id: false });

const ExtractedDataSchema = new Schema({
  items: [ReceiptItemSchema],
  total: Number,
  storeNameScanned: String,
  receiptDate: String,
}, { _id: false });

const ReceiptSchema = new Schema({
  id: { type: String, required: true, unique: true },
  storeNameScanned: String,
  storeNameSelected: { type: String, required: true },
  billingDate: String,
  uploadDate: String,
  extractedData: ExtractedDataSchema,
  timestamp: String,
}, { timestamps: false });

export const Receipt: Model<SavedReceipt> =
  (mongoose.models.Receipt as Model<SavedReceipt>) ||
  mongoose.model<SavedReceipt>('Receipt', ReceiptSchema);
