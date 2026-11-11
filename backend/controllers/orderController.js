import { ObjectId } from "mongodb";
import { withDatabaseTransaction } from "../db.js";
import { getOrdersCollection } from "../models/orders.js";
import { getProductsCollection } from "../models/catalog.js";

export const orderStatuses = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];
export const paymentStatuses = ["pending", "paid", "failed", "refunded"];
const allowedTransitions = {
  pending: new Set(["processing", "cancelled"]),
  processing: new Set(["shipped", "cancelled"]),
  shipped: new Set(["delivered"]),
  delivered: new Set(),
  cancelled: new Set(),
};

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function validateId(value) {
  if (!/^[\da-f]{24}$/iu.test(value)) throw httpError(400, "Invalid order ID.");
  return new ObjectId(value);
}

function pageNumber(value, fallback, maximum) {
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

function parseDate(value, field, endOfDay = false) {
  if (value === undefined) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw httpError(400, `Invalid ${field} date.`);
  }
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw httpError(400, `Invalid ${field} date.`);
  }
  return date;
}

export function normalizeOrder(order) {
  return {
    ...order,
    id: order._id.toString(),
    customerId: order.customerId.toString(),
    items: order.items.map((item) => ({
      ...item,
      productId: item.productId.toString(),
    })),
    statusHistory: (order.statusHistory || []).map((entry) => ({
      ...entry,
      changedBy: entry.changedBy
        ? { ...entry.changedBy, userId: entry.changedBy.userId?.toString() }
        : null,
    })),
  };
}

function readOrderItems(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 50) {
    throw httpError(400, "An order must contain between 1 and 50 products.");
  }
  const quantities = new Map();
  for (const item of input) {
    if (
      !item ||
      typeof item !== "object" ||
      Object.keys(item).some((key) => !["productId", "quantity"].includes(key))
    ) {
      throw httpError(400, "Each item must contain only a product ID and quantity.");
    }
    if (typeof item.productId !== "string" || !/^[\da-f]{24}$/iu.test(item.productId)) {
      throw httpError(400, "Invalid product ID.");
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 100) {
      throw httpError(400, "Product quantity must be an integer from 1 to 100.");
    }
    const key = item.productId.toLowerCase();
    quantities.set(key, (quantities.get(key) || 0) + item.quantity);
    if (quantities.get(key) > 100) {
      throw httpError(400, "Product quantity must not exceed 100.");
    }
  }
  return [...quantities].map(([id, quantity]) => ({
    productId: new ObjectId(id),
    quantity,
  }));
}

function readShippingAddress(input) {
  const fields = ["fullName", "phone", "address", "city", "district", "postalCode"];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw httpError(400, "A shipping address is required.");
  }
  if (Object.keys(input).some((field) => !fields.includes(field))) {
    throw httpError(400, "The shipping address contains unsupported fields.");
  }
  const address = {};
  for (const field of fields) {
    const value = input[field];
    if (field === "postalCode" && (value === undefined || value === "")) {
      address[field] = "";
      continue;
    }
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.trim().length > (field === "address" ? 300 : 120)
    ) {
      throw httpError(400, `A valid ${field} is required.`);
    }
    address[field] = value.trim();
  }
  if (!/^[+()\d -]{7,24}$/u.test(address.phone)) {
    throw httpError(400, "Enter a valid phone number.");
  }
  return address;
}

function safeOrderFilter(query) {
  const filter = {};
  if (query.status) {
    if (!orderStatuses.includes(query.status)) throw httpError(400, "Invalid order status.");
    filter.status = query.status;
  }
  if (query.paymentStatus) {
    if (!paymentStatuses.includes(query.paymentStatus)) {
      throw httpError(400, "Invalid payment status.");
    }
    filter.paymentStatus = query.paymentStatus;
  }
  const from = parseDate(query.from, "start");
  const to = parseDate(query.to, "end", true);
  if (from && to && from > to) throw httpError(400, "Start date must not follow end date.");
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }
  if (query.search) {
    const search = escapeRegex(String(query.search).slice(0, 100));
    filter.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
      { "customer.name": { $regex: search, $options: "i" } },
      { "customer.email": { $regex: search, $options: "i" } },
    ];
  }
  return filter;
}

