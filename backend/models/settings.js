import { getDatabase } from "../db.js";

export async function getSettingsCollection() {
  const database = await getDatabase();
  return database.collection("settings");
}

export async function getAdminLogsCollection() {
  const database = await getDatabase();
  return database.collection("adminLogs");
}
