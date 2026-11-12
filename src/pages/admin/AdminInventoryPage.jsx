import { useCallback, useEffect, useState } from "react";
import { Boxes, History, Search } from "lucide-react";
import {
  getAdminCategories,
  getAdminInventory,
  getInventoryAdjustments,
  updateInventoryStock,
} from "../../services/adminAnalyticsService.js";

const initialAdjustment = { type: "increase", quantity: 1, reason: "" };

function stockLabel(stock, threshold) {
  if (!stock) return ["Out of stock", "text-rose-700 bg-rose-50"];
  if (stock <= threshold) return ["Low stock", "text-amber-700 bg-amber-50"];
  return ["In stock", "text-emerald-700 bg-emerald-50"];
}

export default function AdminInventoryPage() {
  const [filters, setFilters] = useState({ search: "", category: "", status: "all" });
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [adjustmentPage, setAdjustmentPage] = useState(1);
  const [inventory, setInventory] = useState(null);
  const [adjustmentPagination, setAdjustmentPagination] = useState(null);
  const [categories, setCategories] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [selected, setSelected] = useState("");
  const [form, setForm] = useState(initialAdjustment);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      getAdminInventory({ ...filters, page, signal: controller.signal }),
      getAdminCategories({ signal: controller.signal }),
      getInventoryAdjustments({ page: adjustmentPage, signal: controller.signal }),
    ])
      .then(([inventoryResult, categoryResult, adjustmentResult]) => {
        setInventory(inventoryResult);
        setCategories(categoryResult.data || []);
        setAdjustments(adjustmentResult.data || []);
        setAdjustmentPagination(adjustmentResult.pagination);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [adjustmentPage, filters, page, refreshKey]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setFilters((current) => ({ ...current, search: searchInput.trim() }));
  };

  const submitAdjustment = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await updateInventoryStock(selected, {
        type: form.type,
        quantity: Number(form.quantity),
        reason: form.reason.trim(),
      });
      setNotice("Stock adjustment saved.");
      setSelected("");
      setForm(initialAdjustment);
      setAdjustmentPage(1);
      refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-xl font-extrabold text-ink">Inventory management</h1>
        <p className="mt-1 text-sm text-slate-500">Stock uses the same product quantities checked during checkout.</p>
      </div>
      {error && <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
      {notice && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{notice}</p>}

      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Boxes size={19} className="text-brand-blue" />
            <h2 className="font-bold text-ink">Product stock</h2>
          </div>
          {inventory && <span className="text-xs text-slate-500">{inventory.pagination.total} products · low stock at {inventory.threshold} or less</span>}
        </div>
        <form onSubmit={submitSearch} className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="input input-bordered flex h-11 items-center gap-2 rounded-xl">
            <Search size={16} className="text-slate-400" />
            <input aria-label="Search inventory" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search products or brands" className="w-full text-sm" />
          </label>
          <select aria-label="Filter by category" className="select select-bordered h-11 min-h-11 rounded-xl" value={filters.category} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, category: event.target.value })); }}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.id || category._id} value={category.name}>{category.name}</option>)}
          </select>
          <select aria-label="Filter by stock status" className="select select-bordered h-11 min-h-11 rounded-xl" value={filters.status} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, status: event.target.value })); }}>
            <option value="all">All stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
            <option value="in">Replenished</option>
          </select>
          <button type="submit" className="btn h-11 min-h-11 rounded-xl bg-brand-blue text-white">Search</button>
        </form>

        {loading && !inventory ? (
          <div className="h-40 animate-pulse rounded-xl bg-slate-100" aria-label="Loading inventory" />
        ) : !inventory?.data.length ? (
          <div className="py-12 text-center text-sm text-slate-500">No products match these filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Status</th><th /></tr></thead>
              <tbody>
                {inventory.data.map((product) => {
                  const [status, color] = stockLabel(product.stockQuantity, inventory.threshold);
                  return (
                    <tr key={product.id}>
                      <td><span className="font-semibold text-ink">{product.name}</span><span className="block text-xs text-slate-500">{product.brand || "—"}</span></td>
                      <td>{product.category}</td>
                      <td className="font-bold">{product.stockQuantity}</td>
                      <td><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${color}`}>{status}</span></td>
                      <td className="text-right">
                        <button className="btn btn-sm rounded-lg" onClick={() => { setSelected(product.id); setForm(initialAdjustment); }}>
                          Adjust stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {inventory?.pagination.pages > 1 && (
          <div className="mt-4 flex items-center justify-end gap-3 text-sm">
            <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button>
            <span>Page {page} of {inventory.pagination.pages}</span>
            <button className="btn btn-sm" disabled={page >= inventory.pagination.pages} onClick={() => setPage((value) => value + 1)}>Next</button>
          </div>
        )}
      </section>

      {selected && (
        <section className="mb-5 rounded-2xl border border-brand-blue/20 bg-white p-4 shadow-sm" aria-labelledby="stock-adjust-heading">
          <h2 id="stock-adjust-heading" className="mb-4 font-bold text-ink">Adjust stock</h2>
          <form onSubmit={submitAdjustment} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold text-slate-600">Adjustment type
              <select className="select select-bordered mt-1.5 h-11 min-h-11 w-full rounded-xl" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
                <option value="increase">Increase</option>
                <option value="decrease">Decrease</option>
                <option value="correction">Set exact stock</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-600">{form.type === "correction" ? "New stock quantity" : "Quantity"}
              <input type="number" min={form.type === "correction" ? 0 : 1} step="1" max="1000000000" required className="input input-bordered mt-1.5 h-11 w-full rounded-xl" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} />
            </label>
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Reason
              <input maxLength="300" required className="input input-bordered mt-1.5 h-11 w-full rounded-xl" placeholder="e.g. Received supplier shipment" value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} />
            </label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
              <button type="submit" disabled={saving} className="btn rounded-xl bg-brand-blue text-white">{saving ? "Saving…" : "Save adjustment"}</button>
              <button type="button" disabled={saving} className="btn btn-ghost rounded-xl" onClick={() => setSelected("")}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><History size={18} className="text-brand-blue" /><h2 className="font-bold text-ink">Stock adjustment history</h2></div>
        {!adjustments.length ? (
          <p className="py-8 text-center text-sm text-slate-500">No stock adjustments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead><tr><th>When</th><th>Product</th><th>Type</th><th>Change</th><th>Stock</th><th>Admin</th><th>Reason</th></tr></thead>
              <tbody>
                {adjustments.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap text-xs">{new Date(entry.createdAt).toLocaleString()}</td>
                    <td>{entry.productName}</td>
                    <td className="capitalize">{entry.type}</td>
                    <td className={entry.quantityChanged < 0 ? "font-bold text-rose-700" : "font-bold text-emerald-700"}>{entry.quantityChanged > 0 ? "+" : ""}{entry.quantityChanged}</td>
                    <td>{entry.previousStock ?? "—"} → {entry.updatedStock ?? "—"}</td>
                    <td className="text-xs">{entry.adminId ? `${entry.adminId.slice(0, 8)}…` : "System"}</td>
                    <td className="max-w-xs text-xs">{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {adjustmentPagination?.pages > 1 && (
          <div className="mt-4 flex items-center justify-end gap-3 text-sm">
            <button className="btn btn-sm" disabled={adjustmentPage <= 1} onClick={() => setAdjustmentPage((value) => value - 1)}>Previous</button>
            <span>Page {adjustmentPage} of {adjustmentPagination.pages}</span>
            <button className="btn btn-sm" disabled={adjustmentPage >= adjustmentPagination.pages} onClick={() => setAdjustmentPage((value) => value + 1)}>Next</button>
          </div>
        )}
      </section>
    </div>
  );
}
