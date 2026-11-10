import "dotenv/config";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { closeDatabase } from "../db.js";
import { getUsersCollection } from "../models/users.js";
import {
  getPasswordPolicyErrors,
  isValidEmail,
} from "../validation/registerValidation.js";
import { hashPassword } from "../utils/passwordHash.js";

export class AdminSeedError extends Error {}

export function createAdminSeeder({
  loadUsers = getUsersCollection,
  hash = hashPassword,
} = {}) {
  return async function seedAdmin({ email, password } = {}) {
    if (typeof email !== "string" || !email.trim()) {
      throw new AdminSeedError("ADMIN_EMAIL is required.");
    }
    if (typeof password !== "string" || !password) {
      throw new AdminSeedError("ADMIN_PASSWORD is required.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      throw new AdminSeedError("ADMIN_EMAIL must be a valid email address.");
    }

    if (Array.from(password).length < 12) {
      throw new AdminSeedError("ADMIN_PASSWORD must be at least 12 characters.");
    }
    const passwordErrors = getPasswordPolicyErrors(password);
    if (passwordErrors.length > 0) {
      throw new AdminSeedError(passwordErrors.join(" "));
    }

    const users = await loadUsers();
    const existingAdmin = await users.findOne(
      { role: "admin" },
      { projection: { _id: 1 } },
    );
    if (existingAdmin) {
      throw new AdminSeedError(
        "An admin account already exists; refusing to seed another.",
      );
    }

    const existingEmail = await users.findOne(
      { emailNormalized: normalizedEmail },
      { projection: { _id: 1 } },
    );
    if (existingEmail) {
      throw new AdminSeedError(
        "That email already belongs to an account; refusing to promote it.",
      );
    }

    const now = new Date();
    const document = {
      name: "Gadget Hub Admin",
      email: email.trim(),
      emailNormalized: normalizedEmail,
      passwordHash: await hash(password),
      role: "admin",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const result = await users.insertOne(document);
      return {
        id: result.insertedId.toString(),
        role: document.role,
      };
    } catch (error) {
      if (error?.code === 11000) {
        throw new AdminSeedError(
          "An account with this email already exists; no admin was created.",
        );
      }
      throw error;
    }
  };
}

const isDirectExecution =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  try {
    await createAdminSeeder()({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    console.log("Initial admin account created.");
  } catch (error) {
    console.error(
      error instanceof AdminSeedError
        ? error.message
        : "Admin seeding failed. Check the database connection and local admin settings.",
    );
    process.exitCode = 1;
  } finally {
    await closeDatabase().catch(() => {
      console.error("Could not close the admin seed database connection.");
      process.exitCode = 1;
    });
  }
}
