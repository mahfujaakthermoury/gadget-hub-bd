import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  Heart,
  Lightbulb,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import Reveal from "../components/Reveal.jsx";
import SectionHeading from "../components/SectionHeading.jsx";

const values = [
  {
    icon: Heart,
    title: "People before products",
    description:
      "We start with what makes a customer’s everyday easier, not just what’s new.",
  },
  {
    icon: BadgeCheck,
    title: "Thoughtful choices",
    description:
      "A clear, considered collection helps you spend less time comparing.",
  },
  {
    icon: ShieldCheck,
    title: "Care that continues",
    description:
      "Good service, honest details, and support should stay with you after checkout.",
  },
  {
    icon: Lightbulb,
    title: "Curiosity for what’s next",
    description:
      "We stay curious about useful ideas that make life a little better.",
  },
];

const team = [
  {
    name: "Ayesha Rahman",
    role: "Founder & Customer Experience",
    image:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=85",
  },
  {
    name: "Tanvir Hasan",
    role: "Product & Technology",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=85",
  },
  {
    name: "Nusrat Jahan",
    role: "Community & Support",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=85",
  },
];

export default function AboutPage() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <>
      <PageHeader
        eyebrow="A little about Gadget Hub"
        title="Smarter tech. Better life."
        description="We’re building a more thoughtful way to find the technology that fits your everyday — useful, dependable, and a joy to bring home."
        image="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=2000&q=85"
        cta={{ label: "Explore the collection", href: "/shop" }}
      />

      <section className="mx-auto grid max-w-[1440px] items-center gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-2 lg:gap-16 lg:px-12">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-blue">
            Our story
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
            The right gadget can change the rhythm of a day.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
            Gadget Hub began with a simple thought: finding good technology
            should feel exciting, not overwhelming. We’re creating a welcoming
            place for people in Bangladesh to discover useful devices, make
            confident choices, and get support from a team that cares.
          </p>
          <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
            Our collection brings together workday essentials, sound for your
            favorite moments, and small upgrades that make home feel more like
            yours. We’re growing thoughtfully and building for the long term.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="relative">
          <img
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1100&q=85"
            alt="A small team sharing ideas around a table"
            loading="lazy"
            className="h-72 w-full rounded-3xl object-cover shadow-soft sm:h-[390px]"
          />
          <div className="absolute -bottom-4 left-4 rounded-2xl bg-white px-5 py-4 shadow-soft sm:-left-5">
            <p className="font-display text-sm font-extrabold text-ink">
              A little more thought.
            </p>
            <p className="mt-1 text-xs text-slate-500">A lot more everyday joy.</p>
          </div>
        </Reveal>
      </section>

      <section className="bg-[#f7f9fc] py-12 sm:py-16">
        <div className="mx-auto grid max-w-[1440px] gap-5 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-2 lg:px-12">
          <Reveal className="rounded-3xl bg-white p-6 shadow-[0_6px_25px_rgba(20,37,61,0.04)] sm:p-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-pale text-brand-blue">
              <Lightbulb size={21} />
            </span>
            <h2 className="mt-5 font-display text-xl font-extrabold text-ink">
              Our mission
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              Make useful, thoughtfully selected technology easier to discover
              and enjoy — with honest information and people-first service.
            </p>
          </Reveal>
          <Reveal
            delay={0.08}
            className="rounded-3xl bg-ink p-6 text-white shadow-[0_6px_25px_rgba(20,37,61,0.08)] sm:p-8"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-teal-200">
              <Sparkles size={21} />
            </span>
            <h2 className="mt-5 font-display text-xl font-extrabold">
              Our vision
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/70">
              Grow into a trusted destination for everyday technology in
              Bangladesh — one thoughtful product and helpful experience at a
              time.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <SectionHeading
          eyebrow="What matters to us"
          title="A good experience, at every step."
          description="The details matter, from finding the right product to getting a little help afterwards."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ icon: Icon, title, description }, index) => (
            <motion.article
              key={title}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.4,
                delay: index * 0.06,
              }}
              className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_18px_rgba(20,37,61,0.035)]"
            >
              <Icon size={22} className="text-brand-blue" />
              <h3 className="mt-4 text-sm font-bold text-ink">{title}</h3>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                {description}
              </p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="bg-brand-gradient py-10 text-white sm:py-12">
        <div className="mx-auto grid max-w-[1100px] grid-cols-2 gap-6 px-5 text-center sm:grid-cols-4 sm:px-8">
          {[
            ["10", "Gadget categories"],
            ["৳", "Local currency"],
            ["24/7", "Online storefront"],
            ["1", "Thoughtful mission"],
          ].map(([value, label], index) => (
            <Reveal key={label} delay={index * 0.05}>
              <p className="font-display text-3xl font-extrabold sm:text-4xl">
                {value}
              </p>
              <p className="mt-2 text-xs font-medium text-white/80">{label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <SectionHeading
          eyebrow="The people behind the picks"
          title="Small team. Big curiosity."
          description="Meet the team shaping the Gadget Hub experience. Profiles are placeholders for the storefront preview."
        />
        <div className="grid gap-5 sm:grid-cols-3">
          {team.map((member, index) => (
            <Reveal key={member.name} delay={index * 0.08}>
              <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_18px_rgba(20,37,61,0.04)]">
                <img
                  src={member.image}
                  alt={member.name}
                  loading="lazy"
                  className="h-64 w-full object-cover"
                />
                <div className="p-5">
                  <h3 className="font-display font-extrabold text-ink">
                    {member.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{member.role}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-14 sm:px-8 sm:pb-16 lg:px-12">
        <Reveal className="flex flex-col gap-5 rounded-3xl bg-[#f7f9fc] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-blue">
              Something good is just around the corner
            </p>
            <h2 className="mt-2 font-display text-2xl font-extrabold text-ink">
              Find a little upgrade for your everyday.
            </h2>
          </div>
          <Link
            to="/shop"
            className="btn btn-primary shrink-0 rounded-full border-0 bg-brand-blue text-white hover:bg-brand-purple"
          >
            Explore products <ArrowRight size={16} />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
