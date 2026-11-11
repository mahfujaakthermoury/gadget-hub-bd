import { getDatabase } from "../db.js";

export function getProductsCollection() {
  return getDatabase().collection("products");
}

export function getCategoriesCollection() {
  return getDatabase().collection("categories");
}
