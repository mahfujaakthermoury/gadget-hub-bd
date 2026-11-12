import assert from "node:assert/strict";
import { once } from "node:events";
import cookieParser from "cookie-parser";
import express from "express";
import { ObjectId } from "mongodb";
import test from "node:test";
import { createAdminRouter } from "../routes/adminRoutes.js";
import { createProfileRouter } from "../routes/profileRoutes.js";
import { createPublicSettingsRouter } from "../routes/settingsRoutes.js";

class MemoryCollection {
  constructor(documents = []) {
    this.documents = documents;
  }

  async findOne(filter) {
    return this.documents.find((document) =>
      Object.entries(filter).every(([key, value]) =>
        document[key] instanceof ObjectId && value instanceof ObjectId
          ? document[key].equals(value)
          : document[key] === value,
      ),
    ) || null;
  }

  async findOneAndUpdate(filter, update, options = {}) {
    let document = await this.findOne(filter);
    if (!document && options.upsert) {
      document = { ...filter };
      this.documents.push(document);
    }
    if (!document) return null;
    Object.assign(document, update.$set);
    return document;
  }

  async updateOne(filter, update) {
    const document = await this.findOne(filter);
    if (!document) return { matchedCount: 0 };
    Object.assign(document, update.$set);
    return { matchedCount: 1 };
  }

  async updateMany(filter, update) {
    const documents = this.documents.filter((document) =>
      Object.entries(filter).every(([key, value]) =>
        value && typeof value === "object" && "$ne" in value
          ? document[key] !== value.$ne
          : document[key] === value,
      ),
    );
    documents.forEach((document) => Object.assign(document, update.$set));
    return { matchedCount: documents.length };
  }

  async insertOne(document) {
    const inserted = { ...document, _id: new ObjectId() };
    this.documents.push(inserted);
    return { insertedId: inserted._id };
  }

