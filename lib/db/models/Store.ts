import mongoose, { Schema, Model } from 'mongoose';

interface StoreDoc {
  name: string;
}

const StoreSchema = new Schema<StoreDoc>({
  name: { type: String, required: true, unique: true },
});

export const Store: Model<StoreDoc> =
  (mongoose.models.Store as Model<StoreDoc>) ||
  mongoose.model<StoreDoc>('Store', StoreSchema);
