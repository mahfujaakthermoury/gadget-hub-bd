import "dotenv/config";
import { closeDatabase, connectToDatabase } from "../db.js";
import { categories as seedCategories } from "../../src/data/categories.js";
import { products as seedProducts } from "../../src/data/products.js";

try {
  const database = await connectToDatabase();
  const products = database.collection("products");
  const categories = database.collection("categories");
  const [productCount, categoryCount] = await Promise.all([
    products.countDocuments(),
    categories.countDocuments(),
  ]);
  if (productCount || categoryCount) {
    throw new Error(
      "Catalog collections are not empty. Refusing to overwrite existing data.",
    );
  }

  const now = new Date();
  await Promise.all([
    products.insertMany(
      seedProducts.map((product) => ({
        ...product,
        images: [product.image],
        active: true,
        available: true,
        createdAt: now,
        updatedAt: now,
      })),
    ),
    categories.insertMany(
      seedCategories.map((category) => ({
        ...category,
        active: true,
        createdAt: now,
        updatedAt: now,
      })),
    ),
  ]);
  console.log(
    `Seeded ${seedProducts.length} products and ${seedCategories.length} categories.`,
  );
} catch (error) {
  console.error(`Catalog seeding failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
