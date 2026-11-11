import { Router } from "express";
import { createPublicCatalogController } from "../controllers/catalogController.js";

export function createCatalogRouter(dependencies = {}) {
  const router = Router();
  const controller = createPublicCatalogController(dependencies);
  router.get("/products", controller.listProducts);
  router.get("/categories", controller.listCategories);
  return router;
}
