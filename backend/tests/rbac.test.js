import assert from "node:assert/strict";
import { once } from "node:events";
import cookieParser from "cookie-parser";
import express from "express";
import { ObjectId } from "mongodb";
import test from "node:test";
import { createAdminRouter } from "../routes/adminRoutes.js";
import { verifyCustomer } from "../middleware/roleAuthorization.js";

async function createFixture(role = "customer", active = true) {
  const userId = new ObjectId();
  const user = {
    _id: userId,
    name: "Alex Rahman",
    email: "alex@example.com",
    role,
    isActive: active,
  };
  const session = {
    jti: "test-session",
    userId,
    revokedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
  };
  const dependencies = {
    loadUsers: async () => ({
      findOne: async (filter) =>
        filter._id?.equals(userId) ? user : null,
    }),
    loadSessions: async () => ({
      findOne: async (filter) =>
        filter.jti === session.jti &&
        filter.userId.equals(userId) &&
        session.revokedAt === null &&
        session.expiresAt > filter.expiresAt.$gt
          ? session
          : null,
    }),
    verifyJwt: async (token) => {
      if (token !== "test-token") throw new Error("invalid token");
      return { sub: userId.toString(), jti: session.jti };
    },
    logger: { error() {} },
  };

  const app = express();
  app.use(cookieParser());
  app.use("/api/admin", createAdminRouter(dependencies));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  return {
    user,
    request: (cookie = "gadget_hub_session=test-token") =>
      fetch(`http://127.0.0.1:${server.address().port}/api/admin/access`, {
        headers: cookie ? { Cookie: cookie } : {},
      }),
    requestPath: (path, cookie = "gadget_hub_session=test-token") =>
      fetch(`http://127.0.0.1:${server.address().port}/api/admin${path}`, {
        headers: cookie ? { Cookie: cookie } : {},
      }),
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

test("guest requests are rejected by the admin API", async () => {
  const fixture = await createFixture("admin");
  try {
    const response = await fixture.request("");
    assert.equal(response.status, 401);
  } finally {
    await fixture.close();
  }
});

test("customers are forbidden from directly calling admin APIs", async () => {
  const fixture = await createFixture("customer");
  try {
    for (const path of ["/access", "/inventory", "/analytics/overview"]) {
      const response = path === "/access"
        ? await fixture.request()
        : await fixture.requestPath(path);
      assert.equal(response.status, 403);
      assert.equal(
        (await response.json()).message,
        "You do not have permission to access this resource.",
      );
    }
  } finally {
    await fixture.close();
  }
});

test("admins are allowed only while their MongoDB role remains admin", async () => {
  const fixture = await createFixture("admin");
  try {
    const allowed = await fixture.request();
    const result = await allowed.json();
    assert.equal(allowed.status, 200);
    assert.equal(result.user.role, "admin");
    assert.equal("passwordHash" in result.user, false);

    fixture.user.role = "customer";
    const deniedAfterRoleChange = await fixture.request();
    assert.equal(deniedAfterRoleChange.status, 403);
  } finally {
    await fixture.close();
  }
});

test("inactive accounts cannot use admin APIs", async () => {
  const fixture = await createFixture("admin", false);
  try {
    const response = await fixture.request();
    assert.equal(response.status, 401);
  } finally {
    await fixture.close();
  }
});

test("verifyCustomer allows only database-authenticated customer users", async () => {
  let nextCalled = false;
  const response = {
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

  verifyCustomer({ user: { role: "customer" } }, response, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);

  nextCalled = false;
  verifyCustomer({ user: { role: "admin" } }, response, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 403);
});
