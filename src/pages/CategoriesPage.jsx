import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Sparkles } from "lucide-react";
import CategoryCard from "../components/CategoryCard.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Reveal from "../components/Reveal.jsx";
import SectionHeading from "../components/SectionHeading.jsx";
import { categories } from "../data/categories.js";
import { products } from "../data/products.js";

const getCount = (categoryName) =>
  products.filter((product) => product.category === categoryName).length;

export default function CategoriesPage() {
  const shouldReduceMotion = useReducedMotion();
  const popular = categories.filter((category) => category.popular);
  const featured = categories.filter((category) => category.featured);

  return (
    <>
      <PageHeader
        eyebrow="Find your corner of tech"
        title="Good things, grouped together."
        description="Explore all ten collections, from thoughtful everyday essentials to gear for your next big idea."
        image="https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=2000&q=85"
      />
      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <SectionHeading
          eyebrow="Where to begin"
          title="Popular Categories"
          description="A few of the collections customers love to explore."
          action={
            <Link
              to="/shop"
              className="btn btn-outline rounded-full border-slate-200 text-xs font-bold text-ink hover:border-brand-blue hover:bg-brand-blue hover:text-white"
            >
              Shop everything <ArrowRight size={15} />
            </Link>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map((category, index) => (
            <motion.div
              key={category.slug}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.4,
                delay: index * 0.05,
              }}
            >
              <CategoryCard category={category} count={getCount(category.name)} />
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-[#f7f9fc] py-12 sm:py-16">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
          <SectionHeading
            eyebrow="Picked for everyday life"
            title="Featured Categories"
            description="A few good places to discover useful upgrades and new favorites."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {featured.map((category, index) => (
              <Reveal
                key={category.slug}
                delay={index * 0.07}
                className={index === 0 ? "lg:row-span-2" : ""}
              >
                <CategoryCard
                  category={category}
                  count={getCount(category.name)}
                  featured
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <Reveal className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-pale text-brand-blue">
            <Sparkles size={20} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-blue">
              Ten ways to find your next favorite
            </p>
            <h2 className="font-display text-xl font-extrabold text-ink sm:text-2xl">
              All Categories
            </h2>
          </div>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, index) => (
            <Reveal key={category.slug} delay={index * 0.025}>
              <CategoryCard
                category={category}
                count={getCount(category.name)}
              />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
