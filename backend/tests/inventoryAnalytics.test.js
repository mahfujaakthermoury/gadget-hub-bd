import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import test from "node:test";
import { createAnalyticsController } from "../controllers/analyticsController.js";
import { createInventoryController } from "../controllers/inventoryController.js";
import { createStripeWebhookController } from "../controllers/paymentController.js";

function responseCapture() {
  return {
    statusCode: 0,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function runController(handler, request) {
  const response = responseCapture();
  let error;
  return handler(request, response, (caught) => { error = caught; })
    .then(() => ({ response, error }));
}

function cursor(items) {
  return {
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    async toArray() { return items; },
  };
}

test("inventory adjustments are atomic, recorded, and cannot produce negative stock", async () => {
  const productId = new ObjectId();
  const adminId = new ObjectId();
  const product = { _id: productId, name: "USB-C Hub", stockQuantity: 4 };
  const records = [];
  let stockUpdates = 0;
  const products = {
    async findOne() { return product; },
    async updateOne(filter, update) {
      stockUpdates += 1;
      assert.equal(filter.stockQuantity, product.stockQuantity);
      product.stockQuantity = update.$set.stockQuantity;
      return { matchedCount: 1 };
    },
  };
  const adjustments = {
    async insertOne(record) {
      records.push(record);
      return { insertedId: new ObjectId() };
    },
  };
  const controller = createInventoryController({
    loadProducts: async () => products,
    loadAdjustments: async () => adjustments,
    loadSettings: async () => ({ findOne: async () => ({ store: { lowStockAlertThreshold: 5 } }) }),
    runTransaction: async (operation) => operation({}),
  });
  const request = (quantity, type = "increase") => ({
    params: { id: productId.toString() },
    body: { type, quantity, reason: "Supplier delivery" },
    user: { _id: adminId.toString() },
  });

  const { response, error } = await runController(controller.adjustStock, request(6));
  assert.equal(error, undefined);
  assert.equal(response.statusCode, 201);
  assert.equal(product.stockQuantity, 10);
  assert.equal(records.length, 1);
  assert.equal(records[0].previousStock, 4);
  assert.equal(records[0].updatedStock, 10);
  assert.equal(records[0].quantityChanged, 6);

  const negative = await runController(controller.adjustStock, request(11, "decrease"));
  assert.equal(negative.error.status, 409);
  assert.equal(product.stockQuantity, 10);
  assert.equal(stockUpdates, 1);
  assert.equal(records.length, 1);
});

test("inventory adjustment reports concurrent stock changes without overwriting them", async () => {
  const productId = new ObjectId();
  const controller = createInventoryController({
    loadProducts: async () => ({
      findOne: async () => ({ _id: productId, name: "Camera", stockQuantity: 2 }),
      updateOne: async () => ({ matchedCount: 0 }),
    }),
    loadAdjustments: async () => ({ insertOne: async () => assert.fail("must not record a failed update") }),
    loadSettings: async () => ({ findOne: async () => null }),
    runTransaction: async (operation) => operation({}),
  });
  const { response, error } = await runController(controller.adjustStock, {
    params: { id: productId.toString() },
    body: { type: "decrease", quantity: 1, reason: "Damaged item" },
    user: { _id: new ObjectId().toString() },
  });
  assert.equal(response.statusCode, 0);
  assert.equal(error.status, 409);
  assert.match(error.message, /changed concurrently/u);
});

test("analytics overview returns real empty values and limits revenue to verified payments", async () => {
  const pipelines = [];
  const emptyCollection = {
    aggregate(pipeline) {
      pipelines.push(pipeline);
      return { toArray: async () => [] };
    },
    countDocuments: async () => 0,
    find: () => cursor([]),
  };
  const controller = createAnalyticsController({
    loadOrders: async () => emptyCollection,
    loadProducts: async () => emptyCollection,
    loadCategories: async () => emptyCollection,
    loadUsers: async () => emptyCollection,
    loadSettings: async () => ({
      findOne: async () => ({ store: { lowStockAlertThreshold: 4 } }),
    }),
  });
  const { response, error } = await runController(controller.overview, {
    query: { from: "2025-01-01", to: "2025-01-31" },
  });
  assert.equal(error, undefined);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.revenue, 0);
  assert.equal(response.body.data.totalOrders, 0);
  assert.equal(response.body.data.totalCustomers, 0);
  assert.equal(response.body.data.threshold, 4);
  const revenueMatch = pipelines
    .map((pipeline) => pipeline.find((stage) => stage.$match?.paymentStatus))
    .find(Boolean).$match;
  assert.equal(revenueMatch.paymentStatus, "paid");
  assert.equal(revenueMatch.paymentVerifiedAt.$type, "date");
  assert.equal(revenueMatch.paidAt.$gte.toISOString(), "2025-01-01T00:00:00.000Z");
});

test("analytics rejects invalid date ranges", async () => {
  const controller = createAnalyticsController();
  const { error } = await runController(controller.overview, {
    query: { from: "2025-02-31" },
  });
  assert.equal(error.status, 400);
});

function webhookCollections(order) {
  const products = new Map(
    order.items.map((item) => [item.productId.toString(), { _id: item.productId, stockQuantity: 2 }]),
  );
  const adjustments = [];
  const orders = {
    async findOne(filter) {
      return order._id.equals(filter._id) && filter.paymentMethod === order.paymentMethod
        ? order
        : null;
    },
    async updateOne(filter, update) {
      if (
        !order._id.equals(filter._id) ||
        order.paymentStatus !== filter.paymentStatus ||
        (filter.status?.$ne === "cancelled" && order.status === "cancelled")
      ) return { matchedCount: 0 };
      Object.assign(order, update.$set);
      for (const [path, value] of Object.entries(update.$push || {})) {
        order[path] ||= [];
        order[path].push(value);
      }
      return { matchedCount: 1 };
    },
  };
  return {
    orders,
    products: {
      async findOne(filter) { return products.get(filter._id.toString()) || null; },
      async updateOne(filter, update) {
        const product = products.get(filter._id.toString());
        product.stockQuantity += update.$inc.stockQuantity;
        return { matchedCount: 1 };
      },
    },
    adjustments: {
      async insertOne(entry) {
        adjustments.push(entry);
        return { insertedId: new ObjectId() };
      },
    },
    adjustmentsList: adjustments,
    productsMap: products,
  };
}

test("Stripe webhook verifies and idempotently records a paid order", async () => {
  const orderId = new ObjectId();
  const productId = new ObjectId();
  const order = {
    _id: orderId,
    orderNumber: "GH-TEST",
    paymentMethod: "stripe",
    paymentStatus: "pending",
    status: "pending",
    stripeSessionId: "cs_test_123",
    totalAmount: 125,
    items: [{ productId, name: "Camera", quantity: 1 }],
  };
  const collections = webhookCollections(order);
  const event = {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        metadata: { orderId: orderId.toString() },
        payment_status: "paid",
        currency: "bdt",
        amount_total: 12500,
        payment_intent: "pi_test_123",
      },
    },
  };
  const controller = createStripeWebhookController({
    loadOrders: async () => collections.orders,
    loadProducts: async () => collections.products,
    loadAdjustments: async () => collections.adjustments,
    runTransaction: async (operation) => operation({}),
    constructEvent: async (_body, signature) => {
      assert.equal(signature, "test-signature");
      return event;
    },
  });
  const request = {
    headers: { "stripe-signature": "test-signature" },
    body: Buffer.from("signed payload"),
  };
  const first = await runController(controller, request);
  assert.equal(first.error, undefined);
  assert.equal(first.response.statusCode, 200);
  assert.equal(order.paymentStatus, "paid");
  assert.ok(order.paymentVerifiedAt instanceof Date);
  assert.equal(order.stripePaymentIntentId, "pi_test_123");
  const second = await runController(controller, request);
  assert.equal(second.response.statusCode, 200);
  assert.equal(order.statusHistory, undefined);
});

