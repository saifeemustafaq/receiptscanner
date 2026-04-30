---
name: MongoDB Migration
overview: Replace all file-based JSON storage (receipts, stores, units) with MongoDB via Mongoose, keeping the existing API contracts and client-side hooks untouched.
todos:
  - id: install-mongoose
    content: Install mongoose package
    status: pending
  - id: db-connect
    content: Create lib/db/mongoose.ts with cached connection using MONGODB_URI
    status: pending
  - id: models
    content: "Create Mongoose models: Receipt, Store, Unit in lib/db/models/"
    status: pending
  - id: rewrite-receipt-storage
    content: Rewrite lib/receiptStorage.ts from fs to async Mongoose
    status: pending
  - id: rewrite-stores-storage
    content: Rewrite lib/storesStorage.ts from fs to async Mongoose
    status: pending
  - id: rewrite-units-storage
    content: Rewrite lib/unitsStorage.ts from fs to async Mongoose
    status: pending
  - id: update-receipts-route
    content: Update app/api/receipts/route.ts to await async storage calls
    status: pending
  - id: update-stores-route
    content: Update app/api/stores/route.ts to await async storage calls
    status: pending
  - id: update-units-route
    content: Update app/api/units/route.ts to await async storage calls
    status: pending
  - id: migration-script
    content: Create scripts/migrate-to-mongo.ts for one-time data migration
    status: pending
  - id: verify-build
    content: Verify TypeScript compiles and app runs correctly
    status: pending
isProject: false
---

# MongoDB Migration Plan

## Architecture

```mermaid
flowchart LR
    subgraph client [Client - Unchanged]
        hooks["useReceipts / useStores / useUnits"]
    end

    subgraph api [API Routes - Minor Changes]
        receiptsRoute["/api/receipts"]
        storesRoute["/api/stores"]
        unitsRoute["/api/units"]
    end

    subgraph dataLayer [Data Layer - Rewritten]
        dbConnect["lib/db/mongoose.ts"]
        models["lib/db/models/"]
        storage["lib/*Storage.ts"]
    end

    subgraph mongo [MongoDB Atlas]
        receiptsCol["receipts collection"]
        storesCol["stores collection"]
        unitsCol["units collection"]
    end

    hooks --> api
    api --> storage
    storage --> dbConnect
    dbConnect --> mongo
    models --> receiptsCol
    models --> storesCol
    models --> unitsCol
```



The client hooks and API route signatures stay identical. Only the three `*Storage.ts` files are rewritten from sync `fs` to async Mongoose calls. API routes become `async` (they already are).

---

## Step 1: Install Dependencies

Add `mongoose` to the project:

```bash
npm install mongoose
```

No other dependencies needed. Mongoose includes its own TypeScript types.

---

## Step 2: Create Database Connection Module

**New file: [lib/db/mongoose.ts*](lib/db/mongoose.ts)*

- Read `MONGODB_URI` from `process.env`
- Use the standard Next.js cached-connection pattern (cache the promise on `globalThis` to avoid multiple connections in dev hot-reload)
- Export a `connectDB()` function that all storage modules call

```typescript
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

let cached = (global as any).__mongoose;
if (!cached) {
  cached = (global as any).__mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { dbName: 'receiptscanner' });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
```

---

## Step 3: Create Mongoose Models

Three models matching the existing data shapes.

### [lib/db/models/Receipt.ts](lib/db/models/Receipt.ts)

Maps to `SavedReceipt` from [lib/types.ts](lib/types.ts). The `id` field from the app (a UUID string) will be stored as a regular field; MongoDB's `_id` is separate.

```typescript
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
```

### [lib/db/models/Store.ts](lib/db/models/Store.ts)

Simple document with a `name` field (unique, case-insensitive).

```typescript
const StoreSchema = new Schema({
  name: { type: String, required: true, unique: true },
});
```

### [lib/db/models/Unit.ts](lib/db/models/Unit.ts)

Simple document with a `name` field (unique, lowercase).

```typescript
const UnitSchema = new Schema({
  name: { type: String, required: true, unique: true, lowercase: true },
});
```

