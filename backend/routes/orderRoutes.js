import { Router } from "express";
import { createCustomerOrderController } from "../controllers/orderController.js";
import { verifyCustomer } from "../middleware/roleAuthorization.js";
import { createVerifyToken } from "../middleware/verifyToken.js";

export function createOrderRouter(dependencies = {}) {
  const router = Router();
  const verifyToken = createVerifyToken(dependencies);
  const orders = createCustomerOrderController(dependencies);
  router.post("/", verifyToken, verifyCustomer, orders.createOrder);
  return router;
}

export function createMyOrdersRouter(dependencies = {}) {
  const router = Router();
  const verifyToken = createVerifyToken(dependencies);
  const orders = createCustomerOrderController(dependencies);
  router.get("/", verifyToken, verifyCustomer, orders.listMyOrders);
  router.get("/:id", verifyToken, verifyCustomer, orders.getMyOrder);
  return router;
}
