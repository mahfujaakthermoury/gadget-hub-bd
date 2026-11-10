import { Router } from "express";
import { createVerifyToken } from "../middleware/verifyToken.js";
import { verifyAdmin } from "../middleware/roleAuthorization.js";

export function createAdminRouter(dependencies = {}) {
  const router = Router();
  const verifyToken = createVerifyToken(dependencies);

  router.get("/access", verifyToken, verifyAdmin, (request, response) => {
    response.status(200).json({
      success: true,
      user: request.user,
    });
  });

  return router;
}
