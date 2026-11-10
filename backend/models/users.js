import { connectToDatabase } from "../db.js";

let usersCollection;
let indexesPromise;

export function ensureUserIndexes(collection) {
  return collection.createIndex(
    { emailNormalized: 1 },
    { unique: true, name: "uniq_users_email_normalized" },
  );
}

export async function getUsersCollection() {
  const database = await connectToDatabase();
  usersCollection ??= database.collection("users");

  if (!indexesPromise) {
    indexesPromise = ensureUserIndexes(usersCollection).catch((error) => {
      indexesPromise = undefined;
      throw error;
    });
  }

  await indexesPromise;
  return usersCollection;
}
