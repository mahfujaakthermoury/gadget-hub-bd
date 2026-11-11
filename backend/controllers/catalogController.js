import { ObjectId } from "mongodb";
import {
  getCategoriesCollection,
  getProductsCollection,
} from "../models/catalog.js";

const productFields = new Set([
  "name",
  "description",
  "price",
  "oldPrice",
  "category",
  "image",
  "images",
  "brand",
  "stockQuantity",
  "available",
  "active",
  "rating",
  "reviews",
  "badge",
  "badgeTone",
]);
const categoryFields = new Set([
  "name",
  "slug",
  "description",
  "image",
  "featured",
  "popular",
  "active",
]);
const sortableProductFields = new Set([
  "name",
  "price",
  "rating",
  "reviews",
  "createdAt",
  "updatedAt",
]);

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function readPage(value, fallback, maximum) {
  if (value === undefined) return fallback;
  if (!/^\d+$/u.test(value)) throw httpError(400, "Invalid pagination values.");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw httpError(400, "Invalid pagination values.");
  }
  return parsed;
}

function validateObjectId(id) {
  if (!/^[\da-f]{24}$/iu.test(id)) throw httpError(400, "Invalid ID.");
  return new ObjectId(id);
}

function readBody(body, allowedFields) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw httpError(400, "A JSON object is required.");
  }
  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) throw httpError(400, `Unknown field: ${key}.`);
  }
  return body;
}

function validateText(value, field, { required = false, max = 5000 } = {}) {
  if (value === undefined && !required) return;
  if (
    typeof value !== "string" ||
    (required && !value.trim()) ||
    value.length > max
  ) {
    throw httpError(400, `${field} is invalid.`);
  }
}

function validateBoolean(value, field) {
  if (value !== undefined && typeof value !== "boolean") {
    throw httpError(400, `${field} must be a boolean.`);
  }
}

function validateNumber(value, field, { required = false, integer = false } = {}) {
  if (value === undefined && !required) return;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    (integer && !Number.isSafeInteger(value))
  ) {
    throw httpError(400, `${field} must be a valid non-negative number.`);
  }
}

function validateImage(value) {
  if (typeof value !== "string" || value.length > 2048) {
    throw httpError(400, "Images must be valid HTTP or HTTPS URLs.");
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw httpError(400, "Images must be valid HTTP or HTTPS URLs.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw httpError(400, "Images must be valid HTTP or HTTPS URLs.");
  }
}

function normalizeProduct(product) {
  const stockQuantity = product.stockQuantity;
  const stock =
    stockQuantity === undefined
      ? product.stock
      : stockQuantity === 0
        ? "Out of stock"
        : stockQuantity <= 5
          ? "Low stock"
          : "In stock";
  const images =
    Array.isArray(product.images) && product.images.length
      ? product.images
      : product.image
        ? [product.image]
        : [];
  return {
    ...product,
    id: product.id || product._id.toString(),
    mongoId: product._id.toString(),
    image: product.image || images[0] || "",
    images,
    stock,
    active: product.active !== false,
    available: product.available !== false,
  };
}

function normalizeCategory(category) {
  return {
    ...category,
    id: category._id.toString(),
    active: category.active !== false,
  };
}

function validateProductInput(input, { create = false } = {}) {
  const body = readBody(input, productFields);
  validateText(body.name, "Name", { required: create, max: 160 });
  validateText(body.description, "Description", {
    required: create,
    max: 5000,
  });
  validateText(body.category, "Category", { required: create, max: 120 });
  validateText(body.brand, "Brand", { max: 120 });
  validateText(body.badge, "Badge", { max: 80 });
  validateText(body.badgeTone, "Badge tone", { max: 40 });
  validateNumber(body.price, "Price", { required: create });
  validateNumber(body.oldPrice, "Old price");
  validateNumber(body.stockQuantity, "Stock quantity", { integer: true });
  validateNumber(body.rating, "Rating");
  validateNumber(body.reviews, "Reviews", { integer: true });
  if (body.rating !== undefined && body.rating > 5) {
    throw httpError(400, "Rating must be between 0 and 5.");
  }
  for (const field of ["available", "active"]) {
    validateBoolean(body[field], field);
  }
  if (body.image !== undefined) validateImage(body.image);
  if (body.images !== undefined) {
    if (
      !Array.isArray(body.images) ||
      body.images.length > 10 ||
      body.images.some((image) => typeof image !== "string")
    ) {
      throw httpError(400, "Images must contain at most 10 valid URLs.");
    }
    body.images.forEach(validateImage);
  }
  if (create && body.image === undefined && !body.images?.length) {
    throw httpError(400, "At least one product image URL is required.");
  }
  if (body.image === undefined && body.images?.length) {
    body.image = body.images[0];
  }
  if (body.images === undefined && body.image !== undefined) {
    body.images = [body.image];
  }
  return body;
}

function validateCategoryInput(input, { create = false } = {}) {
  const body = readBody(input, categoryFields);
  validateText(body.name, "Name", { required: create, max: 120 });
  validateText(body.slug, "Slug", { max: 140 });
  validateText(body.description, "Description", { max: 1000 });
  if (body.image !== undefined) validateImage(body.image);
  for (const field of ["featured", "popular", "active"]) {
    validateBoolean(body[field], field);
  }
  if (create && body.image === undefined) {
    throw httpError(400, "A category image URL is required.");
  }
  if (body.name && body.slug === undefined) {
    body.slug = body.name
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^\w]+/gu, "-")
      .replace(/^-|-$/gu, "");
  }
  return body;
}

