import { Router } from "express";
import { createProfileController } from "../controllers/profileController.js";
import { receiveImage } from "../middleware/receiveImage.js";
import { createVerifyToken } from "../middleware/verifyToken.js";

export function createProfileRouter(dependencies = {}) {
  const router = Router();
  const verifyToken = createVerifyToken(dependencies);
  const profile = createProfileController(dependencies);

  router.get("/", verifyToken, profile.getProfile);
  router.patch("/", verifyToken, profile.updateProfile);
  router.post("/password", verifyToken, profile.updatePassword);
  router.post("/avatar", verifyToken, receiveImage, profile.uploadAvatar);
  return router;
}
