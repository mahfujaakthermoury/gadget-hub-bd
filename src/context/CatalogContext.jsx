import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { categories as localCategories } from "../data/categories.js";
import { productCategories as localProductCategories, products as localProducts } from "../data/products.js";

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/u, "");
const CatalogContext = createContext(null);

async function fetchCatalog(path) {
  const response = await fetch(`${apiBaseUrl}/api/catalog/${path}`);
  const result = await response.json();
  if (!response.ok || !Array.isArray(result.data)) {
    throw new Error(result.error || "The product catalog could not be loaded.");
  }
  return result.data;
}

async function fetchAllProducts() {
  const firstPage = await fetch(`${apiBaseUrl}/api/catalog/products?limit=100&page=1`);
  const firstResult = await firstPage.json();
  if (!firstPage.ok || !Array.isArray(firstResult.data)) {
    throw new Error(firstResult.error || "The product catalog could not be loaded.");
  }
  const products = [...firstResult.data];
  for (let page = 2; page <= firstResult.pagination.pages; page += 1) {
    products.push(...(await fetchCatalog(`products?limit=100&page=${page}`)));
  }
  return products;
}

export function CatalogProvider({ children }) {
  const [products, setProducts] = useState(localProducts);
  const [categories, setCategories] = useState(localCategories);
  const [isCatalogConnected, setIsCatalogConnected] = useState(false);

  const refreshCatalog = useCallback(async () => {
    try {
      const [nextProducts, nextCategories] = await Promise.all([
        fetchAllProducts(),
        fetchCatalog("categories"),
      ]);
      setProducts(nextProducts);
      setCategories(nextCategories);
      setIsCatalogConnected(true);
    } catch (error) {
      setIsCatalogConnected(false);
      console.warn("Could not load the live Gadget Hub catalog.", error);
    }
  }, []);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  const productCategoryNames = useMemo(
    () => [
      ...new Set([
        ...localProductCategories,
        ...categories.map((category) => category.name),
      ]),
    ],
    [categories],
  );
  const value = useMemo(
    () => ({
      products,
      categories,
      productCategories: productCategoryNames,
      isCatalogConnected,
      refreshCatalog,
    }),
    [products, categories, productCategoryNames, isCatalogConnected, refreshCatalog],
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog() {
  const catalog = useContext(CatalogContext);
  if (!catalog) throw new Error("useCatalog must be used within CatalogProvider.");
  return catalog;
}