function handleDatabaseError(error, next) {
  if (error?.code === 11000) {
    return next(httpError(409, "A record with that name or slug already exists."));
  }
  return next(error);
}

export function createAdminCatalogController({
  loadProducts = getProductsCollection,
  loadCategories = getCategoriesCollection,
} = {}) {
  return {
    listProducts: async (request, response, next) => {
      try {
        const page = readPage(request.query.page, 1, 1_000_000);
        const limit = readPage(request.query.limit, 20, 100);
        const filter = {};
        if (request.query.category) {
          filter.category = request.query.category;
        }
        if (request.query.search) {
          const search = escapeRegex(String(request.query.search).slice(0, 100));
          filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { brand: { $regex: search, $options: "i" } },
          ];
        }
        if (request.query.active === "true") filter.active = { $ne: false };
        if (request.query.active === "false") filter.active = false;
        const sortField = sortableProductFields.has(request.query.sort)
          ? request.query.sort
          : "createdAt";
        const direction = request.query.order === "asc" ? 1 : -1;
        const collection = await loadProducts();
        const [items, total] = await Promise.all([
          collection
            .find(filter)
            .sort({ [sortField]: direction, _id: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
          collection.countDocuments(filter),
        ]);
        response.status(200).json({
          success: true,
          data: items.map(normalizeProduct),
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
      } catch (error) {
        next(error);
      }
    },
    createProduct: async (request, response, next) => {
      try {
        const body = validateProductInput(request.body, { create: true });
        const categories = await loadCategories();
        const category = await categories.findOne({
          name: body.category,
          active: { $ne: false },
        });
        if (!category) throw httpError(400, "Select an active category.");
        const product = {
          ...body,
          active: body.active ?? true,
          available: body.available ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const collection = await loadProducts();
        const result = await collection.insertOne(product);
        response.status(201).json({
          success: true,
          data: normalizeProduct({ ...product, _id: result.insertedId }),
        });
      } catch (error) {
        handleDatabaseError(error, next);
      }
    },
    updateProduct: async (request, response, next) => {
      try {
        const id = validateObjectId(request.params.id);
        const body = validateProductInput(request.body);
        if (!Object.keys(body).length) throw httpError(400, "No changes supplied.");
        const collection = await loadProducts();
        const existing = await collection.findOne({ _id: id });
        if (!existing) throw httpError(404, "Product not found.");
        if (body.category && body.category !== existing.category) {
          const categories = await loadCategories();
          const category = await categories.findOne({
            name: body.category,
            active: { $ne: false },
          });
          if (!category) throw httpError(400, "Select an active category.");
        }
        body.updatedAt = new Date();
        const result = await collection.findOneAndUpdate(
          { _id: id },
          { $set: body },
          { returnDocument: "after" },
        );
        if (!result) throw httpError(404, "Product not found.");
        response.status(200).json({
          success: true,
          data: normalizeProduct(result),
        });
      } catch (error) {
        handleDatabaseError(error, next);
      }
    },
    deleteProduct: async (request, response, next) => {
      try {
        const id = validateObjectId(request.params.id);
        const collection = await loadProducts();
        const result = await collection.updateOne(
          { _id: id },
          { $set: { active: false, available: false, updatedAt: new Date() } },
        );
        if (!result.matchedCount) throw httpError(404, "Product not found.");
        response.status(200).json({ success: true });
      } catch (error) {
        next(error);
      }
    },
    listCategories: async (request, response, next) => {
      try {
        const filter = request.query.active === "true" ? { active: { $ne: false } } : {};
        const categories = await loadCategories();
        const data = await categories
          .find(filter)
          .sort({ name: 1 })
          .toArray();
        response.status(200).json({
          success: true,
          data: data.map(normalizeCategory),
        });
      } catch (error) {
        next(error);
      }
    },
    getCategory: async (request, response, next) => {
      try {
        const id = validateObjectId(request.params.id);
        const categories = await loadCategories();
        const category = await categories.findOne({ _id: id });
        if (!category) throw httpError(404, "Category not found.");
        response.status(200).json({
          success: true,
          data: normalizeCategory(category),
        });
      } catch (error) {
        next(error);
      }
    },
    createCategory: async (request, response, next) => {
      try {
        const body = validateCategoryInput(request.body, { create: true });
        const category = {
          ...body,
          active: body.active ?? true,
          featured: body.featured ?? false,
          popular: body.popular ?? false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const collection = await loadCategories();
        const result = await collection.insertOne(category);
        response.status(201).json({
          success: true,
          data: normalizeCategory({ ...category, _id: result.insertedId }),
        });
      } catch (error) {
        handleDatabaseError(error, next);
      }
    },
    updateCategory: async (request, response, next) => {
      try {
        const id = validateObjectId(request.params.id);
        const body = validateCategoryInput(request.body);
        if (!Object.keys(body).length) throw httpError(400, "No changes supplied.");
        const categories = await loadCategories();
        const existing = await categories.findOne({ _id: id });
        if (!existing) throw httpError(404, "Category not found.");
        if (body.name && body.name !== existing.name) {
          const products = await loadProducts();
          await products.updateMany(
            { category: existing.name },
            { $set: { category: body.name, updatedAt: new Date() } },
          );
        }
        body.updatedAt = new Date();
        const result = await categories.findOneAndUpdate(
          { _id: id },
          { $set: body },
          { returnDocument: "after" },
        );
        response.status(200).json({
          success: true,
          data: normalizeCategory(result),
        });
      } catch (error) {
        handleDatabaseError(error, next);
      }
    },
    deleteCategory: async (request, response, next) => {
      try {
        const id = validateObjectId(request.params.id);
        const categories = await loadCategories();
        const category = await categories.findOne({ _id: id });
        if (!category) throw httpError(404, "Category not found.");
        const products = await loadProducts();
        const referenced = await products.findOne({
          category: category.name,
          active: { $ne: false },
        });
        if (referenced) {
          throw httpError(
            409,
            "Category is used by active products. Reassign or deactivate them first.",
          );
        }
        await categories.deleteOne({ _id: id });
        response.status(200).json({ success: true });
      } catch (error) {
        next(error);
      }
    },
  };
}

export function createPublicCatalogController({
  loadProducts = getProductsCollection,
  loadCategories = getCategoriesCollection,
} = {}) {
  return {
    listProducts: async (request, response, next) => {
      try {
        const page = readPage(request.query.page, 1, 1_000_000);
        const limit = readPage(request.query.limit, 100, 100);
        const filter = { active: { $ne: false } };
        if (request.query.category) filter.category = request.query.category;
        if (request.query.search) {
          const search = escapeRegex(String(request.query.search).slice(0, 100));
          filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { brand: { $regex: search, $options: "i" } },
          ];
        }
        const sortField = sortableProductFields.has(request.query.sort)
          ? request.query.sort
          : "createdAt";
        const direction = request.query.order === "asc" ? 1 : -1;
        const [collection, categories] = await Promise.all([
          loadProducts(),
          loadCategories(),
        ]);
        const activeCategories = await categories
          .find({ active: { $ne: false } }, { projection: { name: 1 } })
          .toArray();
        filter.category = { $in: activeCategories.map(({ name }) => name) };
        if (request.query.category) {
          filter.category = request.query.category;
          if (!activeCategories.some(({ name }) => name === request.query.category)) {
            response.status(200).json({
              success: true,
              data: [],
              pagination: { page, limit, total: 0, pages: 0 },
            });
            return;
          }
        }
        const [items, total] = await Promise.all([
          collection
            .find(filter)
            .sort({ [sortField]: direction, _id: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
          collection.countDocuments(filter),
        ]);
        response.status(200).json({
          success: true,
          data: items.map(normalizeProduct),
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
      } catch (error) {
        next(error);
      }
    },
    listCategories: async (_request, response, next) => {
      try {
        const categories = await loadCategories();
        const data = await categories
          .find({ active: { $ne: false } })
          .sort({ name: 1 })
          .toArray();
        response.status(200).json({
          success: true,
          data: data.map(normalizeCategory),
        });
      } catch (error) {
        next(error);
      }
    },
  };
}
