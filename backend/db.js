import { MongoClient } from "mongodb";

let client;
let database;
let connectionPromise;

export async function connectToDatabase() {
  if (database) return database;
  if (connectionPromise) return connectionPromise;

  const uri = process.env.MONGODB_URI;
  const databaseName = process.env.MONGODB_DB;

  if (!uri) throw new Error("MONGODB_URI is required.");
  if (!databaseName) throw new Error("MONGODB_DB is required.");

  connectionPromise = (async () => {
    try {
      client ??= new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
      await client.connect();
      const connectedDatabase = client.db(databaseName);
      await connectedDatabase.command({ ping: 1 });
      database = connectedDatabase;
      return database;
    } catch {
      throw new Error(
        "MongoDB connection failed. Check MONGODB_URI, credentials, and Atlas network access.",
      );
    } finally {
      connectionPromise = undefined;
    }
  })();

  return connectionPromise;
}

export function getDatabase() {
  if (!database) throw new Error("MongoDB is not connected.");
  return database;
}

export async function closeDatabase() {
  const connectedClient = client;
  client = undefined;
  database = undefined;
  connectionPromise = undefined;

  if (connectedClient) await connectedClient.close();
}
