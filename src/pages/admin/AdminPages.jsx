import {
  BarChart3,
  Boxes,
  ClipboardList,
  Package,
  ShoppingCart,
  UsersRound,
} from "lucide-react";

const metrics = [
  { label: "Total revenue", icon: BarChart3 },
  { label: "Total orders", icon: ShoppingCart },
  { label: "Total customers", icon: UsersRound },
  { label: "Total products", icon: Package },
];

function EmptyPanel({ icon: Icon, title, description, className = "" }) {
  return (
    <div
      className={`flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center ${className}`}
    >
      <span className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-400 shadow-sm">
        <Icon size={19} />
      </span>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function SectionCard({ title, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      <h2 className="mb-4 text-sm font-extrabold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function AdminOverviewPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-slate-500">
          Here is your store at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, icon: Icon }) => (
          <section
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            aria-label={label}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-500">{label}</p>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-pale text-brand-blue">
                <Icon size={18} />
              </span>
            </div>
            <p className="mt-4 font-display text-2xl font-extrabold text-slate-300">
              <span aria-label="No data available">—</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Awaiting live store data
            </p>
          </section>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <SectionCard title="Sales overview">
          <EmptyPanel
            icon={BarChart3}
            title="No sales data available"
            description="A sales chart will appear here when the analytics API is connected."
          />
        </SectionCard>
        <SectionCard title="Recent orders">
          <EmptyPanel
            icon={ClipboardList}
            title="No order data available"
            description="Recent customer orders will appear here when the order API is connected."
          />
        </SectionCard>
        <SectionCard title="Top-selling products">
          <EmptyPanel
            icon={Package}
            title="No product sales available"
            description="Top-selling products will appear here when real sales data is available."
          />
        </SectionCard>
        <SectionCard title="Low-stock products">
          <EmptyPanel
            icon={Boxes}
            title="No inventory data available"
            description="Stock alerts will appear here when inventory data is connected."
          />
        </SectionCard>
      </div>
    </div>
  );
}

const sectionDetails = {
  products: {
    title: "Products",
    description: "Manage the products shown in your Gadget Hub storefront.",
    icon: Package,
  },
  categories: {
    title: "Categories",
    description: "Organize products into clear, easy-to-browse categories.",
    icon: Package,
  },
  orders: {
    title: "Orders",
    description: "Review and manage customer orders.",
    icon: ShoppingCart,
  },
  customers: {
    title: "Customers",
    description: "View customer accounts and their store activity.",
    icon: UsersRound,
  },
  inventory: {
    title: "Inventory",
    description: "Monitor stock levels across your product catalog.",
    icon: Boxes,
  },
  analytics: {
    title: "Analytics",
    description: "Explore sales and store performance insights.",
    icon: BarChart3,
  },
  settings: {
    title: "Settings",
    description: "Configure your Gadget Hub store preferences.",
    icon: ClipboardList,
  },
};

export function AdminSectionPage({ section }) {
  const details = sectionDetails[section];
  if (!details) return null;
  const { title, description, icon } = details;

  return (
    <div>
      <p className="mb-6 text-sm leading-6 text-slate-500">{description}</p>
      <SectionCard title={title}>
        <EmptyPanel
          icon={icon}
          title={`No ${title.toLowerCase()} data available`}
          description="This section is ready for its backend integration. No placeholder business records are being shown."
          className="min-h-64"
        />
      </SectionCard>
    </div>
  );
}
