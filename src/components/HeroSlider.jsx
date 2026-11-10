import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";

const slides = [
  {
    eyebrow: "Good things are in store",
    title: "Meet your next\nfavorite thing.",
    description:
      "Everyday tech, thoughtfully picked. Find the little upgrades that make a big difference.",
    button: "Find your next favorite",
    href: "#products",
    image:
      "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=2200&q=90",
    imageAlt: "A thoughtfully arranged collection of modern electronics",
    shade: "from-[#101b36]/85 via-[#122a48]/60 to-[#132c49]/10",
    label: "THE EVERYDAY TECH EDIT",
  },
  {
    eyebrow: "A little quieter. A lot more you.",
    title: "Find your\nfocus frequency.",
    description:
      "Thoughtful audio for deep work, slow mornings, and the long way home.",
    button: "Explore audio",
    href: "#categories",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=2200&q=90",
    imageAlt: "Wireless over-ear headphones in a clean studio setting",
    shade: "from-[#191536]/85 via-[#30234f]/60 to-[#38204e]/10",
    label: "LISTEN A LITTLE CLOSER",
  },
  {
    eyebrow: "Make room for good ideas",
    title: "A better desk.\nA brighter day.",
    description:
      "From a more comfortable click to a warmer glow, little things add up.",
    button: "Upgrade your setup",
    href: "#products",
    image:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=2200&q=90",
    imageAlt: "A laptop set up on a bright and inviting workspace",
    shade: "from-[#12374a]/85 via-[#175766]/60 to-[#165b68]/10",
    label: "YOUR SPACE, YOUR PACE",
  },
];

export default function HeroSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const shouldReduceMotion = useReducedMotion();
  const slide = slides[activeIndex];

  const goTo = (index) => {
    setDirection(index >= activeIndex ? 1 : -1);
    setActiveIndex((index + slides.length) % slides.length);
  };

  useEffect(() => {
    if (shouldReduceMotion) return undefined;
    const timer = window.setInterval(() => {
      setDirection(1);
      setActiveIndex((index) => (index + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [shouldReduceMotion]);

  return (
    <section
      id="home"
      className="relative mx-auto max-w-[1440px] overflow-hidden bg-ink lg:rounded-b-[32px]"
      aria-label="Featured collections"
    >
      <div className="relative min-h-[520px] sm:min-h-[590px] lg:min-h-[640px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${slide.image}")` }}
            initial={
              shouldReduceMotion
                ? false
                : { opacity: 0, x: direction * 40, scale: 1.025 }
            }
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.8 }}
            role="img"
            aria-label={slide.imageAlt}
          />
        </AnimatePresence>
        <div
          className={`absolute inset-0 bg-gradient-to-r ${slide.shade} sm:bg-gradient-to-r`}
        />
        <div className="relative mx-auto flex min-h-[520px] max-w-[1440px] items-center px-6 py-14 sm:min-h-[590px] sm:px-12 lg:min-h-[640px] lg:px-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={
                shouldReduceMotion
                  ? false
                  : { opacity: 0, x: direction * 20 }
              }
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -20 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.42 }}
              className="max-w-2xl text-white"
            >
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] backdrop-blur-sm sm:text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-teal" />
                {slide.label}
              </span>
              <p className="mb-3 text-sm font-semibold text-white/75 sm:text-base">
                {slide.eyebrow}
              </p>
              <h1 className="whitespace-pre-line font-display text-[2.8rem] font-extrabold leading-[1.05] tracking-[-0.045em] sm:text-6xl lg:text-[76px]">
                {slide.title}
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-7 text-white/80 sm:mt-6 sm:text-base sm:leading-8">
                {slide.description}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4 sm:mt-9">
                <a
                  href={slide.href}
                  className="btn btn-primary group h-12 min-h-12 rounded-full border-0 bg-white px-6 text-sm font-bold text-ink shadow-lg transition hover:-translate-y-0.5 hover:bg-brand-teal hover:text-white"
                >
                  {slide.button}
                  <ArrowRight
                    size={17}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </a>
                <a
                  href="#categories"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition hover:text-white"
                >
                  Browse categories <ArrowDown size={16} />
                </a>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="absolute bottom-7 left-6 flex items-center gap-2 sm:bottom-9 sm:left-12 lg:left-20">
            <button
              type="button"
              onClick={() => goTo(activeIndex - 1)}
              className="btn btn-circle btn-sm border-white/25 bg-white/10 text-white backdrop-blur transition hover:border-white hover:bg-white hover:text-ink"
              aria-label="Previous slide"
            >
              <ArrowLeft size={17} />
            </button>
            <button
              type="button"
              onClick={() => goTo(activeIndex + 1)}
              className="btn btn-circle btn-sm border-white/25 bg-white/10 text-white backdrop-blur transition hover:border-white hover:bg-white hover:text-ink"
              aria-label="Next slide"
            >
              <ArrowRight size={17} />
            </button>
            <div
              className="ml-3 flex items-center gap-2"
              aria-label={`Slide ${activeIndex + 1} of ${slides.length}`}
            >
              {slides.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeIndex
                      ? "w-8 bg-white"
                      : "w-3 bg-white/40 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="absolute bottom-8 right-7 hidden text-right text-xs font-semibold tracking-[0.2em] text-white/70 sm:block lg:right-12">
            0{activeIndex + 1}
            <span className="px-2 text-white/35">/</span>
            0{slides.length}
          </div>
        </div>
      </div>
    </section>
  );
}
