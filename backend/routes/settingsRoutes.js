import { Router } from "express";
import { createAdminSettingsController } from "../controllers/settingsController.js";

export function createPublicSettingsRouter(dependencies = {}) {
  const router = Router();
  const settings = createAdminSettingsController(dependencies);
  router.get("/public", settings.getPublicSettings);
  return router;
}
