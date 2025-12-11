# Receipt Data Storage

This directory contains all saved receipt data in JSON format.

## Structure

```
data/
└── receipts/
    └── receipts_data.json    # All receipts stored here
```

## Data Format

Each receipt is stored with the following structure:

```json
{
  "id": "1702384800000",
  "storeNameScanned": "Walmart Supercenter",
  "storeNameSelected": "Walmart",
  "billingDate": "2025-12-10",
  "uploadDate": "2025-12-10",
  "extractedData": {
    "storeNameScanned": "Walmart Supercenter",
    "items": [
      {
        "name": "Milk",
        "quantity": 1,
        "unitPrice": 3.99,
        "totalPrice": 3.99,
        "unit": "gal"
      }
    ],
    "total": 3.99
  },
  "timestamp": "2025-12-10T12:00:00.000Z"
}
```

## Fields Explained

- **id**: Unique identifier (timestamp)
- **storeNameScanned**: Store name detected by AI from receipt
- **storeNameSelected**: Store name chosen/confirmed by user
- **billingDate**: Date shown on the receipt (when purchase was made)
- **uploadDate**: Date when receipt was uploaded to the system
- **extractedData**: Complete AI-extracted data including all items
- **timestamp**: Server timestamp when saved

## Backup

It's recommended to regularly backup this file. You can also use the "Export All" feature in the app to download receipts.

## Note

This file is managed automatically by the application. Manual edits should be done carefully to maintain JSON validity.

