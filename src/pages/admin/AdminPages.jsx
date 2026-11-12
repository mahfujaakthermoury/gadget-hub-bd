import { useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Package,
  ShoppingCart,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatPrice } from "../../data/products.js";
import { getAdminOverview } from "../../services/adminAnalyticsService.js";

const metrics = [
  { key: "revenue", label: "Verified revenue", icon: BarChart3, format: formatPrice },
  { key: "totalOrders", label: "Total orders", icon: ShoppingCart, format: (value) => value.toLocaleString() },
  { key: "totalCustomers", label: "Total customers", icon: UsersRound, format: (value) => value.toLocaleString() },
  { key: "totalProducts", label: "Active products", icon: Package, format: (value) => value.toLocaleString() },
];

function EmptyPanel({ icon: Icon, title, description, className = "" }) {
  return (
    <div className={`flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center ${className}`}>
      <span className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-400 shadow-sm">
        <Icon size={19} />
      </span>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function SectionCard({ title, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <h2 className="mb-4 text-sm font-extrabold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function DataList({ items, renderItem, emptyMessage }) {
  if (!items?.length) {
    return <p className="py-5 text-center text-sm text-slate-500">{emptyMessage}</p>;
  }
  return <ul className="divide-y divide-slate-100">{items.map(renderItem)}</ul>;
}

export function AdminOverviewPage() {
  const [range, setRange] = useState({ from: "", to: "" });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getAdminOverview({ ...range, signal: controller.signal })
      .then((result) => setData(result.data))
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [range]);

  const updateRange = (event) => {
    setRange((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  if (loading && !data) {
    return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading dashboard">
      {metrics.map(({ key }) => <div key={key} className="h-28 animate-pulse rounded-2xl bg-slate-200" />)}
    </div>;
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800" role="alert">
        <p className="font-bold">Dashboard data could not be loaded.</p>
        <p className="mt-1">{error}</p>
        <button className="btn btn-sm mt-4" onClick={() => setRange({ ...range })}>Retry</button>
      </div>
    );
  }

  const trends = data?.monthlyRevenue || [];
  const maxRevenue = Math.max(...trends.map(({ revenue }) => revenue), 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-extrabold text-ink">Store overview</h1>
          <p className="mt-1 text-sm text-slate-500">Live metrics from Gadget Hub’s database.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="text-xs font-semibold text-slate-600">From
            <input type="date" name="from" value={range.from} onChange={updateRange} className="input input-bordered input-sm mt-1 block" />
          </label>
          <label className="text-xs font-semibold text-slate-600">To
            <input type="date" name="to" value={range.to} onChange={updateRange} className="input input-bordered input-sm mt-1 block" />
          </label>
        </div>
      </div>
      {error && <p className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ key, label, icon: Icon, format }) => (
          <section key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label={label}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-500">{label}</p>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-pale text-brand-blue"><Icon size={18} /></span>
            </div>
            <p className="mt-4 font-display text-2xl font-extrabold text-ink">
              {data ? format(data[key] || 0) : "—"}
            </p>
            {key === "revenue" && <p className="mt-1 text-[11px] text-slate-400">Paid orders verified by Stripe</p>}
          </section>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <SectionCard title="Monthly verified revenue">
          {!trends.length ? (
            <EmptyPanel icon={BarChart3} title="No verified sales in this period" description="Revenue appears after payment is confirmed by the payment provider." />
          ) : (
            <div className="space-y-4">
              {trends.map(({ month, revenue, orders }) => (
                <div key={month}>
                  <div className="mb-1 flex justify-between gap-3 text-xs">
                    <span className="font-semibold text-slate-600">{month}</span>
                    <span className="text-slate-500">{formatPrice(revenue)} · {orders} paid</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${month}: ${formatPrice(revenue)}`}>
                    <div className="h-full rounded-full bg-brand-blue" style={{ width: `${maxRevenue ? Math.max(2, revenue / maxRevenue * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title="Order status">
          <DataList
            items={data?.orderStatus}
            emptyMessage="No orders were created during the selected period."
            renderItem={({ status, count }) => (
              <li key={status} className="flex items-center justify-between py-3 text-sm">
                <span className="capitalize text-slate-600">{status.replaceAll("_", " ")}</span>
                <span className="font-bold text-ink">{count.toLocaleString()}</span>
              </li>
            )}
          />
        </SectionCard>
        <SectionCard title="Best-selling products">
          <DataList
            items={data?.topProducts}
            emptyMessage="No order items are available in this period."
            renderItem={(item) => (
              <li key={item.productId} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="font-semibold text-ink">{item.name}</span>
                <span className="shrink-0 text-slate-500">{item.quantity} sold · {formatPrice(item.revenue)}</span>
              </li>
            )}
          />
        </SectionCard>
        <SectionCard title={`Stock alerts (threshold ${data?.threshold ?? 0})`}>
          <div className="mb-3 flex gap-4 text-xs font-semibold">
            <span className="text-amber-700">{data?.lowStockCount ?? 0} low stock</span>
            <span className="text-rose-700">{data?.outOfStockCount ?? 0} out of stock</span>
            <Link to="/admin/inventory" className="ml-auto text-brand-blue hover:underline">Manage inventory</Link>
          </div>
          <DataList
            items={[...(data?.lowStockProducts || []), ...(data?.outOfStockProducts || [])]}
            emptyMessage="No active products need replenishment."
            renderItem={(product) => (
              <li key={product.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="font-semibold text-ink">{product.name}</span>
                <span className={product.stockQuantity ? "text-amber-700" : "text-rose-700"}>
                  {product.stockQuantity ? `${product.stockQuantity} left` : "Out of stock"}
                </span>
              </li>
            )}
          />
        </SectionCard>
      </div>
    </div>
  );
}

const sectionDetails = {
  products: { title: "Products", description: "Manage the products shown in your Gadget Hub storefront.", icon: Package },
  categories: { title: "Categories", description: "Organize products into clear, easy-to-browse categories.", icon: Package },
  orders: { title: "Orders", description: "Review and manage customer orders.", icon: ShoppingCart },
  customers: { title: "Customers", description: "View customer accounts and their store activity.", icon: UsersRound },
  analytics: { title: "Analytics", description: "Explore sales and store performance insights.", icon: BarChart3 },
  settings: { title: "Settings", description: "Configure your Gadget Hub store preferences.", icon: ClipboardList },
};

export function AdminSectionPage({ section }) {
  const details = sectionDetails[section];
  if (!details) return null;
  const { title, description, icon: Icon } = details;
  return (
    <div>
      <p className="mb-6 text-sm leading-6 text-slate-500">{description}</p>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <EmptyPanel icon={Icon} title={`No ${title.toLowerCase()} data available`} description="This section is ready for its backend integration. No placeholder business records are being shown." className="min-h-64" />
      </section>
    </div>
  );
}
