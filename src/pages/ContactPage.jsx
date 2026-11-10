import { useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import PageHeader from "../components/PageHeader.jsx";
import Reveal from "../components/Reveal.jsx";

const contactItems = [
  {
    icon: Mail,
    title: "Email us",
    value: "hello@gadgethub.com.bd",
    href: "mailto:hello@gadgethub.com.bd",
    note: "A placeholder address for this storefront preview.",
  },
  {
    icon: Phone,
    title: "Give us a call",
    value: "+880 1700-000000",
    href: "tel:+8801700000000",
    note: "A placeholder number — replace it before launch.",
  },
  {
    icon: MapPin,
    title: "Where we are",
    value: "Sylhet, Bangladesh",
    href: "https://maps.google.com/?q=Sylhet+Bangladesh",
    note: "Location details are illustrative.",
  },
];

export default function ContactPage() {
  const [notice, setNotice] = useState(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    setNotice({
      type: "success",
      message:
        "Thanks for getting in touch. We’ll get back to you as soon as we can.",
    });
    form.reset();
  };

  return (
    <>
      <PageHeader
        eyebrow="We’d love to hear from you"
        title="Here to help, whenever you need us."
        description="Questions about a product, an order, or what might suit your setup? Send us a note or reach out through the placeholder details below."
        image="https://images.unsplash.com/photo-1525186402429-b4ff38bedec6?auto=format&fit=crop&w=2000&q=85"
      />
      <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {contactItems.map(({ icon: Icon, title, value, href, note }, index) => (
            <Reveal key={title} delay={index * 0.06}>
              <a
                href={href}
                target={href.startsWith("https:") ? "_blank" : undefined}
                rel={href.startsWith("https:") ? "noreferrer" : undefined}
                className="block h-full rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_18px_rgba(20,37,61,0.035)] transition hover:-translate-y-1 hover:shadow-soft"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-pale text-brand-blue">
                  <Icon size={20} />
                </span>
                <h2 className="mt-4 text-sm font-bold text-ink">{title}</h2>
                <p className="mt-1 text-sm font-semibold text-brand-blue">
                  {value}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>
              </a>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1.1fr_.9fr] lg:gap-14">
          <Reveal className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_6px_26px_rgba(20,37,61,0.05)] sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-pale text-brand-blue">
                <MessageCircle size={19} />
              </span>
              <div>
                <h2 className="font-display text-xl font-extrabold text-ink">
                  Send us a message
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  All fields are required.
                </p>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="mt-6 grid gap-4" noValidate>
              <label className="text-xs font-semibold text-slate-600">
                Full name
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  minLength={2}
                  maxLength={100}
                  required
                  placeholder="Your name"
                  className="input input-bordered mt-2 h-12 w-full rounded-xl border-slate-200 text-sm focus:border-brand-blue focus:outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Email address
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  placeholder="you@example.com"
                  className="input input-bordered mt-2 h-12 w-full rounded-xl border-slate-200 text-sm focus:border-brand-blue focus:outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Subject
                <input
                  type="text"
                  name="subject"
                  required
                  minLength={3}
                  maxLength={120}
                  placeholder="How can we help?"
                  className="input input-bordered mt-2 h-12 w-full rounded-xl border-slate-200 text-sm focus:border-brand-blue focus:outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Message
                <textarea
                  name="message"
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={5}
                  placeholder="Tell us a little more..."
                  className="textarea textarea-bordered mt-2 w-full rounded-xl border-slate-200 text-sm leading-6 focus:border-brand-blue focus:outline-none"
                />
              </label>
              <div aria-live="polite">
                {notice && (
                  <p
                    className={`flex items-start gap-2 rounded-xl p-3 text-xs leading-5 ${
                      notice.type === "success"
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-rose-50 text-rose-800"
                    }`}
                  >
                    {notice.type === "success" && (
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                    )}
                    {notice.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                className="btn btn-primary w-full rounded-full border-0 bg-brand-blue text-white hover:bg-brand-purple sm:w-auto sm:px-8"
              >
                Send message
              </button>
            </form>
          </Reveal>

          <Reveal delay={0.1} className="grid gap-5">
            <div className="rounded-3xl bg-[#f7f9fc] p-5 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-blue shadow-sm">
                  <Clock3 size={19} />
                </span>
                <h2 className="font-display text-lg font-extrabold text-ink">
                  We’re happy to help
                </h2>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-500">
                This preview is being built for Gadget Hub in Bangladesh.
                Published support hours and response times will be added before
                launch.
              </p>
            </div>
            <div className="flex min-h-56 flex-col justify-end overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#e7f8fa,#ecf2ff_55%,#f2eafb)] p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-blue shadow-sm">
                <MapPin size={19} />
              </span>
              <h2 className="mt-4 font-display text-xl font-extrabold text-ink">
                Hello from Sylhet
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                Location placeholder for the future Gadget Hub store or support
                centre in Sylhet, Bangladesh.
              </p>
              <a
                href="https://maps.google.com/?q=Sylhet+Bangladesh"
                target="_blank"
                rel="noreferrer"
                className="mt-4 w-fit text-xs font-bold text-brand-blue hover:text-brand-purple"
              >
                Open map
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
