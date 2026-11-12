import assert from "node:assert/strict";
import { once } from "node:events";
import cookieParser from "cookie-parser";
import express from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import test from "node:test";
import {
  authCookieName,
  getAuthCookieClearOptions,
  getAuthCookieOptions,
} from "../config/authCookie.js";
import { createAuthRouter } from "../routes/authRoutes.js";
import { ensureSessionIndexes } from "../models/sessions.js";
import { createAuthToken, verifyAuthToken } from "../utils/jwt.js";
import { hashPassword, verifyPassword } from "../utils/passwordHash.js";

const testPassword = "correct-horse-battery-staple";
const testSecret = "gadget-hub-test-secret-with-at-least-32-bytes";
const environmentKeys = [
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "AUTH_COOKIE_SAME_SITE",
  "NODE_ENV",
];

async function withAuthEnvironment(overrides = {}, callback) {
  const previous = new Map(
    environmentKeys.map((key) => [key, process.env[key]]),
  );
  const values = {
    JWT_SECRET: testSecret,
    JWT_EXPIRES_IN: "1h",
    AUTH_COOKIE_SAME_SITE: "lax",
    NODE_ENV: "development",
    ...overrides,
  };

  for (const key of environmentKeys) {
    if (values[key] === null || values[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = values[key];
    }
  }

  try {
    return await callback();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function createFixture({ active = true, loginAttemptLimit } = {}) {
  const userId = new ObjectId();
  const passwordHash = await hashPassword(testPassword);
  const user = {
    _id: userId,
    name: "Alex Rahman",
    email: "alex@example.com",
    emailNormalized: "alex@example.com",
    passwordHash,
    role: "customer",
    isActive: active,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const sessions = [];
  const errors = [];

  const usersCollection = {
    findOne: async (filter, options = {}) => {
      const found = filter.emailNormalized
        ? filter.emailNormalized === user.emailNormalized
          ? user
          : null
        : filter._id?.equals(user._id)
          ? user
          : null;
      if (!found || options.projection?.passwordHash !== 0) return found;
      const { passwordHash: omitted, ...safeUser } = found;
      return safeUser;
    },
  };

  const sessionsCollection = {
    insertOne: async (session) => {
      sessions.push(session);
      return { insertedId: new ObjectId() };
    },
    findOne: async (filter) =>
      sessions.find(
        (session) =>
          session.jti === filter.jti &&
          session.userId.equals(filter.userId) &&
          session.revokedAt === null &&
          session.expiresAt > filter.expiresAt.$gt,
      ) ?? null,
    updateOne: async (filter, update) => {
      const session = sessions.find(
        (item) => item.jti === filter.jti && item.revokedAt === null,
      );
      if (!session) return { matchedCount: 0 };
      Object.assign(session, update.$set);
      return { matchedCount: 1 };
    },
  };

  return {
    user,
    sessions,
    errors,
    dependencies: {
      loadUsers: async () => usersCollection,
      loadSessions: async () => sessionsCollection,
      loadSettings: async () => ({
        findOne: async () =>
          loginAttemptLimit === undefined
            ? null
            : { security: { loginAttemptLimit } },
      }),
      hash: hashPassword,
      verify: verifyPassword,
      createToken: createAuthToken,
      cookieOptions: getAuthCookieOptions,
      clearCookieOptions: getAuthCookieClearOptions,
      verifyJwt: verifyAuthToken,
      logger: { error: (...args) => errors.push(args) },
    },
  };
}

async function withAuthServer(dependencies, callback) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/auth", createAuthRouter(dependencies));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    return await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function requestJson(url, path, { method = "GET", body, cookie } = {}) {
  return fetch(`${url}/api/auth${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function loginBody(overrides = {}) {
  return {
    email: "  ALEX@EXAMPLE.COM ",
    password: testPassword,
    ...overrides,
  };
}

function cookiePair(setCookie) {
  return setCookie.split(";")[0];
}

test("login creates a session and sets a safe HttpOnly JWT cookie", async () =>
  withAuthEnvironment({}, async () => {
    const fixture = await createFixture();

    await withAuthServer(fixture.dependencies, async (url) => {
      const response = await requestJson(url, "/login", {
        method: "POST",
        body: loginBody(),
      });
      const result = await response.json();
      const setCookie = response.headers.get("set-cookie");

      assert.equal(response.status, 200);
      assert.equal(result.success, true);
      assert.equal(result.user._id, fixture.user._id.toString());
      assert.equal(result.user.role, "customer");
      assert.equal("token" in result, false);
      assert.equal("passwordHash" in result.user, false);
      assert.match(setCookie, /HttpOnly/iu);
      assert.match(setCookie, /SameSite=Lax/iu);
      assert.match(setCookie, /Path=\//iu);
      assert.doesNotMatch(setCookie, /;\s*Secure(?:;|$)/iu);
      const maxAge = Number(/Max-Age=(\d+)/iu.exec(setCookie)?.[1]);
      assert.ok(maxAge > 3500 && maxAge <= 3600);

      const token = cookiePair(setCookie).slice(authCookieName.length + 1);
      const decoded = jwt.decode(token, { complete: true });
      assert.equal(decoded.header.alg, "HS256");
      assert.equal(decoded.payload.iss, "gadget-hub");
      assert.equal(decoded.payload.aud, "gadget-hub-web");
      assert.equal(decoded.payload.sub, fixture.user._id.toString());
      assert.equal(typeof decoded.payload.jti, "string");
      assert.equal("role" in decoded.payload, false);
      assert.equal("email" in decoded.payload, false);
      assert.equal(fixture.sessions.length, 1);
      assert.equal(fixture.sessions[0].jti, decoded.payload.jti);
      assert.equal(fixture.sessions[0].userId.toString(), decoded.payload.sub);
      assert.equal(fixture.sessions[0].revokedAt, null);
      assert.equal(
        fixture.sessions[0].expiresAt.getTime(),
        decoded.payload.exp * 1000,
      );
    });
  }));

test("current-user verification survives refresh and logout revokes the copied JWT", async () =>
  withAuthEnvironment({}, async () => {
    const fixture = await createFixture();

    await withAuthServer(fixture.dependencies, async (url) => {
      const login = await requestJson(url, "/login", {
        method: "POST",
        body: loginBody(),
      });
      const cookie = cookiePair(login.headers.get("set-cookie"));

      for (let refresh = 0; refresh < 2; refresh += 1) {
        const currentUser = await requestJson(url, "/me", { cookie });
        const result = await currentUser.json();
        assert.equal(currentUser.status, 200);
        assert.deepEqual(Object.keys(result.user).sort(), [
          "_id",
          "email",
          "name",
          "role",
        ]);
        assert.equal(result.user._id, fixture.user._id.toString());
        assert.equal(result.user.role, "customer");
      }

      const logout = await requestJson(url, "/logout", {
        method: "POST",
        cookie,
      });
      const clearCookie = logout.headers.get("set-cookie");
      assert.equal(logout.status, 200);
      assert.match(clearCookie, /^gadget_hub_session=;/u);
      assert.match(clearCookie, /HttpOnly/iu);
      assert.match(clearCookie, /SameSite=Lax/iu);
      assert.match(clearCookie, /Path=\//iu);
      assert.ok(fixture.sessions[0].revokedAt instanceof Date);

      const reusedToken = await requestJson(url, "/me", { cookie });
      assert.equal(reusedToken.status, 401);
    });
  }));

test("wrong password and unknown email return the same generic response", async () =>
  withAuthEnvironment({}, async () => {
    const fixture = await createFixture();

    await withAuthServer(fixture.dependencies, async (url) => {
      const wrongPassword = await requestJson(url, "/login", {
        method: "POST",
        body: loginBody({ password: "incorrect-password" }),
      });
      const wrongResult = await wrongPassword.json();
      const unknownEmail = await requestJson(url, "/login", {
        method: "POST",
        body: loginBody({ email: "unknown@example.com" }),
      });
      const unknownResult = await unknownEmail.json();

      assert.equal(wrongPassword.status, 401);
      assert.equal(unknownEmail.status, 401);
      assert.deepEqual(wrongResult, unknownResult);
      assert.equal(wrongResult.message, "Invalid email or password.");
      assert.equal(fixture.sessions.length, 0);
    });
  }));

test("inactive accounts cannot log in", async () =>
  withAuthEnvironment({}, async () => {
    const fixture = await createFixture({ active: false });

    await withAuthServer(fixture.dependencies, async (url) => {
      const response = await requestJson(url, "/login", {
        method: "POST",
        body: loginBody(),
      });
      assert.equal(response.status, 401);
      assert.equal((await response.json()).message, "Invalid email or password.");
      assert.equal(fixture.sessions.length, 0);
    });
  }));

test("missing JWT secret fails login without creating a session", async () =>
  withAuthEnvironment({ JWT_SECRET: null }, async () => {
    const fixture = await createFixture();

    await withAuthServer(fixture.dependencies, async (url) => {
      const response = await requestJson(url, "/login", {
        method: "POST",
        body: loginBody(),
      });
      const result = await response.json();

      assert.equal(response.status, 500);
      assert.equal(result.message, "Authentication is not configured.");
      assert.equal(response.headers.get("set-cookie"), null);
      assert.equal(fixture.sessions.length, 0);
    });
  }));

test("expired JWTs and expired MongoDB sessions are rejected", async () =>
  withAuthEnvironment({}, async () => {
    const fixture = await createFixture();
    const expiredToken = jwt.sign(
      { iat: Math.floor(Date.now() / 1000) - 10 },
      testSecret,
      {
        algorithm: "HS256",
        issuer: "gadget-hub",
        audience: "gadget-hub-web",
        subject: fixture.user._id.toString(),
        jwtid: "expired-token",
        expiresIn: -1,
      },
    );
    const validToken = createAuthToken(fixture.user._id);
    fixture.sessions.push({
      jti: validToken.jti,
      userId: fixture.user._id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
    });

    await withAuthServer(fixture.dependencies, async (url) => {
      const expiredJwtResponse = await requestJson(url, "/me", {
        cookie: `${authCookieName}=${expiredToken}`,
      });
      const expiredSessionResponse = await requestJson(url, "/me", {
        cookie: `${authCookieName}=${validToken.token}`,
      });

      assert.equal(expiredJwtResponse.status, 401);
      assert.equal(expiredSessionResponse.status, 401);
    });
  }));

test("missing cookie and inactive current user are rejected", async () =>
  withAuthEnvironment({}, async () => {
    const fixture = await createFixture();
    const authToken = createAuthToken(fixture.user._id);
    fixture.sessions.push({
      jti: authToken.jti,
      userId: fixture.user._id,
      createdAt: authToken.createdAt,
      expiresAt: authToken.expiresAt,
      revokedAt: null,
    });

    await withAuthServer(fixture.dependencies, async (url) => {
      const missingCookie = await requestJson(url, "/me");
      assert.equal(missingCookie.status, 401);

      fixture.user.isActive = false;
      const inactiveUser = await requestJson(url, "/me", {
        cookie: `${authCookieName}=${authToken.token}`,
      });
      assert.equal(inactiveUser.status, 401);
    });
  }));

test("production cookies include Secure", async () =>
  withAuthEnvironment({ NODE_ENV: "production" }, async () => {
    const fixture = await createFixture();

    await withAuthServer(fixture.dependencies, async (url) => {
      const response = await requestJson(url, "/login", {
        method: "POST",
        body: loginBody(),
      });
      assert.equal(response.status, 200);
      assert.match(response.headers.get("set-cookie"), /;\s*Secure(?:;|$)/iu);
    });
  }));

test("session indexes include unique jti and TTL expiry", async () => {
  const createdIndexes = [];
  await ensureSessionIndexes({
    createIndex: async (keys, options) => {
      createdIndexes.push({ keys, options });
    },
  });

  assert.equal(
    createdIndexes.find((index) => index.options.unique)?.options.name,
    "uniq_sessions_jti",
  );
  assert.equal(
    createdIndexes.find((index) => index.options.expireAfterSeconds === 0)
      ?.options.name,
    "sessions_expiry_ttl",
  );
  assert.equal(
    createdIndexes.find((index) => index.options.name === "sessions_user_id")
      ?.keys.userId,
    1,
  );
});

test("login attempts are rate limited", async () =>
  withAuthEnvironment({}, async () => {
    const dependencies = {
      loadUsers: async () => ({ findOne: async () => null }),
      loadSettings: async () => ({ findOne: async () => null }),
      hash: async () => "unused-test-hash",
      logger: { error() {} },
    };

    await withAuthServer(dependencies, async (url) => {
      const responses = [];
      for (let attempt = 0; attempt < 6; attempt += 1) {
        responses.push(
          await requestJson(url, "/login", {
            method: "POST",
            body: loginBody({ email: `user${attempt}@example.com` }),
          }),
        );
      }

      assert.deepEqual(
        responses.map((response) => response.status),
        [401, 401, 401, 401, 401, 429],
      );
    });
  }));

test("login attempt limit follows the saved administrator security setting", async () => {
  const fixture = await createFixture({ loginAttemptLimit: 1 });
  await withAuthEnvironment({}, async () => {
    await withAuthServer(fixture.dependencies, async (url) => {
      const first = await requestJson(url, "/login", {
        method: "POST",
        body: loginBody({ password: "incorrect-password" }),
      });
      const second = await requestJson(url, "/login", {
        method: "POST",
        body: loginBody({ password: "incorrect-password" }),
      });
      assert.equal(first.status, 401);
      assert.equal(second.status, 429);
    });
  });
});
