import { connectToDatabase } from "../db.js";

let ordersCollection;
let indexesPromise;

export async function getOrdersCollection() {
  const database = await connectToDatabase();
  ordersCollection ??= database.collection("orders");

  if (!indexesPromise) {
    indexesPromise = Promise.all([
      ordersCollection.createIndex(
        { customerId: 1, createdAt: -1 },
        { name: "orders_customer_created" },
      ),
      ordersCollection.createIndex(
        { status: 1, paymentStatus: 1, createdAt: -1 },
        { name: "orders_status_payment_created" },
      ),
      ordersCollection.createIndex(
        { paymentStatus: 1, paymentVerifiedAt: 1 },
        { name: "orders_verified_payment_date" },
      ),
    ]).catch((error) => {
      indexesPromise = undefined;
      throw error;
    });
  }

  await indexesPromise;
  return ordersCollection;
}
