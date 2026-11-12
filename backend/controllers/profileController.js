import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { getSessionsCollection } from "../models/sessions.js";
import { getSettingsCollection } from "../models/settings.js";
import { getUsersCollection } from "../models/users.js";
import { uploadImageToCloudinary } from "../services/cloudinaryImageService.js";
import { getPasswordPolicyErrors } from "../validation/registerValidation.js";
import { hashPassword, verifyPassword } from "../utils/passwordHash.js";
import { validateUploadedImage } from "./imageController.js";

const profileFields = new Set(["name", "phoneNumber", "addresses"]);
const addressFields = new Set([
  "id",
  "label",
  "fullName",
  "phoneNumber",
  "addressLine",
  "city",
  "district",
  "postalCode",
  "isDefault",
]);

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function validateProfileBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw httpError(400, "A JSON object is required.");
  }
  for (const key of Object.keys(body)) {
    if (!profileFields.has(key)) throw httpError(400, `Unknown field: ${key}.`);
  }

  const updates = {};
  if ("name" in body) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 100) {
      throw httpError(400, "Name must be between 1 and 100 characters.");
    }
    updates.name = body.name.trim();
  }
  if ("phoneNumber" in body) {
    if (
      typeof body.phoneNumber !== "string" ||
      (body.phoneNumber && !/^[+()\d\s-]{7,24}$/u.test(body.phoneNumber))
    ) {
      throw httpError(400, "Enter a valid phone number.");
    }
    updates.phoneNumber = body.phoneNumber.trim();
  }
  if ("addresses" in body) {
    if (!Array.isArray(body.addresses) || body.addresses.length > 10) {
      throw httpError(400, "Provide no more than 10 shipping addresses.");
    }
    let defaultCount = 0;
    updates.addresses = body.addresses.map((address) => {
      if (!address || typeof address !== "object" || Array.isArray(address)) {
        throw httpError(400, "Each shipping address must be an object.");
      }
      for (const key of Object.keys(address)) {
        if (!addressFields.has(key)) {
          throw httpError(400, `Unknown shipping address field: ${key}.`);
        }
      }
      const requiredTextFields = [
        "label",
        "fullName",
        "phoneNumber",
        "addressLine",
        "city",
        "district",
      ];
      const result = {};
      for (const field of requiredTextFields) {
        const value = address[field];
        if (typeof value !== "string" || !value.trim() || value.length > 200) {
          throw httpError(400, `${field} is required and must be 200 characters or fewer.`);
        }
        result[field] = value.trim();
      }
      if (
        address.postalCode !== undefined &&
        (typeof address.postalCode !== "string" || address.postalCode.length > 20)
      ) {
        throw httpError(400, "Postal code must be 20 characters or fewer.");
      }
      if (
        address.id !== undefined &&
        (typeof address.id !== "string" || address.id.length > 80)
      ) {
        throw httpError(400, "Address ID is invalid.");
      }
      if (address.isDefault !== undefined && typeof address.isDefault !== "boolean") {
        throw httpError(400, "isDefault must be a boolean.");
      }
      result.id = address.id || randomUUID();
      result.postalCode = address.postalCode?.trim() || "";
      result.isDefault = address.isDefault === true;
      if (result.isDefault) defaultCount += 1;
      return result;
    });
    if (defaultCount > 1) {
      throw httpError(400, "Only one shipping address can be the default.");
    }
    if (updates.addresses.length && defaultCount === 0) {
      updates.addresses[0].isDefault = true;
    }
  }
  if (!Object.keys(updates).length) throw httpError(400, "No changes supplied.");
  return updates;
}

function profileResponse(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    phoneNumber: user.phoneNumber || "",
    avatarUrl: user.avatarUrl || "",
    addresses: user.addresses || [],
    createdAt: user.createdAt,
    isActive: user.isActive,
  };
}

export function createProfileController({
  loadUsers = getUsersCollection,
  loadSessions = getSessionsCollection,
  loadSettings = getSettingsCollection,
  hash = hashPassword,
  verify = verifyPassword,
  uploadImage = uploadImageToCloudinary,
} = {}) {
  const loadOwnUser = async (request) => {
    const userId = new ObjectId(request.auth.userId);
    const users = await loadUsers();
    const user = await users.findOne({ _id: userId });
    if (!user) throw httpError(404, "Account not found.");
    return { users, user, userId };
  };

  return {
    getProfile: async (request, response, next) => {
      try {
        const { user } = await loadOwnUser(request);
        response.status(200).json({ success: true, data: profileResponse(user) });
      } catch (error) {
        next(error);
      }
    },
    updateProfile: async (request, response, next) => {
      try {
        const updates = validateProfileBody(request.body);
        const { users, userId } = await loadOwnUser(request);
        updates.updatedAt = new Date();
        const updated = await users.findOneAndUpdate(
          { _id: userId },
          { $set: updates },
          { returnDocument: "after" },
        );
        if (!updated) throw httpError(404, "Account not found.");
        response.status(200).json({ success: true, data: profileResponse(updated) });
      } catch (error) {
        next(error);
      }
    },
    updatePassword: async (request, response, next) => {
      try {
        const body = request.body;
        if (
          !body ||
          typeof body !== "object" ||
          Array.isArray(body) ||
          Object.keys(body).some((key) => !["currentPassword", "newPassword"].includes(key)) ||
          typeof body.currentPassword !== "string" ||
          typeof body.newPassword !== "string"
        ) {
          throw httpError(400, "Current and new passwords are required.");
        }
        const settings = await loadSettings();
        const storeSettings = await settings.findOne({ _id: "store-settings" });
        const passwordErrors = getPasswordPolicyErrors(
          body.newPassword,
          storeSettings?.security?.minimumPasswordLength ?? 6,
        );
        if (passwordErrors.length) throw httpError(400, passwordErrors.join(" "));

        const { users, user, userId } = await loadOwnUser(request);
        if (!(await verify(user.passwordHash, body.currentPassword))) {
          throw httpError(400, "Current password is incorrect.");
        }
        const passwordHash = await hash(body.newPassword);
        await users.updateOne(
          { _id: userId },
          { $set: { passwordHash, updatedAt: new Date() } },
        );
        const sessions = await loadSessions();
        await sessions.updateMany(
          { userId, jti: { $ne: request.auth.jti }, revokedAt: null },
          { $set: { revokedAt: new Date() } },
        );
        response.status(200).json({
          success: true,
          message: "Password updated. Other active sessions have been signed out.",
        });
      } catch (error) {
        next(error);
      }
    },
    uploadAvatar: async (request, response, next) => {
      try {
        if (!validateUploadedImage(request.file)) {
          throw httpError(400, "Upload a valid JPEG, PNG, or WebP image.");
        }
        const avatarUrl = await uploadImage(request.file);
        const { users, userId } = await loadOwnUser(request);
        const updated = await users.findOneAndUpdate(
          { _id: userId },
          { $set: { avatarUrl, updatedAt: new Date() } },
          { returnDocument: "after" },
        );
        if (!updated) throw httpError(404, "Account not found.");
        response.status(201).json({ success: true, data: profileResponse(updated) });
      } catch (error) {
        next(error);
      }
    },
  };
}
