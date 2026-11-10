import { motion, useReducedMotion } from "motion/react";

export default function FeatureCard({ icon: Icon, title, description, index }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.4, delay: index * 0.08 }}
      whileHover={shouldReduceMotion ? undefined : { y: -3 }}
      className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_16px_rgba(20,37,61,0.035)] transition-shadow hover:shadow-soft sm:p-5"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-pale text-brand-blue">
        <Icon size={21} strokeWidth={1.8} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-ink">{title}</h3>
        <p className="mt-1.5 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </motion.article>
  );
}
