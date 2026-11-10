import { connectToDatabase } from "../db.js";

let sessionsCollection;
let indexesPromise;

export async function ensureSessionIndexes(collection) {
  await Promise.all([
    collection.createIndex(
      { jti: 1 },
      { unique: true, name: "uniq_sessions_jti" },
    ),
    collection.createIndex({ userId: 1 }, { name: "sessions_user_id" }),
    collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: "sessions_expiry_ttl" },
    ),
  ]);
}

export async function getSessionsCollection() {
  const database = await connectToDatabase();
  sessionsCollection ??= database.collection("sessions");

  if (!indexesPromise) {
    indexesPromise = ensureSessionIndexes(sessionsCollection).catch((error) => {
      indexesPromise = undefined;
      throw error;
    });
  }

  await indexesPromise;
  return sessionsCollection;
}