export function createCustomerOrderController({
  loadOrders = getOrdersCollection,
  loadProducts = getProductsCollection,
  runTransaction = withDatabaseTransaction,
} = {}) {
  return {
    createOrder: async (request, response, next) => {
      try {
        const body = request.body;
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          throw httpError(400, "A JSON object is required.");
        }
        const allowed = new Set(["items", "shippingAddress", "paymentMethod"]);
        if (Object.keys(body).some((field) => !allowed.has(field))) {
          throw httpError(400, "Only products, shipping address, and payment method may be submitted.");
        }
        if (body.paymentMethod !== "cash_on_delivery") {
          throw httpError(400, "Cash on delivery is the only configured payment method.");
        }
        const requestedItems = readOrderItems(body.items);
        const shippingAddress = readShippingAddress(body.shippingAddress);
        const customerId = new ObjectId(request.user._id);
        const orderCollection = await loadOrders();

        const order = await runTransaction(async (session) => {
          const products = await loadProducts();
          const productsFound = await products.find(
            {
              _id: { $in: requestedItems.map((item) => item.productId) },
              active: { $ne: false },
              available: { $ne: false },
            },
            { session },
          ).toArray();
          const productsById = new Map(
            productsFound.map((product) => [product._id.toString(), product]),
          );
          const items = requestedItems.map(({ productId, quantity }) => {
            const product = productsById.get(productId.toString());
            if (!product) throw httpError(409, "A selected product is no longer available.");
            if (!Number.isSafeInteger(product.stockQuantity)) {
              throw httpError(409, `${product.name} needs a stock quantity before it can be ordered.`);
            }
            if (product.stockQuantity < quantity) {
              throw httpError(409, `Not enough stock for ${product.name}.`);
            }
            const unitPrice = product.price;
            if (typeof unitPrice !== "number" || !Number.isFinite(unitPrice) || unitPrice < 0) {
              throw httpError(409, `${product.name} has an invalid catalog price.`);
            }
            return {
              productId,
              name: product.name,
              image: product.image || product.images?.[0] || "",
              quantity,
              unitPrice,
              lineTotal: Math.round(unitPrice * quantity * 100) / 100,
            };
          });
          const totalAmount =
            Math.round(items.reduce((total, item) => total + item.lineTotal, 0) * 100) / 100;
          const subtotal = totalAmount;
          const shippingAmount =
            subtotal >= 5000
              ? 0
              : shippingAddress.district.toLowerCase() === "sylhet"
                ? 60
                : 120;
          const finalAmount =
            Math.round((subtotal + shippingAmount) * 100) / 100;

          for (const item of items) {
            const result = await products.updateOne(
              {
                _id: item.productId,
                active: { $ne: false },
                available: { $ne: false },
                stockQuantity: { $gte: item.quantity },
              },
              { $inc: { stockQuantity: -item.quantity }, $set: { updatedAt: new Date() } },
              { session },
            );
            if (!result.matchedCount) {
              throw httpError(409, "Product stock changed. Refresh your bag and try again.");
            }
          }

          const now = new Date();
          const document = {
            _id: new ObjectId(),
            orderNumber: `GH-${now.toISOString().slice(0, 10).replace(/-/gu, "")}-${new ObjectId().toString().slice(-6).toUpperCase()}`,
            customerId,
            customer: { name: request.user.name, email: request.user.email },
            shippingAddress,
            items,
            subtotal,
            shippingAmount,
            totalAmount: finalAmount,
            paymentMethod: "cash_on_delivery",
            paymentStatus: "pending",
            status: "pending",
            statusHistory: [
              {
                status: "pending",
                changedAt: now,
                changedBy: {
                  userId: customerId,
                  name: request.user.name,
                  role: "customer",
                },
              },
            ],
            createdAt: now,
            updatedAt: now,
          };
          await orderCollection.insertOne(document, { session });
          return document;
        });

        response.status(201).json({ success: true, data: normalizeOrder(order) });
      } catch (error) {
        next(error);
      }
    },
    listMyOrders: async (request, response, next) => {
      try {
        const page = pageNumber(request.query.page, 1, 1_000_000);
        const limit = pageNumber(request.query.limit, 20, 100);
        const filter = {
          customerId: new ObjectId(request.user._id),
          ...safeOrderFilter(request.query),
        };
        const orders = await loadOrders();
        const [items, total] = await Promise.all([
          orders.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
          orders.countDocuments(filter),
        ]);
        response.status(200).json({
          success: true,
          data: items.map(normalizeOrder),
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
      } catch (error) {
        next(error);
      }
    },
    getMyOrder: async (request, response, next) => {
      try {
        const id = validateId(request.params.id);
        const orders = await loadOrders();
        const order = await orders.findOne({
          _id: id,
          customerId: new ObjectId(request.user._id),
        });
        if (!order) throw httpError(404, "Order not found.");
        response.status(200).json({ success: true, data: normalizeOrder(order) });
      } catch (error) {
        next(error);
      }
    },
  };
}

export function createAdminOrderController({
  loadOrders = getOrdersCollection,
  loadProducts = getProductsCollection,
  runTransaction = withDatabaseTransaction,
} = {}) {
  return {
    listOrders: async (request, response, next) => {
      try {
        const page = pageNumber(request.query.page, 1, 1_000_000);
        const limit = pageNumber(request.query.limit, 20, 100);
        const filter = safeOrderFilter(request.query);
        const orders = await loadOrders();
        const [items, total] = await Promise.all([
          orders.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
          orders.countDocuments(filter),
        ]);
        response.status(200).json({
          success: true,
          data: items.map(normalizeOrder),
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
      } catch (error) {
        next(error);
      }
    },
    getOrder: async (request, response, next) => {
      try {
        const id = validateId(request.params.id);
        const orders = await loadOrders();
        const order = await orders.findOne({ _id: id });
        if (!order) throw httpError(404, "Order not found.");
        response.status(200).json({ success: true, data: normalizeOrder(order) });
      } catch (error) {
        next(error);
      }
    },
    updateOrderStatus: async (request, response, next) => {
      try {
        const id = validateId(request.params.id);
        const body = request.body;
        if (
          !body ||
          typeof body !== "object" ||
          Array.isArray(body) ||
          Object.keys(body).length !== 1 ||
          !orderStatuses.includes(body.status)
        ) {
          throw httpError(400, "Submit a valid order status.");
        }
        const orderCollection = await loadOrders();

        const updatedOrder = await runTransaction(async (session) => {
          const orders = orderCollection;
          const order = await orders.findOne({ _id: id }, { session });
          if (!order) throw httpError(404, "Order not found.");
          if (!allowedTransitions[order.status]?.has(body.status)) {
            throw httpError(409, `Cannot change an order from ${order.status} to ${body.status}.`);
          }
          if (body.status === "cancelled") {
            const products = await loadProducts();
            for (const item of order.items) {
              await products.updateOne(
                { _id: item.productId },
                { $inc: { stockQuantity: item.quantity } },
                { session },
              );
            }
          }
          const now = new Date();
          const result = await orders.updateOne(
            { _id: id, status: order.status },
            {
              $set: { status: body.status, updatedAt: now },
              $push: {
                statusHistory: {
                  status: body.status,
                  changedAt: now,
                  changedBy: {
                    userId: new ObjectId(request.user._id),
                    name: request.user.name,
                    email: request.user.email,
                    role: "admin",
                  },
                },
              },
            },
            { session },
          );
          if (!result.matchedCount) {
            throw httpError(409, "Order status changed concurrently. Refresh and retry.");
          }
          return orders.findOne({ _id: id }, { session });
        });
        response.status(200).json({ success: true, data: normalizeOrder(updatedOrder) });
      } catch (error) {
        next(error);
      }
    },
  };
}
