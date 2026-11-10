import { motion, useReducedMotion } from "motion/react";

export default function Reveal({
  children,
  className = "",
  delay = 0,
  ...props
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.55, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
