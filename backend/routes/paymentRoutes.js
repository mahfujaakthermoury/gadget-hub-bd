import { Router } from "express";
import {
  createStripeCheckoutController,
} from "../controllers/paymentController.js";
import { verifyCustomer } from "../middleware/roleAuthorization.js";
import { createVerifyToken } from "../middleware/verifyToken.js";

export function createPaymentRouter(dependencies = {}) {
  const router = Router();
  router.post(
    "/stripe/checkout",
    createVerifyToken(dependencies),
    verifyCustomer,
    createStripeCheckoutController(dependencies),
  );
  return router;
}
