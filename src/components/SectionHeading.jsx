import Reveal from "./Reveal.jsx";

export default function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  centered = false,
}) {
  return (
    <Reveal
      className={`mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between ${
        centered ? "text-center sm:flex-col sm:items-center" : ""
      }`}
    >
      <div className={centered ? "max-w-2xl" : "max-w-2xl"}>
        {eyebrow && (
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand-blue">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
            {description}
          </p>
        )}
      </div>
      {action}
    </Reveal>
  );
}
