

### **Project Overview**

We are building a simple mobile-first web application (also accessible via desktop browsers) with a clean and minimal interface. The core functionality of the app is to allow users to **scan or upload receipts** and automatically extract itemized purchase details.

---

### **Receipt Upload & Storage Workflow**

1. **Input Options**

   * The user can either **scan a receipt using their device camera** or **upload an existing receipt image**.
   * Once uploaded or scanned, the receipt file will be **stored in cloud storage**, preferably **Google Drive** (initially chosen due to its free-tier availability).

2. **Store Selection**

   * After the receipt is captured, the user will be prompted to **select the store** where the purchase was made.
   * The user can choose from a **dropdown list** of existing stores.
   * If the store is not listed, the user can **add a new store**, which will then be saved for future use.
   * the date when this purchase was made.

---

### **Receipt Processing with Gemini**

3. **Automated Data Extraction**

   * Simultaneously with storage, the receipt image will be sent to **Google Gemini** for processing.
   * Gemini should extract:

     * Item names
     * Item prices
     * Quantity purchased
     * Line totals
     * Any unit‐based pricing (e.g., price per unit, weight-based prices)
     * The total amount of the receipt
   * The extraction logic must handle cases where:

     * Both **price per unit** and **total price** appear
     * Quantities are written in different formats (e.g., units, weight, packs)

The scanned information will then be stored in JSON for now, with store name scanned, store name selected by the user, and the item details which is as mentioned above.

