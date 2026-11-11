import assert from "node:assert/strict";
import { once } from "node:events";
import cookieParser from "cookie-parser";
import express from "express";
import { ObjectId } from "mongodb";
import test from "node:test";
import { createAdminRouter } from "../routes/adminRoutes.js";
import { createMyOrdersRouter, createOrderRouter } from "../routes/orderRoutes.js";

function valueAt(object, path) {
  return path.split(".").reduce((value, part) => value?.[part], object);
}

function matches(document, filter) {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === "$or") return condition.some((item) => matches(document, item));
    const value = valueAt(document, key);
    if (
      condition &&
      typeof condition === "object" &&
      !(condition instanceof ObjectId) &&
      !(condition instanceof Date)
    ) {
      if ("$ne" in condition && value === condition.$ne) return false;
      if (
        "$in" in condition &&
        !condition.$in.some((candidate) =>
          value instanceof ObjectId && candidate instanceof ObjectId
            ? value.equals(candidate)
            : value === candidate,
        )
      ) return false;
      if ("$gte" in condition && !(value >= condition.$gte)) return false;
      if ("$lte" in condition && !(value <= condition.$lte)) return false;
      if (
        "$regex" in condition &&
        !new RegExp(condition.$regex, condition.$options).test(value || "")
      ) return false;
      return true;
    }
    if (value instanceof ObjectId && condition instanceof ObjectId) {
      return value.equals(condition);
    }
    return value === condition;
  });
}

class MemoryCollection {
  constructor(documents = []) {
    this.documents = documents;
  }

  async findOne(filter) {
    return this.documents.find((document) => matches(document, filter)) || null;
  }

  find(filter) {
    const cursor = {
      results: this.documents.filter((document) => matches(document, filter)),
      sort: (specification) => {
        cursor.results.sort((left, right) => {
          for (const [field, direction] of Object.entries(specification)) {
            const a = valueAt(left, field) ?? "";
            const b = valueAt(right, field) ?? "";
            const comparison = a < b ? -1 : a > b ? 1 : 0;
            if (comparison) return comparison * direction;
          }
          return 0;
        });
        return cursor;
      },
      skip: (count) => {
        cursor.results = cursor.results.slice(count);
        return cursor;
      },
      limit: (count) => {
        cursor.results = cursor.results.slice(0, count);
        return cursor;
      },
      toArray: async () => cursor.results,
    };
    return cursor;
  }

  async countDocuments(filter) {
    return this.documents.filter((document) => matches(document, filter)).length;
  }

  async insertOne(document) {
    const inserted = { ...document, _id: document._id || new ObjectId() };
    this.documents.push(inserted);
    return { insertedId: inserted._id };
  }

  async updateOne(filter, update) {
    const document = await this.findOne(filter);
    if (!document) return { matchedCount: 0 };
    if (update.$set) Object.assign(document, update.$set);
    if (update.$inc) {
      for (const [field, amount] of Object.entries(update.$inc)) {
        document[field] = (document[field] || 0) + amount;
      }
    }
    if (update.$push) {
      for (const [field, value] of Object.entries(update.$push)) {
        document[field] ||= [];
        document[field].push(value);
      }
    }
    return { matchedCount: 1 };
  }
}

async function createFixture() {
  const admin = {
    _id: new ObjectId(),
    name: "Primary Admin",
    email: "admin@example.com",
    emailNormalized: "admin@example.com",
    passwordHash: "never-return-this",
    role: "admin",
    isActive: true,
    createdAt: new Date("2025-01-01T00:00:00Z"),
  };
  const customerA = {
    _id: new ObjectId(),
    name: "Customer One",
    email: "one@example.com",
    emailNormalized: "one@example.com",
    passwordHash: "never-return-this",
    role: "customer",
    isActive: true,
    createdAt: new Date("2025-02-01T00:00:00Z"),
  };
  const customerB = {
    _id: new ObjectId(),
    name: "Customer Two",
    email: "two@example.com",
    emailNormalized: "two@example.com",
    passwordHash: "never-return-this",
    role: "customer",
    isActive: true,
    createdAt: new Date("2025-03-01T00:00:00Z"),
  };
  const users = new MemoryCollection([admin, customerA, customerB]);
  const products = new MemoryCollection([
    {
      _id: new ObjectId(),
      name: "Test Headphones",
      image: "https://images.example.com/headphones.jpg",
      price: 1250,
      stockQuantity: 8,
      active: true,
      available: true,
    },
    {
      _id: new ObjectId(),
      name: "Test Mouse",
      image: "https://images.example.com/mouse.jpg",
      price: 750.5,
      stockQuantity: 2,
      active: true,
      available: true,
    },
  ]);
  const orders = new MemoryCollection();
  const identities = new Map([
    ["test-admin", admin],
    ["test-customer-a", customerA],
    ["test-customer-b", customerB],
  ]);
  const dependencies = {
    loadUsers: async () => users,
    loadOrders: async () => orders,
    loadProducts: async () => products,
    loadSessions: async () => ({
      findOne: async (filter) => {
        const user = [...identities.values()].find(
          (entry) => entry._id.toString() === filter.userId.toString(),
        );
        const token = [...identities].find(([, entry]) => entry === user)?.[0];
        if (filter.jti !== token || !user?.isActive) return null;
        return {
          jti: token,
          userId: user._id,
          revokedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
        };
      },
    }),
    verifyJwt: async (token) => {
      const user = identities.get(token);
      if (!user) throw new Error("Invalid token.");
      return { sub: user._id.toString(), jti: token };
    },
    runTransaction: async (operation) => operation({}),
    logger: { error() {} },
  };
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/admin", createAdminRouter(dependencies));
  app.use("/api/orders", createOrderRouter(dependencies));
  app.use("/api/my-orders", createMyOrdersRouter(dependencies));
  app.use((error, _request, response, _next) => {
    response.status(error.status || 500).json({ error: error.message });
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  return {
    admin,
    customerA,
    customerB,
    orders,
    products,
    request: (path, { token, ...options } = {}) => {
      const headers = { ...(options.headers || {}) };
      if (token) headers.Cookie = `gadget_hub_session=${token}`;
      return fetch(`http://127.0.0.1:${server.address().port}${path}`, {
        ...options,
        headers,
      });
    },
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

const shippingAddress = {
  fullName: "Customer One",
  phone: "+880 1712 345678",
  address: "12 Example Road",
  city: "Dhaka",
  district: "Dhaka",
  postalCode: "1207",
};

async function createOrder(fixture, token = "test-customer-a", overrides = {}) {
  const product = fixture.products.documents[0];
  return fixture.request("/api/orders", {
    token,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ productId: product._id.toString(), quantity: 2 }],
      shippingAddress,
      paymentMethod: "cash_on_delivery",
      ...overrides,
    }),
  });
}

