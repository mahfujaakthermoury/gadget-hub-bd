import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";

export default function ToastNotification({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8 }}
          className="toast toast-bottom toast-center z-[80] sm:toast-end"
        >
          <div className="alert border-0 bg-ink text-white shadow-soft">
            <Check size={18} className="text-brand-teal" />
            <span className="text-sm">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
