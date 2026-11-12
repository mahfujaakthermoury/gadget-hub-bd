import {
  ArrowUpRight,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Youtube,
} from "lucide-react";
import { Link } from "react-router-dom";

const quickLinks = [
  ["Home", "/"],
  ["Shop", "/shop"],
  ["About Us", "/about"],
  ["Contact", "/contact"],
];

const helpLinks = [
  ["FAQs", "/contact"],
  ["Shipping policy", "/contact"],
  ["Returns & exchanges", "/contact"],
  ["Privacy policy", "/contact"],
];

const socials = [
  { label: "Facebook", Icon: Facebook, href: "https://www.facebook.com/" },
  { label: "Instagram", Icon: Instagram, href: "https://www.instagram.com/" },
  { label: "LinkedIn", Icon: Linkedin, href: "https://www.linkedin.com/" },
  { label: "YouTube", Icon: Youtube, href: "https://www.youtube.com/" },
];

export default function Footer() {
  return (
    <footer id="contact" className="bg-[#111F35] text-white">
      <div className="mx-auto max-w-[1440px] px-5 pb-8 pt-12 sm:px-8 sm:pt-16 lg:px-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.35fr_.8fr_.95fr_1.15fr] lg:gap-12">
          <div>
            <Link
              to="/"
              className="inline-flex rounded-lg bg-white p-1.5"
              aria-label="Gadget Hub home"
            >
              <img
                src="/gadget-hub-logo.jpeg"
                alt="Gadget Hub — Smarter tech. Better life."
                className="h-12 w-[176px] object-contain"
                loading="lazy"
              />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-7 text-slate-300/75">
              Thoughtfully picked tech for the everyday. Helping you make room
              for work, play, and everything in between.
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              {socials.map(({ label, Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-slate-300 transition hover:-translate-y-0.5 hover:border-brand-teal hover:bg-brand-teal hover:text-white"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white">
              Get to know us
            </h2>
            <ul className="grid gap-3">
              {quickLinks.map(([label, href]) => (
                <li key={label}>
                  <Link
                    to={href}
                    className="inline-flex items-center gap-1 text-sm text-slate-300/75 transition hover:text-brand-teal"
                  >
                    {label} <ArrowUpRight size={12} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white">
              Here to help
            </h2>
            <ul className="grid gap-3">
              {helpLinks.map(([label, href]) => (
                <li key={label}>
                  <Link
                    to={href}
                    className="text-sm text-slate-300/75 transition hover:text-brand-teal"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white">
              Say hello
            </h2>
            <ul className="grid gap-3.5">
              <li>
                <a
                  href="mailto:hello@gadgethub.com.bd"
                  className="flex items-center gap-3 text-sm text-slate-300/75 transition hover:text-brand-teal"
                >
                  <Mail size={16} className="shrink-0 text-brand-teal" />
                  hello@gadgethub.com.bd
                </a>
              </li>
              <li>
                <a
                  href="tel:+8801700000000"
                  className="flex items-center gap-3 text-sm text-slate-300/75 transition hover:text-brand-teal"
                >
                  <Phone size={16} className="shrink-0 text-brand-teal" />
                  +880 1700-000000
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm leading-6 text-slate-300/75">
                <MapPin size={16} className="mt-1 shrink-0 text-brand-teal" />
                Sylhet, Bangladesh
              </li>
            </ul>
            <Link
              to="/#newsletter-heading"
              className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-brand-teal transition hover:text-white"
            >
              Get the good stuff in your inbox <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-slate-400 sm:mt-14 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Gadget Hub. Made for everyday living.
          </p>
          <p>Developed by AlgoSolver Team</p>
        </div>
      </div>
    </footer>
  );
}