test("order creation prices from MongoDB, reserves stock, and ignores client pricing", async () => {
  const fixture = await createFixture();
  try {
    const product = fixture.products.documents[0];
    const tampered = await createOrder(fixture, "test-customer-a", {
      totalAmount: 1,
      paymentStatus: "paid",
    });
    assert.equal(tampered.status, 400);
    assert.equal(product.stockQuantity, 8);

    const response = await createOrder(fixture);
    const result = await response.json();
    assert.equal(response.status, 201);
    assert.equal(result.data.items[0].unitPrice, 1250);
    assert.equal(result.data.items[0].lineTotal, 2500);
    assert.equal(result.data.subtotal, 2500);
    assert.equal(result.data.shippingAmount, 120);
    assert.equal(result.data.totalAmount, 2620);
    assert.equal(result.data.paymentStatus, "pending");
    assert.equal(result.data.status, "pending");
    assert.equal(product.stockQuantity, 6);
  } finally {
    await fixture.close();
  }
});

test("Sylhet delivery is discounted and orders above the threshold ship free", async () => {
  const fixture = await createFixture();
  try {
    const product = fixture.products.documents[0];
    const response = await createOrder(fixture, "test-customer-a", {
      items: [{ productId: product._id.toString(), quantity: 4 }],
      shippingAddress: { ...shippingAddress, district: "Sylhet" },
    });
    const order = (await response.json()).data;
    assert.equal(response.status, 201);
    assert.equal(order.subtotal, 5000);
    assert.equal(order.shippingAmount, 0);
    assert.equal(order.totalAmount, 5000);

    const sylhetBelowThreshold = await createOrder(fixture, "test-customer-a", {
      items: [{ productId: product._id.toString(), quantity: 1 }],
      shippingAddress: { ...shippingAddress, district: "Sylhet" },
    });
    assert.equal((await sylhetBelowThreshold.json()).data.shippingAmount, 60);
  } finally {
    await fixture.close();
  }
});

test("orders are private to the authenticated customer and admin filters paginate", async () => {
  const fixture = await createFixture();
  try {
    const created = await createOrder(fixture);
    const order = (await created.json()).data;
    const otherCustomerList = await fixture.request("/api/my-orders/", {
      token: "test-customer-b",
    });
    assert.equal((await otherCustomerList.json()).pagination.total, 0);
    const ownOrders = await fixture.request("/api/my-orders/?page=1&limit=1", {
      token: "test-customer-a",
    });
    assert.equal((await ownOrders.json()).data[0].id, order.id);

    const privateDetail = await fixture.request(`/api/my-orders/${order.id}`, {
      token: "test-customer-b",
    });
    assert.equal(privateDetail.status, 404);
    const ownDetail = await fixture.request(`/api/my-orders/${order.id}`, {
      token: "test-customer-a",
    });
    assert.equal((await ownDetail.json()).data.id, order.id);

    const adminList = await fixture.request(
      "/api/admin/orders?page=1&limit=1&status=pending&paymentStatus=pending&from=2020-01-01",
      { token: "test-admin" },
    );
    const page = await adminList.json();
    assert.equal(adminList.status, 200);
    assert.equal(page.pagination.total, 1);
    assert.equal(page.data[0].id, order.id);
    const adminDetail = await fixture.request(`/api/admin/orders/${order.id}`, {
      token: "test-admin",
    });
    assert.equal((await adminDetail.json()).data.customer.email, "one@example.com");
  } finally {
    await fixture.close();
  }
});

