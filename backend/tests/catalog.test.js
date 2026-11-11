import assert from "node:assert/strict";
import { once } from "node:events";
import cookieParser from "cookie-parser";
import express from "express";
import { ObjectId } from "mongodb";
import test from "node:test";
import { createAdminRouter } from "../routes/adminRoutes.js";
import { createCatalogRouter } from "../routes/catalogRoutes.js";

function matches(document, filter) {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === "$or") return condition.some((item) => matches(document, item));
    const value = document[key];
    if (condition && typeof condition === "object" && !(condition instanceof ObjectId) && !(condition instanceof Date)) {
      if ("$ne" in condition && value === condition.$ne) return false;
      if ("$in" in condition && !condition.$in.includes(value)) return false;
      if ("$regex" in condition && !new RegExp(condition.$regex, condition.$options).test(value || "")) return false;
      return true;
    }
    if (value instanceof ObjectId && condition instanceof ObjectId) {
      return value.equals(condition);
    }
    return value === condition;
  });
}

class MemoryCollection {
  constructor() {
    this.documents = [];
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
            const a = left[field] ?? "";
            const b = right[field] ?? "";
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
    const inserted = { ...document, _id: new ObjectId() };
    this.documents.push(inserted);
    return { insertedId: inserted._id };
  }

  async updateOne(filter, update) {
    const document = await this.findOne(filter);
    if (!document) return { matchedCount: 0 };
    Object.assign(document, update.$set);
    return { matchedCount: 1 };
  }

  async updateMany(filter, update) {
    const documents = this.documents.filter((document) => matches(document, filter));
    documents.forEach((document) => Object.assign(document, update.$set));
    return { matchedCount: documents.length };
  }

  async findOneAndUpdate(filter, update) {
    const document = await this.findOne(filter);
    if (!document) return null;
    Object.assign(document, update.$set);
    return document;
  }

  async deleteOne(filter) {
    const index = this.documents.findIndex((document) => matches(document, filter));
    if (index >= 0) this.documents.splice(index, 1);
    return { deletedCount: index >= 0 ? 1 : 0 };
  }
}

