import { getDatabase } from "../db.js";

let collection;
let indexesPromise;

export async function getInventoryAdjustmentsCollection() {
  const database = await getDatabase();
  collection ??= database.collection("inventoryAdjustments");
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      collection.createIndex(
        { productId: 1, createdAt: -1 },
        { name: "inventory_adjustments_product_created" },
      ),
      collection.createIndex(
        { adminId: 1, createdAt: -1 },
        { name: "inventory_adjustments_admin_created" },
      ),
    ]).catch((error) => {
      indexesPromise = undefined;
      throw error;
    });
  }
  await indexesPromise;
  return collection;
}
