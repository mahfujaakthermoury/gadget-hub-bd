import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Eye, Heart, ShoppingBag, Star } from "lucide-react";
import { formatPrice } from "../data/products.js";

export default function ProductCard({
  product,
  onAddToCart,
  onToggleWishlist,
  onQuickView,
  isWishlisted,
  index = 0,
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const unavailable =
    product.active === false ||
    product.available === false ||
    product.stockQuantity === 0;

  return (
    <motion.article
      layout
      initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.35,
        delay: index * 0.035,
      }}
      whileHover={shouldReduceMotion ? undefined : { y: -5 }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_18px_rgba(20,37,61,0.04)] transition-shadow duration-300 hover:shadow-[0_16px_38px_rgba(20,37,61,0.10)]"
    >
      <div className="relative m-2.5 overflow-hidden rounded-xl bg-[#f4f7fa] sm:m-3">
        <a
          href={`#product-${product.id}`}
          onClick={(event) => {
            event.preventDefault();
            onQuickView(product);
          }}
          aria-label={`View ${product.name}`}
          className="block aspect-[1.18/1] overflow-hidden"
        >
          <img
            src={product.image}
            alt={product.name}
            loading={index > 3 ? "lazy" : "eager"}
            decoding="async"
            onLoad={() => setImageLoaded(true)}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "/product-placeholder.svg";
            }}
            className={`h-full w-full object-cover transition duration-500 group-hover:scale-[1.045] ${
              imageLoaded ? "opacity-100" : "opacity-90"
            }`}
          />
        </a>
        <span
          className={`badge absolute left-3 top-3 border-0 px-2.5 py-3 text-[10px] font-bold ${
            product.badgeTone === "purple"
              ? "bg-purple-100 text-brand-purple"
              : product.badgeTone === "teal"
                ? "bg-teal-100 text-teal-800"
                : "bg-sky-100 text-sky-800"
          }`}
        >
          {product.badge}
        </span>
        {unavailable ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-slate-800/90 px-2.5 py-1 text-[10px] font-semibold text-white">
            Unavailable
          </span>
        ) : product.stock === "Low stock" ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">
            Almost gone
          </span>
        ) : null}
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.88 }}
            onClick={() => onToggleWishlist(product)}
            aria-label={
              isWishlisted
                ? `Remove ${product.name} from wishlist`
                : `Add ${product.name} to wishlist`
            }
            aria-pressed={isWishlisted}
            className={`btn btn-circle btn-xs border-0 shadow-sm transition ${
              isWishlisted
                ? "bg-brand-purple text-white"
                : "bg-white/95 text-slate-600 hover:bg-white hover:text-brand-purple"
            }`}
          >
            <Heart size={15} fill={isWishlisted ? "currentColor" : "none"} />
          </motion.button>
          <button
            type="button"
            onClick={() => onQuickView(product)}
            aria-label={`Quick view ${product.name}`}
            className="btn btn-circle btn-xs border-0 bg-white/95 text-slate-600 shadow-sm transition hover:bg-white hover:text-brand-blue"
          >
            <Eye size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-3 pb-3.5 pt-1.5 sm:px-4 sm:pb-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {product.category}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-ink">
            <Star size={13} className="fill-amber-400 text-amber-400" />
            {product.rating}
            <span className="font-medium text-slate-400">
              ({product.reviews})
            </span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => onQuickView(product)}
          className="line-clamp-1 text-left font-display text-[14px] font-bold leading-6 text-ink transition-colors hover:text-brand-blue sm:text-[15px]"
        >
          {product.name}
        </button>
        <p className="mt-1 line-clamp-2 min-h-[36px] text-[11px] leading-[18px] text-slate-500 sm:text-xs">
          {product.description}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-3">
          <span className="text-base font-extrabold text-ink">
            {formatPrice(product.price)}
          </span>
          {product.oldPrice > product.price && (
            <span className="text-xs font-medium text-slate-400 line-through">
              {formatPrice(product.oldPrice)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onAddToCart(product)}
          disabled={unavailable}
          className="btn btn-primary mt-3 min-h-10 h-10 w-full rounded-full border-0 bg-brand-blue text-xs font-bold text-white shadow-none transition hover:bg-brand-purple disabled:bg-slate-300 disabled:text-slate-600"
        >
          <ShoppingBag size={15} />
          {unavailable ? "Unavailable" : "Add to bag"}
        </button>
      </div>
    </motion.article>
  );
}
