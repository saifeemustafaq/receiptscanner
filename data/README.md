# Receipt Scanner Data Storage

This directory contains all persistent data for the Receipt Scanner application in JSON format.

## Structure

```
data/
├── receipts/
│   └── receipts_data.json    # All receipts stored here
├── stores/
│   └── stores_data.json       # All store names stored here
└── units/
    └── units_data.json        # All measurement units stored here
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

## Stores Data

The `stores/` directory contains user-managed store names.

### stores_data.json

A simple array of store name strings:

```json
[
  "Costco",
  "Kroger",
  "Target",
  "Walmart",
  "Whole Foods"
]
```

- Stores are managed through the Settings page
- New stores can be added manually
- Stores are sorted alphabetically
- Case-insensitive duplicate detection

## Units Data

The `units/` directory contains measurement units used in receipts.

### units_data.json

A simple array of unit strings (lowercase):

```json
[
  "ct",
  "ea",
  "g",
  "kg",
  "lb",
  "lbs",
  "l",
  "ml",
  "oz",
  "pcs"
]
```

- Units are automatically discovered from receipts
- New units can be added manually through the Settings page
- Units are stored in lowercase and sorted alphabetically
- Default units are provided on first run

## Backup

It's recommended to regularly backup all files in this directory. You can also use the "Export All" feature in the app to download receipts.

## Note

All files are managed automatically by the application. Manual edits should be done carefully to maintain JSON validity.

