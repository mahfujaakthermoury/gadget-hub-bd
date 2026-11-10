import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Boxes } from "lucide-react";
import { Link } from "react-router-dom";

export default function CategoryCard({ category, count, featured = false }) {
  const shouldReduceMotion = useReducedMotion();
  const to = `/shop?category=${encodeURIComponent(category.name)}`;

  return (
    <motion.article
      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
      className={`group relative isolate overflow-hidden rounded-2xl bg-ink shadow-[0_8px_24px_rgba(20,37,61,0.08)] ${
        featured ? "min-h-64 sm:min-h-80" : "min-h-56"
      }`}
    >
      <Link
        to={to}
        aria-label={`Explore ${category.name}`}
        className="absolute inset-0"
      >
        <img
          src={category.image}
          alt=""
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/product-placeholder.svg";
          }}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#101b36]/95 via-[#101b36]/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur">
            <Boxes size={12} />
            {count} {count === 1 ? "item" : "items"}
          </span>
          <h3 className="font-display text-xl font-extrabold leading-tight sm:text-2xl">
            {category.name}
          </h3>
          <p className="mt-2 max-w-md text-xs leading-5 text-white/75 sm:text-sm">
            {category.description}
          </p>
          <span className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-white transition-colors group-hover:text-teal-200">
            Explore category
            <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </Link>
    </motion.article>
  );
}
