import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { ObjectId } from "mongodb";
import test from "node:test";
import { createAuthRouter } from "../routes/authRoutes.js";
import { ensureUserIndexes } from "../models/users.js";
import { argon2idOptions, hashPassword } from "../utils/passwordHash.js";
import { createAdminSeeder, AdminSeedError } from "../scripts/seedAdmin.js";

const validRegistration = {
  name: "Alex Rahman",
  email: "Alex@example.com",
  password: "Example-password-8",
  confirmPassword: "Example-password-8",
};

function createDependencies({ existingUsers = [], registrationEnabled = true } = {}) {
  const storedUsers = [];
  const errors = [];
  const collection = {
    findOne: async ({ emailNormalized }) =>
      [...existingUsers, ...storedUsers].find(
        (user) => user.emailNormalized === emailNormalized,
      ) ?? null,
    insertOne: async (document) => {
      if (
        storedUsers.some(
          (user) => user.emailNormalized === document.emailNormalized,
        )
      ) {
        const error = new Error("duplicate key");
        error.code = 11000;
        throw error;
      }

      const insertedId = new ObjectId();
      storedUsers.push({ ...document, _id: insertedId });
      return { insertedId };
    },
  };

  return {
    storedUsers,
    errors,
    collection,
    loadUsers: async () => collection,
    loadSettings: async () => ({
      findOne: async () =>
        registrationEnabled ? null : { security: { registrationEnabled: false } },
    }),
    hash: async (password) => `$argon2id$test:${password}`,
    logger: { error: (...args) => errors.push(args) },
  };
}

async function withRegistrationEndpoint(dependencies, callback) {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", createAuthRouter(dependencies));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    return await callback(
      `http://127.0.0.1:${server.address().port}/api/auth/register`,
    );
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function postRegistration(url, body) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("creates a customer with a normalized email and safe response", async () => {
  const dependencies = createDependencies();

  await withRegistrationEndpoint(dependencies, async (url) => {
    const response = await postRegistration(url, validRegistration);
    const result = await response.json();

    assert.equal(response.status, 201);
    assert.equal(result.success, true);
    assert.equal(result.user.role, "customer");
    assert.equal(result.user.email, "Alex@example.com");
    assert.equal(dependencies.storedUsers[0].emailNormalized, "alex@example.com");
    assert.equal(
      dependencies.storedUsers[0].passwordHash,
      `$argon2id$test:${validRegistration.password}`,
    );
    assert.equal("passwordHash" in result.user, false);
    assert.equal("password" in dependencies.storedUsers[0], false);
    assert.equal("confirmPassword" in dependencies.storedUsers[0], false);
  });
});

test("rejects duplicate normalized email addresses", async () => {
  const dependencies = createDependencies({
    existingUsers: [{ emailNormalized: "alex@example.com" }],
  });

  test("respects the administrator's customer registration setting", async () => {
    const dependencies = createDependencies({ registrationEnabled: false });
    await withRegistrationEndpoint(dependencies, async (url) => {
      const response = await postRegistration(url, validRegistration);
      assert.equal(response.status, 403);
      assert.match((await response.json()).message, /registration is currently unavailable/iu);
      assert.equal(dependencies.storedUsers.length, 0);
    });
  });

  await withRegistrationEndpoint(dependencies, async (url) => {
    const response = await postRegistration(url, {
      ...validRegistration,
      email: "  alex@EXAMPLE.com ",
    });

    assert.equal(response.status, 409);
    assert.equal((await response.json()).success, false);
    assert.equal(dependencies.storedUsers.length, 0);
  });
});

test("rejects an invalid email", async () => {
  await withRegistrationEndpoint(createDependencies(), async (url) => {
    const response = await postRegistration(url, {
      ...validRegistration,
      email: "not-an-email",
    });

    assert.equal(response.status, 400);
    assert.equal("email" in (await response.json()).errors, true);
  });
});

test("rejects missing registration fields", async () => {
  await withRegistrationEndpoint(createDependencies(), async (url) => {
    const response = await postRegistration(url, {});
    const result = await response.json();

    assert.equal(response.status, 400);
    assert.deepEqual(Object.keys(result.errors).sort(), [
      "confirmPassword",
      "email",
      "name",
      "password",
    ]);
  });
});

test("rejects a password confirmation mismatch", async () => {
  await withRegistrationEndpoint(createDependencies(), async (url) => {
    const response = await postRegistration(url, {
      ...validRegistration,
      confirmPassword: "different-password",
    });

    assert.equal(response.status, 400);
    assert.equal("confirmPassword" in (await response.json()).errors, true);
  });
});

