import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Reveal from "./Reveal.jsx";

export default function PageHeader({ eyebrow, title, description, image, cta }) {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      {image && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url("${image}")` }}
          role="img"
          aria-label=""
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-[#101d36]/95 via-[#123550]/85 to-[#7914a4]/65" />
      <div className="relative mx-auto max-w-[1440px] px-5 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <Reveal className="max-w-3xl">
          {eyebrow && (
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-teal-200">
              {eyebrow}
            </p>
          )}
          <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {description && (
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base sm:leading-8">
              {description}
            </p>
          )}
          {cta && (
            <Link
              to={cta.href}
              className="btn btn-primary mt-7 rounded-full border-0 bg-white px-6 text-sm font-bold text-ink shadow-none hover:bg-brand-teal hover:text-white"
            >
              {cta.label} <ArrowRight size={16} />
            </Link>
          )}
        </Reveal>
      </div>
    </section>
  );
}
