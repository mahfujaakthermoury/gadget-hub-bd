import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import Reveal from "./Reveal.jsx";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const handleSubmit = (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setSubmitted(false);
      setMessage("Please enter a valid email address.");
      return;
    }

    setSubmitted(true);
    setMessage(
      `Thanks for your interest! Email signups will go live with the full store.`,
    );
    setEmail("");
  };

  return (
    <Reveal>
      <section
        aria-labelledby="newsletter-heading"
        className="relative overflow-hidden rounded-[26px] bg-brand-gradient px-6 py-10 text-white sm:px-10 sm:py-12 lg:px-16"
      >
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full border border-white/15" />
        <div className="pointer-events-none absolute -right-2 -top-10 h-48 w-48 rounded-full border border-white/10" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div className="max-w-xl">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.17em]">
              <Mail size={13} />
              A good email, once in a while
            </span>
            <h2
              id="newsletter-heading"
              className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl"
            >
              Stay Updated with
              <br className="hidden sm:block" /> Our Latest Offers.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-7 text-white/80">
              Be first to hear about new arrivals, thoughtful tech tips, and
              offers worth opening your inbox for.
            </p>
          </div>
          <div className="w-full lg:w-[390px]">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-2 rounded-2xl bg-white p-2 sm:flex-row"
              noValidate
            >
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setMessage("");
                  setSubmitted(false);
                }}
                aria-label="Email address"
                aria-describedby={message ? "newsletter-message" : undefined}
                placeholder="Your email address"
                className="input input-ghost h-11 min-h-11 flex-1 rounded-xl bg-transparent text-sm text-ink outline-none focus:bg-slate-50 focus:outline-none"
              />
              <motion.button
                type="submit"
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                className="btn btn-primary h-11 min-h-11 rounded-xl border-0 bg-brand-blue px-5 text-xs font-bold text-white hover:bg-brand-purple"
              >
                Subscribe <ArrowRight size={16} />
              </motion.button>
            </form>
            <p
              id="newsletter-message"
              aria-live="polite"
              className={`mt-3 flex min-h-5 items-center gap-1.5 text-[11px] ${
                submitted
                  ? "text-white"
                  : message
                    ? "text-amber-100"
                    : "text-white/70"
              }`}
            >
              {submitted && <CheckCircle2 size={14} />}
              {message ||
                "By subscribing, you agree to receive product updates and offers. Unsubscribe anytime."}
            </p>
          </div>
        </div>
      </section>
    </Reveal>
  );
}