test("rejects a password shorter than six characters", async () => {
  await withRegistrationEndpoint(createDependencies(), async (url) => {
    const response = await postRegistration(url, {
      ...validRegistration,
      password: "Aa1!a",
      confirmPassword: "Aa1!a",
    });

    assert.equal(response.status, 400);
    assert.equal("password" in (await response.json()).errors, true);
  });
});

test("requires uppercase, lowercase, a digit, and a special character", async () => {
  const invalidPasswords = [
    "example-password-8",
    "EXAMPLE-PASSWORD-8!",
    "Example-password!",
    "Examplepassword8",
  ];

  await withRegistrationEndpoint(createDependencies(), async (url) => {
    for (const password of invalidPasswords) {
      const response = await postRegistration(url, {
        ...validRegistration,
        password,
        confirmPassword: password,
      });

      assert.equal(response.status, 400);
      assert.equal("password" in (await response.json()).errors, true);
    }
  });
});

test("rejects a missing password", async () => {
  const { password, ...registrationWithoutPassword } = validRegistration;

  await withRegistrationEndpoint(createDependencies(), async (url) => {
    const response = await postRegistration(url, registrationWithoutPassword);

    assert.equal(response.status, 400);
    assert.equal("password" in (await response.json()).errors, true);
  });
});

test("rejects a public attempt to provide an admin role", async () => {
  const dependencies = createDependencies();

  await withRegistrationEndpoint(dependencies, async (url) => {
    const response = await postRegistration(url, {
      ...validRegistration,
      role: "admin",
    });

    assert.equal(response.status, 400);
    assert.equal(dependencies.storedUsers.length, 0);
    assert.equal(
      (await response.json()).errors.request,
      "Only name, email, password and confirmPassword are allowed.",
    );
  });
});

test("handles a concurrent duplicate-key insert", async () => {
  const dependencies = createDependencies();
  dependencies.collection.insertOne = async () => {
    const error = new Error("duplicate key");
    error.code = 11000;
    throw error;
  };

  await withRegistrationEndpoint(dependencies, async (url) => {
    const response = await postRegistration(url, validRegistration);
    assert.equal(response.status, 409);
  });
});

test("creates the unique emailNormalized index", async () => {
  let index;
  let options;
  await ensureUserIndexes({
    createIndex: async (indexDefinition, indexOptions) => {
      index = indexDefinition;
      options = indexOptions;
      return options.name;
    },
  });

  assert.deepEqual(index, { emailNormalized: 1 });
  assert.equal(options.unique, true);
  assert.equal(options.name, "uniq_users_email_normalized");
});

test("limits registration attempts to five per IP per window", async () => {
  const dependencies = createDependencies();

  await withRegistrationEndpoint(dependencies, async (url) => {
    const responses = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      responses.push(
        await postRegistration(url, {
          ...validRegistration,
          email: `customer${attempt}@example.com`,
        }),
      );
    }

    assert.deepEqual(
      responses.map((response) => response.status),
      [201, 201, 201, 201, 201, 429],
    );
  });
});

test("hashes passwords with the configured Argon2id baseline", async () => {
  const password = "development-benchmark-password";
  const hash = await hashPassword(password);

  assert.equal(argon2idOptions.memoryCost, 19 * 1024);
  assert.equal(argon2idOptions.timeCost, 2);
  assert.equal(argon2idOptions.parallelism, 1);
  assert.match(hash, /^\$argon2id\$/u);
});

test("admin seed creates a hashed admin without returning credentials", async () => {
  const users = [];
  const seed = createAdminSeeder({
    loadUsers: async () => ({
      findOne: async (filter) =>
        users.find(
          (user) =>
            (filter.role && user.role === filter.role) ||
            (filter.emailNormalized &&
              user.emailNormalized === filter.emailNormalized),
        ) ?? null,
      insertOne: async (document) => {
        users.push(document);
        return { insertedId: new ObjectId() };
      },
    }),
    hash: async (password) => `hashed:${password}`,
  });

  const result = await seed({
    email: "Admin@example.com",
    password: "A-strong-admin-password-9",
  });

  assert.equal(result.role, "admin");
  assert.equal(users[0].emailNormalized, "admin@example.com");
  assert.equal(users[0].passwordHash, "hashed:A-strong-admin-password-9");
  assert.equal("password" in users[0], false);
  assert.equal("passwordHash" in result, false);
});

test("admin seed refuses a second admin", async () => {
  const seed = createAdminSeeder({
    loadUsers: async () => ({
      findOne: async ({ role }) =>
        role === "admin" ? { _id: new ObjectId() } : null,
      insertOne: async () => {
        throw new Error("must not insert");
      },
    }),
    hash: async (password) => password,
  });

  await assert.rejects(
    seed({ email: "admin@example.com", password: "A-strong-admin-password-9" }),
    AdminSeedError,
  );
});
