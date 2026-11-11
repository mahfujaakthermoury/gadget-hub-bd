import { useEffect, useState } from "react";
import { Eye, Search } from "lucide-react";
import { adminCatalogRequest } from "../../services/adminCatalogService.js";
import { formatPrice } from "../../data/products.js";

const orderStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
const allowedNext = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};
const paymentStatuses = ["pending", "paid", "failed", "refunded"];

function StatusBadge({ value }) {
  const tone =
    value === "delivered" || value === "paid"
      ? "badge-success"
      : value === "cancelled" || value === "failed"
        ? "badge-error"
        : value === "shipped" || value === "processing"
          ? "badge-info"
          : "badge-warning";
  return <span className={`badge capitalize ${tone}`}>{value}</span>;
}

function Notice({ error, success }) {
  if (!error && !success) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`mb-4 rounded-xl px-4 py-3 text-sm ${
        error
          ? "border border-rose-200 bg-rose-50 text-rose-700"
          : "border border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {error || success}
    </p>
  );
}

function OrderDetails({ order, busy, onClose, onStatusChange }) {
  const [nextStatus, setNextStatus] = useState("");
  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-details-title"
        className="my-auto w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Order details</p>
            <h2 id="order-details-title" className="mt-1 font-display text-xl font-extrabold text-ink">
              {order.orderNumber || order.id}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString()}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>

        <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400">Customer</p>
            <p className="mt-1 text-sm font-bold text-ink">{order.customer?.name}</p>
            <p className="text-xs text-slate-500">{order.customer?.email}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-[11px] font-bold uppercase text-slate-400">Order status</p><div className="mt-1"><StatusBadge value={order.status} /></div></div>
            <div><p className="text-[11px] font-bold uppercase text-slate-400">Payment status</p><div className="mt-1"><StatusBadge value={order.paymentStatus} /></div></div>
            <div><p className="text-[11px] font-bold uppercase text-slate-400">Payment method</p><p className="mt-1 capitalize text-ink">{order.paymentMethod.replaceAll("_", " ")}</p></div>
            <div><p className="text-[11px] font-bold uppercase text-slate-400">Total</p><p className="mt-1 font-bold text-ink">{formatPrice(order.totalAmount)}</p></div>
          </div>
        </div>

        <h3 className="mb-2 mt-5 text-sm font-extrabold text-ink">Items</h3>
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
          {order.items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between gap-4 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <img src={item.image || "/product-placeholder.svg"} alt="" className="h-10 w-10 rounded-lg bg-slate-100 object-cover" />
                <div className="min-w-0"><p className="truncate text-sm font-bold text-ink">{item.name}</p><p className="text-xs text-slate-500">{formatPrice(item.unitPrice)} × {item.quantity}</p></div>
              </div>
              <p className="shrink-0 text-sm font-bold text-ink">{formatPrice(item.lineTotal)}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-extrabold text-ink">Delivery address</h3>
            <p className="text-xs leading-5 text-slate-600">
              {order.shippingAddress.fullName}<br />
              {order.shippingAddress.phone}<br />
              {order.shippingAddress.address}<br />
              {order.shippingAddress.city}, {order.shippingAddress.district} {order.shippingAddress.postalCode}
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-extrabold text-ink">Status history</h3>
            <ol className="space-y-2">
              {order.statusHistory.map((entry, index) => (
                <li key={`${entry.status}-${entry.changedAt}-${index}`} className="flex items-start justify-between gap-2 text-xs">
                  <span><span className="font-bold capitalize text-ink">{entry.status}</span><span className="block text-slate-500">{entry.changedBy?.name || "System"}{entry.changedBy?.role === "admin" ? " · admin" : ""}</span></span>
                  <time className="shrink-0 text-slate-400">{new Date(entry.changedAt).toLocaleString()}</time>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {allowedNext[order.status]?.length > 0 && (
          <form
            className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (nextStatus) onStatusChange(nextStatus);
            }}
          >
            <label className="text-xs font-semibold text-slate-600">
              Change order status
              <select className="select select-bordered mt-1.5 h-10 min-h-10 rounded-xl border-slate-200" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} required>
                <option value="">Choose next status</option>
                {allowedNext[order.status].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <button type="submit" disabled={busy || !nextStatus} className="btn btn-primary min-h-10 h-10 rounded-full border-0 bg-brand-blue text-white">
              {busy ? "Updating…" : "Update status"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

export function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadOrders = async () => {
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (paymentStatus) params.set("paymentStatus", paymentStatus);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const result = await adminCatalogRequest(`orders?${params}`);
      setOrders(result.data);
      setPagination(result.pagination);
    } catch (loadError) {
      setError(loadError.message);
    }
  };
  useEffect(() => { loadOrders(); }, [page, search, status, paymentStatus, from, to]);

  const openOrder = async (id) => {
    setError("");
    try {
      const result = await adminCatalogRequest(`orders/${id}`);
      setSelectedOrder(result.data);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  const updateStatus = async (nextStatus) => {
    if (!selectedOrder) return;
    setBusy(true);
    setError("");
    try {
      const result = await adminCatalogRequest(`orders/${selectedOrder.id}/status`, {
        method: "PATCH",
        body: { status: nextStatus },
      });
      setSelectedOrder(result.data);
      setSuccess(`Order status changed to ${nextStatus}.`);
      await loadOrders();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setBusy(false);
    }
  };

  const setFilter = (setter, value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div>
      <p className="mb-5 text-sm text-slate-500">Search orders, review payment separately from fulfillment, and apply valid status transitions.</p>
      <Notice error={error} success={success} />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 xl:grid-cols-6">
          <label className="relative sm:col-span-2 xl:col-span-2">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input className="input input-bordered h-10 min-h-10 w-full rounded-xl border-slate-200 pl-9 text-sm" aria-label="Search orders" placeholder="Order ID or customer" value={search} onChange={(event) => setFilter(setSearch, event.target.value)} />
          </label>
          <select className="select select-bordered h-10 min-h-10 rounded-xl border-slate-200 text-sm" aria-label="Filter by order status" value={status} onChange={(event) => setFilter(setStatus, event.target.value)}>
            <option value="">All order statuses</option>
            {orderStatuses.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select className="select select-bordered h-10 min-h-10 rounded-xl border-slate-200 text-sm" aria-label="Filter by payment status" value={paymentStatus} onChange={(event) => setFilter(setPaymentStatus, event.target.value)}>
            <option value="">All payment statuses</option>
            {paymentStatuses.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <label className="text-[11px] font-semibold text-slate-500">From<input type="date" className="input input-bordered mt-1 h-9 min-h-9 w-full rounded-lg border-slate-200 text-xs" value={from} onChange={(event) => setFilter(setFrom, event.target.value)} /></label>
          <label className="text-[11px] font-semibold text-slate-500">To<input type="date" className="input input-bordered mt-1 h-9 min-h-9 w-full rounded-lg border-slate-200 text-xs" value={to} onChange={(event) => setFilter(setTo, event.target.value)} /></label>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Order status</th><th><span className="sr-only">Details</span></th></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><p className="font-bold text-ink">{order.orderNumber}</p><p className="font-mono text-[10px] text-slate-400">{order.id}</p></td>
                  <td><p className="font-semibold text-ink">{order.customer.name}</p><p className="text-xs text-slate-500">{order.customer.email}</p></td>
                  <td className="whitespace-nowrap text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="font-bold">{formatPrice(order.totalAmount)}</td>
                  <td><StatusBadge value={order.paymentStatus} /><p className="mt-1 text-[10px] capitalize text-slate-400">{order.paymentMethod.replaceAll("_", " ")}</p></td>
                  <td><StatusBadge value={order.status} /></td>
                  <td><button type="button" className="btn btn-ghost btn-sm btn-square" aria-label={`View order ${order.orderNumber}`} onClick={() => openOrder(order.id)}><Eye size={16} /></button></td>
                </tr>
              ))}
              {!orders.length && <tr><td colSpan="7" className="py-12 text-center text-sm text-slate-500">{error ? "Orders could not be loaded." : "No orders match these filters."}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>{pagination.total} orders</span>
          <div className="flex items-center gap-3">
            <button type="button" className="btn btn-ghost btn-xs" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <span>Page {page} of {Math.max(1, pagination.pages)}</span>
            <button type="button" className="btn btn-ghost btn-xs" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </div>
      </section>
      {selectedOrder && <OrderDetails order={selectedOrder} busy={busy} onClose={() => setSelectedOrder(null)} onStatusChange={updateStatus} />}
    </div>
  );
}

function CustomerDetails({ customer, onClose }) {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ pages: 1, total: customer.orderCount });
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    adminCatalogRequest(`customers/${customer.id}/orders?page=${page}&limit=5`)
      .then((result) => {
        if (!active) return;
        setOrders(result.data);
        setPagination(result.pagination);
        setError("");
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      });
    return () => {
      active = false;
    };
  }, [customer.id, page]);

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="customer-details-title" className="my-auto w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Customer details</p><h2 id="customer-details-title" className="mt-1 font-display text-xl font-extrabold text-ink">{customer.name}</h2><p className="text-sm text-slate-500">{customer.email}</p></div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
          <div><p className="text-[11px] font-bold uppercase text-slate-400">Account status</p><div className="mt-1"><StatusBadge value={customer.isActive ? "active" : "inactive"} /></div></div>
          <div><p className="text-[11px] font-bold uppercase text-slate-400">Orders</p><p className="mt-1 font-bold text-ink">{customer.orderCount}</p></div>
          <div className="col-span-2"><p className="text-[11px] font-bold uppercase text-slate-400">Joined</p><p className="mt-1 text-xs text-slate-600">{new Date(customer.createdAt).toLocaleString()}</p></div>
        </div>
        <h3 className="mb-2 mt-5 text-sm font-extrabold text-ink">Recent orders</h3>
        {error && <p className="mb-2 text-xs text-rose-700" role="alert">{error}</p>}
        {orders.length ? (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
            {orders.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 p-3 text-xs">
                <span><span className="block font-bold text-ink">{order.orderNumber}</span><span className="text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</span></span>
                <span className="text-right"><StatusBadge value={order.status} /><span className="mt-1 block font-bold text-ink">{formatPrice(order.totalAmount)}</span></span>
              </li>
            ))}
          </ul>
        ) : <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">No orders yet.</p>}
        {pagination.pages > 1 && (
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Page {page} of {pagination.pages}</span>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost btn-xs" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
              <button type="button" className="btn btn-ghost btn-xs" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("");
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCustomers = async () => {
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search.trim()) params.set("search", search.trim());
      if (active) params.set("active", active);
      const result = await adminCatalogRequest(`customers?${params}`);
      setCustomers(result.data);
      setPagination(result.pagination);
    } catch (loadError) {
      setError(loadError.message);
    }
  };
  useEffect(() => { loadCustomers(); }, [page, search, active]);

  const viewCustomer = async (id) => {
    setError("");
    try {
      const result = await adminCatalogRequest(`customers/${id}`);
      setSelectedCustomer(result.data);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  const toggleCustomerStatus = async (customer) => {
    const isActive = !customer.isActive;
    const action = isActive ? "activate" : "deactivate";
    if (!window.confirm(`${action[0].toUpperCase()}${action.slice(1)} ${customer.name}'s account?`)) return;
    setError("");
    try {
      const result = await adminCatalogRequest(`customers/${customer.id}/status`, {
        method: "PATCH",
        body: { isActive },
      });
      setSuccess(`${customer.name}'s account is ${isActive ? "active" : "inactive"}.`);
      await loadCustomers();
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer((current) => ({ ...current, isActive: result.data.isActive }));
      }
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  return (
    <div>
      <p className="mb-5 text-sm text-slate-500">Review customer accounts and order history. Authentication credentials are never displayed.</p>
      <Notice error={error} success={success} />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <label className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input className="input input-bordered h-10 min-h-10 w-full rounded-xl border-slate-200 pl-9 text-sm" aria-label="Search customers" placeholder="Name or email" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} />
          </label>
          <select className="select select-bordered h-10 min-h-10 rounded-xl border-slate-200 text-sm" aria-label="Filter customers by status" value={active} onChange={(event) => { setPage(1); setActive(event.target.value); }}>
            <option value="">All account statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead><tr><th>Customer</th><th>Joined</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td><button type="button" className="text-left" onClick={() => viewCustomer(customer.id)}><p className="font-bold text-ink">{customer.name}</p><p className="text-xs text-slate-500">{customer.email}</p></button></td>
                  <td className="whitespace-nowrap text-xs">{new Date(customer.createdAt).toLocaleDateString()}</td>
                  <td><StatusBadge value={customer.isActive ? "active" : "inactive"} /></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button type="button" className="btn btn-ghost btn-sm btn-square" aria-label={`View ${customer.name}`} onClick={() => viewCustomer(customer.id)}><Eye size={16} /></button>
                      <button type="button" className={`btn btn-ghost btn-sm ${customer.isActive ? "text-rose-600" : "text-emerald-700"}`} onClick={() => toggleCustomerStatus(customer)}>{customer.isActive ? "Deactivate" : "Activate"}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!customers.length && <tr><td colSpan="4" className="py-12 text-center text-sm text-slate-500">{error ? "Customers could not be loaded." : "No customers match these filters."}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>{pagination.total} customers</span>
          <div className="flex items-center gap-3">
            <button type="button" className="btn btn-ghost btn-xs" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <span>Page {page} of {Math.max(1, pagination.pages)}</span>
            <button type="button" className="btn btn-ghost btn-xs" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        </div>
      </section>
      {selectedCustomer && <CustomerDetails customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />}
    </div>
  );
}
