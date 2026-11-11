import { Router } from "express";
import { createAdminCatalogController } from "../controllers/catalogController.js";
import { createCustomerController } from "../controllers/customerController.js";
import { createAdminOrderController } from "../controllers/orderController.js";
import { createVerifyToken } from "../middleware/verifyToken.js";
import { verifyAdmin } from "../middleware/roleAuthorization.js";

export function createAdminRouter(dependencies = {}) {
  const router = Router();
  const verifyToken = createVerifyToken(dependencies);
  const catalog = createAdminCatalogController(dependencies);
  const orders = createAdminOrderController(dependencies);
  const customers = createCustomerController(dependencies);

  router.get("/access", verifyToken, verifyAdmin, (request, response) => {
    response.status(200).json({
      success: true,
      user: request.user,
    });
  });

  router.get("/products", verifyToken, verifyAdmin, catalog.listProducts);
  router.post("/products", verifyToken, verifyAdmin, catalog.createProduct);
  router.put("/products/:id", verifyToken, verifyAdmin, catalog.updateProduct);
  router.delete("/products/:id", verifyToken, verifyAdmin, catalog.deleteProduct);
  router.get("/categories", verifyToken, verifyAdmin, catalog.listCategories);
  router.post("/categories", verifyToken, verifyAdmin, catalog.createCategory);
  router.get("/categories/:id", verifyToken, verifyAdmin, catalog.getCategory);
  router.put("/categories/:id", verifyToken, verifyAdmin, catalog.updateCategory);
  router.delete("/categories/:id", verifyToken, verifyAdmin, catalog.deleteCategory);
  router.get("/orders", verifyToken, verifyAdmin, orders.listOrders);
  router.get("/orders/:id", verifyToken, verifyAdmin, orders.getOrder);
  router.patch("/orders/:id/status", verifyToken, verifyAdmin, orders.updateOrderStatus);
  router.get("/customers", verifyToken, verifyAdmin, customers.listCustomers);
  router.get("/customers/:id", verifyToken, verifyAdmin, customers.getCustomer);
  router.get(
    "/customers/:id/orders",
    verifyToken,
    verifyAdmin,
    customers.listCustomerOrders,
  );
  router.patch(
    "/customers/:id/status",
    verifyToken,
    verifyAdmin,
    customers.updateCustomerStatus,
  );

  return router;
}
