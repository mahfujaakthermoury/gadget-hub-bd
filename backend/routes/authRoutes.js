import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  createCurrentUserController,
  createLoginController,
  createLogoutController,
  createRegistrationController,
} from "../controllers/authController.js";
import { createVerifyToken } from "../middleware/verifyToken.js";

export function createAuthRouter(dependencies = {}) {
  const router = Router();
  const registrationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many registration attempts. Please try again later.",
    },
  });
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many login attempts. Please try again later.",
    },
  });
  const verifyToken = createVerifyToken(dependencies);

  router.post(
    "/register",
    registrationLimiter,
    createRegistrationController(dependencies),
  );
  router.post("/login", loginLimiter, createLoginController(dependencies));
  router.post(
    "/logout",
    verifyToken,
    createLogoutController(dependencies),
  );
  router.get("/me", verifyToken, createCurrentUserController());
  return router;
}
