import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import PageHeader from "../components/PageHeader.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { products as localProducts } from "../data/products.js";
import { useCatalog } from "../context/CatalogContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

const DEFAULT_PAGE_SIZE = 8;
const MAX_PRICE = Math.max(...localProducts.map((product) => product.price));

export default function ShopPage({
  onAddToCart,
  onToggleWishlist,
  onQuickView,
  wishlist,
}) {
  const { products, productCategories } = useCatalog();
  const { storeSettings } = useTheme();
  const pageSize = storeSettings?.store?.productsPerPage ?? DEFAULT_PAGE_SIZE;
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category") || "All products";
  const queryParam = searchParams.get("q") || "";
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [minimumRating, setMinimumRating] = useState(0);
  const [sortBy, setSortBy] = useState("popular");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const maxPriceLimit = Math.max(
    MAX_PRICE,
    ...products.map((product) => product.price),
  );

  useEffect(() => {
    setMaxPrice(maxPriceLimit);
  }, [maxPriceLimit]);
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize]);

  const category = productCategories.includes(categoryParam)
    ? categoryParam
    : "All products";

  const matchingProducts = useMemo(() => {
    const query = queryParam.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesCategory =
        category === "All products" || product.category === category;
      const matchesSearch =
        !query ||
        `${product.name} ${product.category} ${product.description} ${product.brand || ""}`
          .toLowerCase()
          .includes(query);
      return (
        matchesCategory &&
        matchesSearch &&
        product.price >= minPrice &&
        product.price <= maxPrice &&
        product.rating >= minimumRating
      );
    });

    return filtered.sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "newest")
        return products.indexOf(b) - products.indexOf(a);
      return b.reviews - a.reviews;
    });
  }, [category, queryParam, minPrice, maxPrice, minimumRating, sortBy, products]);

  const updateCategory = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value === "All products") next.delete("category");
    else next.set("category", value);
    setSearchParams(next);
    setVisibleCount(pageSize);
  };

  return (
    <>
      <PageHeader
        eyebrow="The Gadget Hub collection"
        title="Find the right thing for your everyday."
        description="Explore thoughtfully selected electronics, with helpful filters that make it easier to find your next favorite."
        image="https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=2000&q=85"
      />
      <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-blue">
              A good place to start
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold text-ink">
              {category === "All products" ? "Shop all gadgets" : category}
            </h2>
            <p className="mt-1 text-sm text-slate-500" aria-live="polite">
              {matchingProducts.length}{" "}
              {matchingProducts.length === 1 ? "product" : "products"} to explore
              {queryParam ? ` for “${queryParam}”` : ""}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            Sort by
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="select select-bordered select-sm h-10 min-h-10 rounded-full border-slate-200 bg-white text-xs text-ink focus:border-brand-blue focus:outline-none"
            >
              <option value="popular">Popularity</option>
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to high</option>
              <option value="price-high">Price: High to low</option>
            </select>
          </label>
        </div>

        <div className="mb-7 grid gap-4 rounded-2xl border border-slate-100 bg-[#f8fafc] p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:items-end">
          <label className="text-xs font-semibold text-slate-600">
            Category
            <select
              value={category}
              onChange={(event) => updateCategory(event.target.value)}
              className="select select-bordered mt-2 h-11 min-h-11 w-full rounded-xl border-slate-200 bg-white text-xs text-ink focus:border-brand-blue focus:outline-none"
            >
              {productCategories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Minimum price · ৳{minPrice.toLocaleString("en-BD")}
            <input
              type="range"
              min="0"
              max={maxPriceLimit}
              step="500"
              value={minPrice}
              onChange={(event) => {
                setMinPrice(
                  Math.min(Number(event.target.value), maxPrice),
                );
                setVisibleCount(PAGE_SIZE);
              }}
              className="range range-primary range-xs mt-3"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Maximum price · ৳{maxPrice.toLocaleString("en-BD")}
            <input
              type="range"
              min="0"
              max={maxPriceLimit}
              step="500"
              value={maxPrice}
              onChange={(event) => {
                setMaxPrice(
                  Math.max(Number(event.target.value), minPrice),
                );
                setVisibleCount(PAGE_SIZE);
              }}
              className="range range-primary range-xs mt-3"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Customer rating
            <select
              value={minimumRating}
              onChange={(event) => {
                setMinimumRating(Number(event.target.value));
                setVisibleCount(PAGE_SIZE);
              }}
              className="select select-bordered mt-2 h-11 min-h-11 w-full rounded-xl border-slate-200 bg-white text-xs text-ink focus:border-brand-blue focus:outline-none"
            >
              <option value="0">Any rating</option>
              <option value="4.5">4.5 stars & above</option>
              <option value="4.7">4.7 stars & above</option>
              <option value="4.8">4.8 stars & above</option>
              <option value="4.9">4.9 stars & above</option>
            </select>
          </label>
        </div>

        {matchingProducts.length ? (
          <>
            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:gap-5 lg:grid-cols-4">
              {matchingProducts.slice(0, visibleCount).map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  onAddToCart={onAddToCart}
                  onToggleWishlist={onToggleWishlist}
                  onQuickView={onQuickView}
                  isWishlisted={wishlist.some((item) => item.id === product.id)}
                />
              ))}
            </div>
            {visibleCount < matchingProducts.length && (
              <div className="mt-9 flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((count) => count + PAGE_SIZE)
                  }
                  className="btn btn-outline rounded-full border-slate-200 px-7 text-xs font-bold text-ink hover:border-brand-blue hover:bg-brand-blue hover:text-white"
                >
                  Load more products
                </button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="No products match those filters"
            description="Try widening the price range, lowering the rating, or choosing a different category."
            actionLabel="Clear filters"
            actionTo="/shop"
          />
        )}
      </section>
    </>
  );
}
