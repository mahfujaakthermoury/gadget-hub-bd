import { Link } from "react-router-dom";

function PageFrame({ eyebrow, title, description, children }) {
  return (
    <section className="mx-auto min-h-[60vh] max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-blue">
        {eyebrow}
      </p>
      <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
        {description}
      </p>
      {children}
    </section>
  );
}

export function AccountPage({ user }) {
  return (
    <PageFrame
      eyebrow="Your account"
      title={`Welcome, ${user.name}`}
      description="Your account is authenticated by Gadget Hub. Profile management will be available in a later phase."
    >
      <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 p-5 sm:p-6">
        <p className="text-sm font-semibold text-ink">Account email</p>
        <p className="mt-1 text-sm text-slate-500">{user.email}</p>
      </div>
    </PageFrame>
  );
}

export function MyOrdersPage() {
  return (
    <PageFrame
      eyebrow="Your account"
      title="My orders"
      description="Order history will appear here when the order service is available."
    >
      <div className="mt-8 rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center">
        <p className="text-sm font-semibold text-ink">No order data available</p>
        <p className="mt-2 text-sm text-slate-500">
          This page will show your orders after the order API is implemented.
        </p>
      </div>
    </PageFrame>
  );
}

export function UnauthorizedPage() {
  return (
    <PageFrame
      eyebrow="Access denied"
      title="You don't have permission to view this page"
      description="Administrator pages are limited to users whose current account role is admin."
    >
      <Link
        to="/"
        className="btn btn-primary mt-6 rounded-full border-0 bg-brand-blue text-white hover:bg-brand-purple"
      >
        Return to Gadget Hub
      </Link>
    </PageFrame>
  );
}
