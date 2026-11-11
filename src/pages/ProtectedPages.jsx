import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { customerOrderRequest } from "../services/orderService.js";
import { formatPrice } from "../data/products.js";

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
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    customerOrderRequest(`my-orders?page=${page}&limit=10`)
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
  }, [page]);

  const openOrder = async (id) => {
    setError("");
    try {
      const result = await customerOrderRequest(`my-orders/${id}`);
      setSelectedOrder(result.data);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <PageFrame
      eyebrow="Your account"
      title="My orders"
      description="Review your recent orders and delivery progress."
    >
      {error && <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</p>}
      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th><th><span className="sr-only">Details</span></th></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><p className="font-bold text-ink">{order.orderNumber}</p></td>
                  <td className="whitespace-nowrap text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="font-bold">{formatPrice(order.totalAmount)}</td>
                  <td><span className="capitalize">{order.paymentStatus}</span><span className="mt-1 block text-[10px] capitalize text-slate-400">{order.paymentMethod.replaceAll("_", " ")}</span></td>
                  <td><span className="badge badge-outline capitalize">{order.status}</span></td>
                  <td><button type="button" className="btn btn-ghost btn-sm" onClick={() => openOrder(order.id)}>View</button></td>
                </tr>
              ))}
              {!orders.length && <tr><td colSpan="6" className="py-12 text-center text-sm text-slate-500">{error ? "Orders could not be loaded." : "You have not placed any orders yet."}</td></tr>}
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
      </div>
      {selectedOrder && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedOrder(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="my-order-title" className="my-auto w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Order details</p><h2 id="my-order-title" className="mt-1 font-display text-xl font-extrabold text-ink">{selectedOrder.orderNumber}</h2><p className="mt-1 text-xs text-slate-500">{new Date(selectedOrder.createdAt).toLocaleString()}</p></div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedOrder(null)}>Close</button>
            </div>
            <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-100">
              {selectedOrder.items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-4 p-3">
                  <div className="flex items-center gap-3"><img src={item.image || "/product-placeholder.svg"} alt="" className="h-10 w-10 rounded-lg object-cover" /><div><p className="text-sm font-bold text-ink">{item.name}</p><p className="text-xs text-slate-500">{formatPrice(item.unitPrice)} × {item.quantity}</p></div></div>
                  <p className="text-sm font-bold text-ink">{formatPrice(item.lineTotal)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
              <p>Payment: <span className="font-semibold capitalize">{selectedOrder.paymentStatus} · {selectedOrder.paymentMethod.replaceAll("_", " ")}</span></p>
              <p>Total: <span className="font-extrabold">{formatPrice(selectedOrder.totalAmount)}</span></p>
            </div>
            <ol className="mt-5 space-y-2 border-t border-slate-100 pt-4">
              {selectedOrder.statusHistory.map((entry, index) => (
                <li key={`${entry.status}-${entry.changedAt}-${index}`} className="flex justify-between gap-3 text-xs">
                  <span className="capitalize font-semibold text-ink">{entry.status}</span>
                  <time className="text-slate-500">{new Date(entry.changedAt).toLocaleString()}</time>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
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