async function createFixture(role = "admin") {
  const userId = new ObjectId();
  const sessionId = "catalog-test-session";
  const products = new MemoryCollection();
  const categories = new MemoryCollection();
  const user = {
    _id: userId,
    name: "Catalog Admin",
    email: "admin@example.com",
    role,
    isActive: true,
  };
  const dependencies = {
    loadProducts: async () => products,
    loadCategories: async () => categories,
    loadUsers: async () => ({
      findOne: async (filter) => (filter._id.equals(userId) ? user : null),
    }),
    loadSessions: async () => ({
      findOne: async () => ({
        jti: sessionId,
        userId,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      }),
    }),
    verifyJwt: async (token) => {
      if (token !== "catalog-test-token") throw new Error("Invalid token.");
      return { sub: userId.toString(), jti: sessionId };
    },
    logger: { error() {} },
  };
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/admin", createAdminRouter(dependencies));
  app.use("/api/catalog", createCatalogRouter(dependencies));
  app.use((error, _request, response, _next) => {
    response.status(error.status || 500).json({ error: error.message });
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  return {
    categories,
    products,
    request: (path, options = {}, authenticated = true) => {
      const headers = { ...(options.headers || {}) };
      if (authenticated) headers.Cookie = "gadget_hub_session=catalog-test-token";
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

const categoryInput = {
  name: "Audio & Headphones",
  description: "Personal audio gear.",
  image: "https://images.example.com/audio.jpg",
};

const productInput = {
  name: "Studio Headphones",
  description: "Comfortable over-ear headphones.",
  category: "Audio & Headphones",
  price: 25000,
  oldPrice: 28000,
  images: [
    "https://images.example.com/headphones-front.jpg",
    "https://images.example.com/headphones-side.jpg",
  ],
  brand: "Example",
  stockQuantity: 12,
  available: true,
  rating: 4.8,
  reviews: 14,
};

test("admin product and category CRUD is validated, paginated, and reflected in storefront", async () => {
  const fixture = await createFixture();
  try {
    const createdCategoryResponse = await fixture.request("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(categoryInput),
    });
    assert.equal(createdCategoryResponse.status, 201);
    const category = (await createdCategoryResponse.json()).data;
    assert.equal(category.name, categoryInput.name);

    const categoryDetail = await fixture.request(`/api/admin/categories/${category.id}`);
    assert.equal(categoryDetail.status, 200);
    assert.equal((await categoryDetail.json()).data.slug, "audio-headphones");

    const createdProductResponse = await fixture.request("/api/admin/products/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productInput),
    });
    assert.equal(createdProductResponse.status, 201);
    const product = (await createdProductResponse.json()).data;
    assert.equal(product.stockQuantity, 12);
    assert.equal(product.images.length, 2);

    const secondProductResponse = await fixture.request("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...productInput, name: "Studio Earbuds", price: 9000 }),
    });
    const secondProduct = (await secondProductResponse.json()).data;
    const updateCategoryResponse = await fixture.request(
      `/api/admin/categories/${category.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Audio Gear" }),
      },
    );
    assert.equal(updateCategoryResponse.status, 200);
    assert.equal((await updateCategoryResponse.json()).data.slug, "audio-gear");
    assert.equal(fixture.products.documents[0].category, "Audio Gear");
    assert.equal(fixture.products.documents[1].category, "Audio Gear");

    const pageResponse = await fixture.request(
      "/api/admin/products?page=1&limit=1&search=Earbuds&category=Audio%20Gear&sort=price&order=asc",
    );
    const page = await pageResponse.json();
    assert.equal(pageResponse.status, 200);
    assert.equal(page.data.length, 1);
    assert.equal(page.pagination.total, 1);
    assert.equal(page.data[0].name, "Studio Earbuds");
    const secondPage = await fixture.request(
      "/api/admin/products?page=2&limit=1&category=Audio%20Gear&sort=price&order=asc",
    );
    assert.equal((await secondPage.json()).data[0].name, "Studio Headphones");

    const updateResponse = await fixture.request(`/api/admin/products/${product.mongoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: 22000,
        description: "Updated comfortable headphones.",
        images: ["https://images.example.com/new-headphones.jpg"],
        stockQuantity: 3,
      }),
    });
    const updated = (await updateResponse.json()).data;
    assert.equal(updateResponse.status, 200);
    assert.equal(updated.price, 22000);
    assert.equal(updated.stock, "Low stock");
    assert.equal(updated.image, "https://images.example.com/new-headphones.jpg");

    const publicResponse = await fixture.request("/api/catalog/products?limit=10", {}, false);
    const publicProducts = (await publicResponse.json()).data;
    assert.equal(publicResponse.status, 200);
    assert.equal(publicProducts.length, 2);
    assert.equal(publicProducts.find((item) => item.id === product.id).price, 22000);
    const publicCategories = (await (await fixture.request(
      "/api/catalog/categories",
      {},
      false,
    )).json()).data;
    assert.equal(publicCategories[0].name, "Audio Gear");

    const blockedDelete = await fixture.request(`/api/admin/categories/${category.id}`, {
      method: "DELETE",
    });
    assert.equal(blockedDelete.status, 409);

    const deactivateResponse = await fixture.request(`/api/admin/products/${product.mongoId}`, {
      method: "DELETE",
    });
    assert.equal(deactivateResponse.status, 200);
    const hiddenProducts = (await (await fixture.request(
      "/api/catalog/products?limit=10",
      {},
      false,
    )).json()).data;
    assert.equal(hiddenProducts.some((item) => item.id === product.id), false);

    await fixture.request(`/api/admin/products/${secondProduct.mongoId}`, {
      method: "DELETE",
    });
    const deleteCategoryResponse = await fixture.request(`/api/admin/categories/${category.id}`, {
      method: "DELETE",
    });
    assert.equal(deleteCategoryResponse.status, 200);
    const remainingCategories = (await (await fixture.request(
      "/api/admin/categories",
    )).json()).data;
    assert.equal(remainingCategories.length, 0);
  } finally {
    await fixture.close();
  }
});

test("catalog endpoints reject bad IDs, invalid values, and inline image data", async () => {
  const fixture = await createFixture();
  try {
    const invalidId = await fixture.request("/api/admin/products/not-an-object-id", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: 10 }),
    });
    assert.equal(invalidId.status, 400);

    const invalidPrice = await fixture.request("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...productInput, price: -1 }),
    });
    assert.equal(invalidPrice.status, 400);

    const inlineImage = await fixture.request("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...productInput,
        images: ["data:image/png;base64,ZmFrZQ=="],
      }),
    });
    assert.equal(inlineImage.status, 400);

    const missingProduct = await fixture.request(
      `/api/admin/products/${new ObjectId().toString()}`,
      { method: "DELETE" },
    );
    assert.equal(missingProduct.status, 404);

    const invalidPage = await fixture.request("/api/admin/products?page=zero");
    assert.equal(invalidPage.status, 400);

    const invalidCategory = await fixture.request("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...categoryInput, image: "javascript:alert(1)" }),
    });
    assert.equal(invalidCategory.status, 400);
  } finally {
    await fixture.close();
  }
});

test("catalog writes require an authenticated admin", async () => {
  const guestFixture = await createFixture();
  try {
    const guestResponse = await guestFixture.request(
      "/api/admin/products",
      {},
      false,
    );
    assert.equal(guestResponse.status, 401);
  } finally {
    await guestFixture.close();
  }

  const customerFixture = await createFixture("customer");
  try {
    const customerResponse = await customerFixture.request("/api/admin/categories");
    assert.equal(customerResponse.status, 403);
  } finally {
    await customerFixture.close();
  }
});
