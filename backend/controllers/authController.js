import { getUsersCollection } from "../models/users.js";
import { getSessionsCollection } from "../models/sessions.js";
import { getSettingsCollection } from "../models/settings.js";
import {
  authCookieName,
  getAuthCookieClearOptions,
  getAuthCookieOptions,
} from "../config/authCookie.js";
import {
  createAuthToken,
  JwtConfigurationError,
} from "../utils/jwt.js";
import { hashPassword, verifyPassword } from "../utils/passwordHash.js";
import { validateLogin } from "../validation/loginValidation.js";
import { validateRegistration } from "../validation/registerValidation.js";

const duplicateEmailResponse = {
  success: false,
  message: "An account with this email already exists.",
};

export function createRegistrationController({
  loadUsers = getUsersCollection,
  loadSettings = getSettingsCollection,
  hash = hashPassword,
  logger = console,
} = {}) {
  return async function register(request, response) {
    try {
      const settings = await loadSettings();
      const storeSettings = await settings.findOne(
        { _id: "store-settings" },
      );
      if (storeSettings?.security?.registrationEnabled === false) {
        return response.status(403).json({
          success: false,
          message: "New customer registration is currently unavailable.",
        });
      }
      const validation = validateRegistration(request.body, {
        minimumPasswordLength:
          storeSettings?.security?.minimumPasswordLength ?? 6,
      });
      if (!validation.valid) {
        return response.status(400).json({
          success: false,
          message: "Please check the provided registration details.",
          errors: validation.errors,
        });
      }
      const users = await loadUsers();
      const { name, email, emailNormalized, password } = validation.data;

      if (await users.findOne({ emailNormalized }, { projection: { _id: 1 } })) {
        return response.status(409).json(duplicateEmailResponse);
      }

      const passwordHash = await hash(password);
      const now = new Date();
      const userDocument = {
        name,
        email,
        emailNormalized,
        passwordHash,
        role: "customer",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      let result;
      try {
        result = await users.insertOne(userDocument);
      } catch (error) {
        if (error?.code === 11000) {
          return response.status(409).json(duplicateEmailResponse);
        }
        throw error;
      }

      return response.status(201).json({
        success: true,
        message: "Your account has been created.",
        user: {
          id: result.insertedId.toString(),
          name,
          email,
          role: userDocument.role,
          isActive: userDocument.isActive,
          createdAt: now,
          updatedAt: now,
        },
      });
    } catch (error) {
      logger.error("User registration failed.", error?.name, error?.code);
      return response.status(500).json({
        success: false,
        message: "Unable to create your account right now. Please try again.",
      });
    }
  };
}

const invalidCredentialsResponse = {
  success: false,
  message: "Invalid email or password.",
};

export function createLoginController({
  loadUsers = getUsersCollection,
  loadSettings = getSettingsCollection,
  loadSessions = getSessionsCollection,
  hash = hashPassword,
  verify = verifyPassword,
  createToken = createAuthToken,
  cookieOptions = getAuthCookieOptions,
  logger = console,
} = {}) {
  return async function login(request, response) {
    const validation = validateLogin(request.body);
    if (!validation.valid) {
      return response.status(400).json({
        success: false,
        message: "Please provide a valid email and password.",
        errors: validation.errors,
      });
    }

    try {
      const users = await loadUsers();
      const user = await users.findOne({
        emailNormalized: validation.data.emailNormalized,
      });

      if (!user) {
        await hash(validation.data.password);
        return response.status(401).json(invalidCredentialsResponse);
      }

      const passwordMatches = await verify(
        user.passwordHash,
        validation.data.password,
      );
      if (!passwordMatches || user.isActive !== true) {
        return response.status(401).json(invalidCredentialsResponse);
      }

      const settings = await loadSettings();
      const storeSettings = await settings.findOne({ _id: "store-settings" });
      const durationSeconds =
        (storeSettings?.security?.sessionDurationMinutes ?? 60) * 60;
      const authToken = await createToken(user._id, durationSeconds);
      const authCookieOptions = cookieOptions(authToken.expiresAt);
      const sessions = await loadSessions();
      await sessions.insertOne({
        jti: authToken.jti,
        userId: user._id,
        createdAt: authToken.createdAt,
        expiresAt: authToken.expiresAt,
        revokedAt: null,
      });

      response.cookie(
        authCookieName,
        authToken.token,
        authCookieOptions,
      );
      return response.status(200).json({
        success: true,
        message: "You are now signed in.",
        user: {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      logger.error("User login failed.", error?.name, error?.code);
      return response.status(500).json({
        success: false,
        message:
          error instanceof JwtConfigurationError
            ? "Authentication is not configured."
            : "Unable to sign in right now. Please try again.",
      });
    }
  };
}

export function createLogoutController({
  loadSessions = getSessionsCollection,
  clearCookieOptions = getAuthCookieClearOptions,
  logger = console,
} = {}) {
  return async function logout(request, response) {
    try {
      const sessions = await loadSessions();
      const result = await sessions.updateOne(
        { jti: request.auth.jti, revokedAt: null },
        { $set: { revokedAt: new Date() } },
      );
      if (result.matchedCount !== 1) {
        return response.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      response.clearCookie(authCookieName, clearCookieOptions());
      return response.status(200).json({
        success: true,
        message: "You have been logged out.",
      });
    } catch (error) {
      logger.error("User logout failed.", error?.name, error?.code);
      return response.status(500).json({
        success: false,
        message: "Unable to log out right now. Please try again.",
      });
    }
  };
}

export function createCurrentUserController() {
  return function currentUser(request, response) {
    return response.status(200).json({
      success: true,
      user: request.user,
    });
  };
}