  find() {
    const cursor = {
      results: this.documents,
      sort: (specification) => {
        const [field, direction] = Object.entries(specification)[0];
        cursor.results = [...cursor.results].sort(
          (left, right) => (left[field] < right[field] ? -direction : direction),
        );
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
}

async function createFixture(role = "admin") {
  const user = {
    _id: new ObjectId(),
    name: "Test User",
    email: "test@example.com",
    emailNormalized: "test@example.com",
    passwordHash: "stored-hash",
    role,
    isActive: true,
    createdAt: new Date("2025-01-01T00:00:00.000Z"),
  };
  const users = new MemoryCollection([user]);
  const sessions = new MemoryCollection();
  const settings = new MemoryCollection();
  const logs = new MemoryCollection();
  const dependencies = {
    loadUsers: async () => users,
    loadSessions: async () => ({
      findOne: async () => ({
        jti: "session-1",
        userId: user._id,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      }),
      updateMany: (...args) => sessions.updateMany(...args),
    }),
    loadSettings: async () => settings,
    loadLogs: async () => logs,
    loadOrders: async () => new MemoryCollection(),
    loadProducts: async () => new MemoryCollection(),
    loadCategories: async () => new MemoryCollection(),
    verifyJwt: async () => ({ sub: user._id.toString(), jti: "session-1" }),
    hash: async (value) => `hashed:${value}`,
    verify: async (hash, value) => hash === `stored:${value}`,
    uploadImage: async () => "https://res.cloudinary.com/demo/image/upload/avatar.png",
    logger: { error() {} },
  };
  user.passwordHash = "stored:current-password";

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/admin", createAdminRouter(dependencies));
  app.use("/api/profile", createProfileRouter(dependencies));
  app.use("/api/settings", createPublicSettingsRouter(dependencies));
  app.use((error, _request, response, _next) => {
    response.status(error.status || 500).json({ error: error.message });
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  return {
    user,
    users,
    sessions,
    settings,
    logs,
    request: (path, options = {}, authenticated = true) => {
      const headers = { ...(options.headers || {}) };
      if (authenticated) headers.Cookie = "gadget_hub_session=profile-settings-test";
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

test("profile API protects account data and validates profile, password, and avatar updates", async () => {
  const fixture = await createFixture("customer");
  try {
    const unauthorized = await fixture.request("/api/profile", {}, false);
    assert.equal(unauthorized.status, 401);

    const profileResponse = await fixture.request("/api/profile");
    const profile = (await profileResponse.json()).data;
    assert.equal(profileResponse.status, 200);
    assert.equal(profile.email, fixture.user.email);
    assert.equal("passwordHash" in profile, false);

    const emailChange = await fixture.request("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "other@example.com" }),
    });
    assert.equal(emailChange.status, 400);

    const update = await fixture.request("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Updated User",
        phoneNumber: "+8801712345678",
        addresses: [{
          label: "Home",
          fullName: "Updated User",
          phoneNumber: "+8801712345678",
          addressLine: "Road 1",
          city: "Dhaka",
          district: "Dhaka",
          isDefault: true,
        }],
      }),
    });
    const updatedProfile = (await update.json()).data;
    assert.equal(update.status, 200);
    assert.equal(updatedProfile.name, "Updated User");
    assert.equal(updatedProfile.addresses[0].isDefault, true);

    const avatar = new FormData();
    avatar.append(
      "image",
      new Blob([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], {
        type: "image/png",
      }),
      "avatar.png",
    );
    const avatarResponse = await fixture.request("/api/profile/avatar", {
      method: "POST",
      body: avatar,
    });
    assert.equal(avatarResponse.status, 201);
    assert.equal((await avatarResponse.json()).data.avatarUrl, "https://res.cloudinary.com/demo/image/upload/avatar.png");

    const wrongPassword = await fixture.request("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: "wrong",
        newPassword: "New-password-9!",
      }),
    });
    assert.equal(wrongPassword.status, 400);
    const passwordUpdate = await fixture.request("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: "current-password",
        newPassword: "New-password-9!",
      }),
    });
    assert.equal(passwordUpdate.status, 200);
    assert.equal(fixture.user.passwordHash, "hashed:New-password-9!");
  } finally {
    await fixture.close();
  }
});

test("admin settings save, validate, reset, log changes, and expose only public fields", async () => {
  const fixture = await createFixture();
  try {
    const unauthorized = await fixture.request("/api/admin/settings", {}, false);
    assert.equal(unauthorized.status, 401);

    const initial = await fixture.request("/api/admin/settings");
    assert.equal(initial.status, 200);
    assert.equal((await initial.json()).data.general.currency, "BDT");

    const updated = await fixture.request("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        general: { websiteName: "Gadget Hub Updated" },
        shipping: { freeShippingThreshold: 7000 },
      }),
    });
    assert.equal(updated.status, 200);

    const invalid = await fixture.request("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payment: { secretKey: "must-not-be-saved" } }),
    });
    assert.equal(invalid.status, 400);

    const publicResponse = await fixture.request("/api/settings/public", {}, false);
    const publicData = (await publicResponse.json()).data;
    assert.equal(publicData.general.websiteName, "Gadget Hub Updated");
    assert.equal(publicData.shipping.freeShippingThreshold, 7000);
    assert.equal("security" in publicData, false);
    assert.equal("notifications" in publicData, false);

    const reset = await fixture.request("/api/admin/settings/reset", { method: "POST" });
    assert.equal(reset.status, 200);
    assert.equal((await reset.json()).data.general.websiteName, "Gadget Hub");
    assert.equal(fixture.logs.documents.length, 2);
  } finally {
    await fixture.close();
  }
});

test("settings endpoints reject customer accounts", async () => {
  const fixture = await createFixture("customer");
  try {
    const response = await fixture.request("/api/admin/settings");
    assert.equal(response.status, 403);
  } finally {
    await fixture.close();
  }
});
