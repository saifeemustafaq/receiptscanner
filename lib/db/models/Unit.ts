import mongoose, { Schema, Model } from 'mongoose';

interface UnitDoc {
  name: string;
}

const UnitSchema = new Schema<UnitDoc>({
  name: { type: String, required: true, unique: true, lowercase: true },
});

export const Unit: Model<UnitDoc> =
  (mongoose.models.Unit as Model<UnitDoc>) ||
  mongoose.model<UnitDoc>('Unit', UnitSchema);