test("Stripe rejects unsigned webhook requests before accessing order data", async () => {
  let databaseAccessed = false;
  const controller = createStripeWebhookController({
    loadOrders: async () => {
      databaseAccessed = true;
      return {};
    },
    constructEvent: async () => {
      throw new Error("signature mismatch");
    },
  });
  const response = responseCapture();
  await controller({
    headers: { "stripe-signature": "invalid" },
    body: Buffer.from("unsigned payload"),
  }, response, () => assert.fail("invalid signatures are handled directly"));
  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /Invalid Stripe webhook signature/u);
  assert.equal(databaseAccessed, false);
});

test("expired Stripe checkout restores stock once and records the adjustment", async () => {
  const orderId = new ObjectId();
  const productId = new ObjectId();
  const order = {
    _id: orderId,
    orderNumber: "GH-EXPIRED",
    paymentMethod: "stripe",
    paymentStatus: "pending",
    status: "pending",
    stripeSessionId: "cs_test_expired",
    items: [{ productId, name: "Camera", quantity: 2 }],
  };
  const collections = webhookCollections(order);
  const controller = createStripeWebhookController({
    loadOrders: async () => collections.orders,
    loadProducts: async () => collections.products,
    loadAdjustments: async () => collections.adjustments,
    runTransaction: async (operation) => operation({}),
    constructEvent: async () => ({
      type: "checkout.session.expired",
      data: {
        object: {
          id: "cs_test_expired",
          metadata: { orderId: orderId.toString() },
        },
      },
    }),
  });
  const request = {
    headers: { "stripe-signature": "test-signature" },
    body: Buffer.from("signed payload"),
  };
  await runController(controller, request);
  await runController(controller, request);
  assert.equal(order.status, "cancelled");
  assert.equal(order.paymentStatus, "failed");
  assert.equal(collections.productsMap.get(productId.toString()).stockQuantity, 4);
  assert.equal(collections.adjustmentsList.length, 1);
  assert.equal(collections.adjustmentsList[0].quantityChanged, 2);
});
