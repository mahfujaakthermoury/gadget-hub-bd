import { ObjectId } from "mongodb";
import { authCookieName } from "../config/authCookie.js";
import { getSessionsCollection } from "../models/sessions.js";
import { getUsersCollection } from "../models/users.js";
import {
  JwtConfigurationError,
  verifyAuthToken,
} from "../utils/jwt.js";

const unauthorizedResponse = {
  success: false,
  message: "Authentication required.",
};

export function createVerifyToken({
  loadUsers = getUsersCollection,
  loadSessions = getSessionsCollection,
  verifyJwt = verifyAuthToken,
  logger = console,
} = {}) {
  return async function verifyToken(request, response, next) {
    const token = request.cookies?.[authCookieName];
    if (!token) return response.status(401).json(unauthorizedResponse);

    let claims;
    try {
      claims = await verifyJwt(token);
    } catch (error) {
      if (error instanceof JwtConfigurationError) {
        logger.error("JWT configuration is invalid.", error.name);
        return response.status(500).json({
          success: false,
          message: "Authentication is not configured.",
        });
      }
      return response.status(401).json(unauthorizedResponse);
    }

    if (
      typeof claims.sub !== "string" ||
      typeof claims.jti !== "string" ||
      !ObjectId.isValid(claims.sub)
    ) {
      return response.status(401).json(unauthorizedResponse);
    }

    try {
      const userId = new ObjectId(claims.sub);
      const sessions = await loadSessions();
      const session = await sessions.findOne({
        jti: claims.jti,
        userId,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      });
      if (!session) return response.status(401).json(unauthorizedResponse);

      const users = await loadUsers();
      const user = await users.findOne(
        { _id: userId },
        { projection: { passwordHash: 0 } },
      );
      if (!user || user.isActive !== true) {
        return response.status(401).json(unauthorizedResponse);
      }

      request.user = {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      };
      request.auth = { jti: claims.jti, userId: request.user._id };
      return next();
    } catch (error) {
      logger.error("Session verification failed.", error?.name, error?.code);
      return response.status(500).json({
        success: false,
        message: "Unable to verify your session right now.",
      });
    }
  };
}

export const verifyToken = createVerifyToken();