---

## Step 4: Rewrite Storage Modules

Each storage module is rewritten from sync `fs` to async Mongoose calls. **Function signatures change from sync to async** (returning `Promise<...>`), but since the API routes already use `await`, the route code changes minimally.

### [lib/receiptStorage.ts](lib/receiptStorage.ts) -- Rewrite


| Current (sync fs)                     | New (async Mongoose)                           |
| ------------------------------------- | ---------------------------------------------- |
| `getAllReceipts(): SavedReceipt[]`    | `getAllReceipts(): Promise<SavedReceipt[]>`    |
| `saveReceipt(r): boolean`             | `saveReceipt(r): Promise<boolean>`             |
| `updateReceipt(id, updates): boolean` | `updateReceipt(id, updates): Promise<boolean>` |
| `deleteReceipt(id): boolean`          | `deleteReceipt(id): Promise<boolean>`          |
| `exportReceipts(format): string`      | `exportReceipts(format): Promise<string>`      |


Remove `getReceiptsDataDir()`, `ensureDataDirExists()`, all `fs` imports. Each function calls `await connectDB()` first, then uses `Receipt.find()`, `Receipt.create()`, `Receipt.findOneAndUpdate()`, `Receipt.deleteOne()`.

Key mapping: the app's `id` field (UUID string) maps to the `id` field in Mongoose (not `_id`). Use `.lean()` for plain objects and transform `_id` away in returned data.

### [lib/storesStorage.ts](lib/storesStorage.ts) -- Rewrite


| Current                          | New                                       |
| -------------------------------- | ----------------------------------------- |
| `getAllStores(): string[]`       | `getAllStores(): Promise<string[]>`       |
| `saveAllStores(stores): boolean` | `saveAllStores(stores): Promise<boolean>` |
| `addStore(name): boolean`        | `addStore(name): Promise<boolean>`        |
| `deleteStore(name): boolean`     | `deleteStore(name): Promise<boolean>`     |


Seed logic: if `stores` collection is empty on first `getAllStores()`, insert `DEFAULT_STORES`.

### [lib/unitsStorage.ts](lib/unitsStorage.ts) -- Rewrite

Same pattern as stores. `discoverUnitsFromReceipts` will query the `receipts` collection for distinct unit values and merge with existing units.

---

## Step 5: Update API Routes

The API routes already use `async` handlers and `await`. The only changes needed:

- **Add `await`** before storage function calls (they become async).
- **Remove** `runtime = 'nodejs'` if it was only there for `fs` (keep it in `process-receipt/route.ts` which still needs Node for Gemini file upload).
- The response shapes (`{ success, receipts/stores/units, error }`) remain identical.

Files to update:

- [app/api/receipts/route.ts](app/api/receipts/route.ts) -- add `await` to `getAllReceipts()`, `saveReceipt()`, `updateReceipt()`, `deleteReceipt()`, `exportReceipts()`
- [app/api/stores/route.ts](app/api/stores/route.ts) -- add `await` to all storage calls
- [app/api/units/route.ts](app/api/units/route.ts) -- add `await` to all storage calls

---

## Step 6: Environment Variable

The user will add to `.env.local`:

```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/receiptscanner
```

---

## Step 7: Data Migration (Optional)

Create a one-time script `scripts/migrate-to-mongo.ts` that:

1. Reads the existing JSON files from `data/`
2. Connects to MongoDB
3. Inserts all receipts, stores, and units into their collections
4. Reports counts

This preserves existing data. After verification, the `data/` directory can be removed.

---

## What Does NOT Change

- All client-side hooks (`useReceipts`, `useStores`, `useUnits`, `useReceiptProcessing`, `useEditableItems`)
- All React components
- All API request/response contracts
- `lib/types.ts`, `lib/constants.ts`, `lib/formatting.ts`
- `lib/itemsProcessor.ts`, `lib/analyticsUtils.ts` (pure functions operating on `SavedReceipt[]`)
- `app/api/process-receipt/route.ts` (does not touch storage)

