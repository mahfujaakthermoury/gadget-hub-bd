import { ObjectId } from "mongodb";
import { withDatabaseTransaction } from "../db.js";
import { getProductsCollection } from "../models/catalog.js";
import { getInventoryAdjustmentsCollection } from "../models/inventoryAdjustments.js";
import { getSettingsCollection } from "../models/settings.js";
import { getDefaultSettings } from "./settingsController.js";

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function validateId(value) {
  if (!/^[\da-f]{24}$/iu.test(value)) throw httpError(400, "Invalid product ID.");
  return new ObjectId(value);
}

function readPage(value, fallback, maximum) {
  if (value === undefined) return fallback;
  if (!/^\d+$/u.test(value)) throw httpError(400, "Invalid pagination values.");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > maximum) {
    throw httpError(400, "Invalid pagination values.");
  }
  return number;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function normalizeAdjustment(adjustment) {
  return {
    ...adjustment,
    id: adjustment._id?.toString(),
    productId: adjustment.productId.toString(),
    adminId: adjustment.adminId?.toString() || null,
  };
}

async function getLowStockThreshold(loadSettings) {
  const settings = await loadSettings();
  const document = await settings.findOne({ _id: "store-settings" });
  return document?.store?.lowStockAlertThreshold ??
    getDefaultSettings().store.lowStockAlertThreshold;
}

export function createInventoryController({
  loadProducts = getProductsCollection,
  loadAdjustments = getInventoryAdjustmentsCollection,
  loadSettings = getSettingsCollection,
  runTransaction = withDatabaseTransaction,
} = {}) {
  return {
    listInventory: async (request, response, next) => {
      try {
        const page = readPage(request.query.page, 1, 1_000_000);
        const limit = readPage(request.query.limit, 20, 100);
        const filter = { active: { $ne: false } };
        if (request.query.category) filter.category = request.query.category;
        if (request.query.search) {
          const search = escapeRegex(String(request.query.search).slice(0, 100));
          filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { brand: { $regex: search, $options: "i" } },
          ];
        }
        const threshold = await getLowStockThreshold(loadSettings);
        if (request.query.status === "low") {
          filter.stockQuantity = { $gt: 0, $lte: threshold };
        } else if (request.query.status === "out") {
          filter.$and = [{
            $or: [
              { stockQuantity: 0 },
              { stockQuantity: { $exists: false } },
              { stockQuantity: null },
            ],
          }];
        } else if (request.query.status === "in") {
          filter.stockQuantity = { $gt: threshold };
        } else if (request.query.status && request.query.status !== "all") {
          throw httpError(400, "Invalid inventory status.");
        }
        const products = await loadProducts();
        const [items, total] = await Promise.all([
          products.find(filter)
            .sort({ stockQuantity: 1, name: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
          products.countDocuments(filter),
        ]);
        response.status(200).json({
          success: true,
          data: items.map((product) => ({
            ...product,
            id: product._id.toString(),
            stockQuantity: Number.isSafeInteger(product.stockQuantity)
              ? product.stockQuantity
              : 0,
            stockStatus:
              !Number.isSafeInteger(product.stockQuantity) || product.stockQuantity === 0
                ? "out"
                : product.stockQuantity <= threshold
                  ? "low"
                  : "in",
          })),
          threshold,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
      } catch (error) {
        next(error);
      }
    },
    adjustStock: async (request, response, next) => {
      try {
        const productId = validateId(request.params.id);
        const body = request.body;
        const fields = ["type", "quantity", "reason"];
        if (
          !body ||
          typeof body !== "object" ||
          Array.isArray(body) ||
          Object.keys(body).some((field) => !fields.includes(field)) ||
          !["increase", "decrease", "correction"].includes(body.type) ||
          !Number.isSafeInteger(body.quantity) ||
          body.quantity < 0 ||
          body.quantity > 1_000_000_000 ||
          (body.type !== "correction" && body.quantity < 1) ||
          typeof body.reason !== "string" ||
          !body.reason.trim() ||
          body.reason.length > 300
        ) {
          throw httpError(400, "Provide a valid stock adjustment type, quantity, and reason.");
        }
        const products = await loadProducts();
        const adjustmentCollection = await loadAdjustments();
        const adjustment = await runTransaction(async (session) => {
          const product = await products.findOne(
            { _id: productId },
            { session },
          );
          if (!product) throw httpError(404, "Product not found.");
          const previousStock = Number.isSafeInteger(product.stockQuantity)
            ? product.stockQuantity
            : 0;
          const updatedStock =
            body.type === "increase"
              ? previousStock + body.quantity
              : body.type === "decrease"
                ? previousStock - body.quantity
                : body.quantity;
          if (!Number.isSafeInteger(updatedStock) || updatedStock < 0) {
            throw httpError(409, "Stock cannot be reduced below zero.");
          }
          const stockFilter = Number.isSafeInteger(product.stockQuantity)
            ? { _id: productId, stockQuantity: previousStock }
            : {
                _id: productId,
                $or: [
                  { stockQuantity: { $exists: false } },
                  { stockQuantity: null },
                ],
              };
          const result = await products.updateOne(
            stockFilter,
            {
              $set: { stockQuantity: updatedStock, updatedAt: new Date() },
            },
            { session },
          );
          if (!result.matchedCount) {
            throw httpError(409, "Stock changed concurrently. Refresh and retry.");
          }
          const document = {
            productId,
            productName: product.name,
            previousStock,
            updatedStock,
            quantityChanged: updatedStock - previousStock,
            reason: body.reason.trim(),
            type: body.type,
            adminId: new ObjectId(request.user._id),
            createdAt: new Date(),
          };
          const inserted = await adjustmentCollection.insertOne(document, { session });
          return normalizeAdjustment({ ...document, _id: inserted.insertedId });
        });
        response.status(201).json({ success: true, data: adjustment });
      } catch (error) {
        next(error);
      }
    },
    listAdjustments: async (request, response, next) => {
      try {
        const page = readPage(request.query.page, 1, 1_000_000);
        const limit = readPage(request.query.limit, 20, 100);
        const filter = {};
        if (request.query.productId) filter.productId = validateId(request.query.productId);
        const adjustments = await loadAdjustments();
        const [items, total] = await Promise.all([
          adjustments.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
          adjustments.countDocuments(filter),
        ]);
        response.status(200).json({
          success: true,
          data: items.map(normalizeAdjustment),
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
      } catch (error) {
        next(error);
      }
    },
  };
}