test("admin order transitions are constrained and recorded without altering payment state", async () => {
  const fixture = await createFixture();
  try {
    const created = await createOrder(fixture);
    const order = (await created.json()).data;
    const invalid = await fixture.request(`/api/admin/orders/${order.id}/status`, {
      token: "test-admin",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "delivered" }),
    });
    assert.equal(invalid.status, 409);

    const update = async (status) =>
      fixture.request(`/api/admin/orders/${order.id}/status`, {
        token: "test-admin",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    assert.equal((await update("processing")).status, 200);
    assert.equal((await update("shipped")).status, 200);
    const deliveredResponse = await update("delivered");
    const delivered = (await deliveredResponse.json()).data;
    assert.equal(deliveredResponse.status, 200);
    assert.equal(delivered.status, "delivered");
    assert.equal(delivered.paymentStatus, "pending");
    assert.equal(delivered.statusHistory.at(-1).changedBy.role, "admin");
    assert.equal(delivered.statusHistory.at(-1).changedBy.name, "Primary Admin");

    const terminalTransition = await update("cancelled");
    assert.equal(terminalTransition.status, 409);
  } finally {
    await fixture.close();
  }
});

test("order creation validates payment method, stock, IDs, status filters, and dates", async () => {
  const fixture = await createFixture();
  try {
    const unsupportedPayment = await createOrder(fixture, "test-customer-a", {
      paymentMethod: "bkash",
    });
    assert.equal(unsupportedPayment.status, 400);

    const insufficientStock = await createOrder(fixture, "test-customer-a", {
      items: [{ productId: fixture.products.documents[0]._id.toString(), quantity: 101 }],
    });
    assert.equal(insufficientStock.status, 400);

    const invalidOrder = await fixture.request("/api/admin/orders/not-an-object-id", {
      token: "test-admin",
    });
    assert.equal(invalidOrder.status, 400);

    const badStatus = await fixture.request("/api/admin/orders?status=unknown", {
      token: "test-admin",
    });
    assert.equal(badStatus.status, 400);

    const badDate = await fixture.request("/api/admin/orders?from=2025-02-30", {
      token: "test-admin",
    });
    assert.equal(badDate.status, 400);
  } finally {
    await fixture.close();
  }
});

test("customer management hides credentials and prevents self or admin deactivation", async () => {
  const fixture = await createFixture();
  try {
    const listResponse = await fixture.request("/api/admin/customers?search=Customer", {
      token: "test-admin",
    });
    const list = await listResponse.json();
    assert.equal(listResponse.status, 200);
    assert.equal(list.data.length, 2);
    assert.equal("passwordHash" in list.data[0], false);
    assert.equal("emailNormalized" in list.data[0], false);

    const detailResponse = await fixture.request(
      `/api/admin/customers/${fixture.customerA._id.toString()}`,
      { token: "test-admin" },
    );
    assert.equal((await detailResponse.json()).data.orderCount, 0);

    const selfDeactivation = await fixture.request(
      `/api/admin/customers/${fixture.admin._id.toString()}/status`,
      {
        token: "test-admin",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      },
    );
    assert.equal(selfDeactivation.status, 400);

    const deactivation = await fixture.request(
      `/api/admin/customers/${fixture.customerA._id.toString()}/status`,
      {
        token: "test-admin",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      },
    );
    assert.equal(deactivation.status, 200);
    assert.equal((await deactivation.json()).data.isActive, false);
    const disabledCustomerRequest = await fixture.request("/api/my-orders", {
      token: "test-customer-a",
    });
    assert.equal(disabledCustomerRequest.status, 401);
  } finally {
    await fixture.close();
  }
});

test("cancelling an eligible order restores inventory and appends admin history", async () => {
  const fixture = await createFixture();
  try {
    const created = await createOrder(fixture);
    const order = (await created.json()).data;
    const product = fixture.products.documents[0];
    assert.equal(product.stockQuantity, 6);

    const response = await fixture.request(`/api/admin/orders/${order.id}/status`, {
      token: "test-admin",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    const cancelled = (await response.json()).data;
    assert.equal(response.status, 200);
    assert.equal(cancelled.status, "cancelled");
    assert.equal(product.stockQuantity, 8);
    assert.equal(cancelled.statusHistory.at(-1).changedBy.role, "admin");
  } finally {
    await fixture.close();
  }
});

test("admin APIs and customer orders reject unauthorized callers", async () => {
  const fixture = await createFixture();
  try {
    assert.equal((await fixture.request("/api/admin/orders")).status, 401);
    assert.equal(
      (await fixture.request("/api/admin/customers", { token: "test-customer-a" })).status,
      403,
    );
    assert.equal((await fixture.request("/api/my-orders")).status, 401);
    assert.equal(
      (await fixture.request("/api/orders", {
        token: "test-admin",
        method: "POST",
      })).status,
      403,
    );
  } finally {
    await fixture.close();
  }
});
