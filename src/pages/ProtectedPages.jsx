import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard.jsx";
import { customerOrderRequest } from "../services/orderService.js";
import {
  getProfile,
  updateProfile,
  updateProfilePassword,
  uploadProfileAvatar,
} from "../services/profileService.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
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

export function AccountPage({ user, wishlistCount = 0 }) {
  const { refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState({
    name: user.name,
    email: user.email,
    phoneNumber: "",
    avatarUrl: "",
    addresses: [],
    createdAt: null,
    isActive: true,
  });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    getProfile()
      .then((result) => {
        if (active) setProfile(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const updated = await updateProfile({
        name: profile.name,
        phoneNumber: profile.phoneNumber,
        addresses: profile.addresses,
      });
      setProfile(updated);
      await refreshUser();
      setSuccess("Your profile and shipping addresses have been saved.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const changeAddress = (index, field, value) => {
    setProfile((current) => ({
      ...current,
      addresses: current.addresses.map((address, addressIndex) =>
        addressIndex === index ? { ...address, [field]: value } : address,
      ),
    }));
  };

  const addAddress = () => {
    setProfile((current) => ({
      ...current,
      addresses: [
        ...current.addresses,
        {
          id: `address-${Date.now()}`,
          label: "",
          fullName: profile.name,
          phoneNumber: profile.phoneNumber,
          addressLine: "",
          city: "",
          district: "",
          postalCode: "",
          isDefault: current.addresses.length === 0,
        },
      ],
    }));
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Choose a JPEG, PNG, or WebP image up to 5 MB.");
      return;
    }
    setError("");
    setSuccess("");
    setUploading(true);
    try {
      setProfile(await uploadProfileAvatar(file));
      setSuccess("Profile picture updated.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading(false);
    }
  };

  const changePassword = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const result = await updateProfilePassword(passwords);
      setPasswords({ currentPassword: "", newPassword: "" });
      setSuccess(result.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageFrame
      eyebrow="Your account"
      title={`Welcome, ${profile.name}`}
      description="Manage your personal information, delivery addresses, account security, and display preferences."
    >
      {error && <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</p>}
      {success && <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{success}</p>}
      {loading ? (
        <div className="mt-8 space-y-3" role="status" aria-label="Loading profile">
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <form onSubmit={saveProfile} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-display text-xl font-extrabold text-ink">Personal information</h2>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <img
                  src={profile.avatarUrl || "/product-placeholder.svg"}
                  alt={`${profile.name} profile`}
                  className="h-20 w-20 rounded-full bg-slate-100 object-cover"
                />
                <label className="btn btn-outline btn-sm rounded-full">
                  {uploading ? "Uploading…" : "Upload profile picture"}
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={uploadAvatar}
                    disabled={uploading}
                  />
                </label>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Full name
                  <input className="input input-bordered mt-1.5 h-11 w-full rounded-xl" value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} maxLength="100" required />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Email address
                  <input className="input input-bordered mt-1.5 h-11 w-full rounded-xl" type="email" value={profile.email} readOnly aria-describedby="email-help" />
                  <span id="email-help" className="mt-1 block font-normal">Email changes require a separate verification flow.</span>
                </label>
                <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
                  Phone number
                  <input className="input input-bordered mt-1.5 h-11 w-full rounded-xl" type="tel" value={profile.phoneNumber} onChange={(event) => setProfile((current) => ({ ...current, phoneNumber: event.target.value }))} maxLength="24" />
                </label>
              </div>

              <div className="mt-7 border-t border-slate-100 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-ink">Shipping addresses</h3>
                    <p className="mt-1 text-xs text-slate-500">Choose one default address for faster checkout.</p>
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm text-brand-blue" onClick={addAddress}>Add address</button>
                </div>
                <div className="mt-4 space-y-4">
                  {profile.addresses.map((address, index) => (
                    <fieldset key={address.id} className="rounded-xl border border-slate-200 p-4">
                      <legend className="px-1 text-xs font-semibold text-slate-500">Address {index + 1}</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          ["label", "Label (Home, Work)"],
                          ["fullName", "Recipient name"],
                          ["phoneNumber", "Phone number"],
                          ["addressLine", "Street address"],
                          ["city", "City"],
                          ["district", "District"],
                          ["postalCode", "Postal code"],
                        ].map(([field, label]) => (
                          <label key={field} className={`text-xs font-semibold text-slate-600 ${field === "addressLine" ? "sm:col-span-2" : ""}`}>
                            {label}
                            <input className="input input-bordered mt-1 h-10 w-full rounded-lg" value={address[field] || ""} onChange={(event) => changeAddress(index, field, event.target.value)} maxLength={field === "postalCode" ? 20 : 200} required={field !== "postalCode"} />
                          </label>
                        ))}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                          <input type="radio" name="default-address" className="radio radio-primary radio-sm" checked={address.isDefault} onChange={() => setProfile((current) => ({ ...current, addresses: current.addresses.map((item, itemIndex) => ({ ...item, isDefault: itemIndex === index })) }))} />
                          Default shipping address
                        </label>
                        <button type="button" className="btn btn-ghost btn-xs text-rose-600" onClick={() => setProfile((current) => {
                          const addresses = current.addresses.filter((_, addressIndex) => addressIndex !== index);
                          if (addresses.length && !addresses.some((item) => item.isDefault)) addresses[0].isDefault = true;
                          return { ...current, addresses };
                        })}>Remove</button>
                      </div>
                    </fieldset>
                  ))}
                  {!profile.addresses.length && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No saved addresses yet.</p>}
                </div>
              </div>
              <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
                <button className="btn btn-primary rounded-full border-0 bg-brand-blue text-white" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
              </div>
            </form>

            <form onSubmit={changePassword} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="font-display text-xl font-extrabold text-ink">Account security</h2>
              <p className="mt-1 text-sm text-slate-500">Changing your password signs out other active sessions.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  Current password
                  <input className="input input-bordered mt-1.5 h-11 w-full rounded-xl" type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))} required />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  New password
                  <input className="input input-bordered mt-1.5 h-11 w-full rounded-xl" type="password" autoComplete="new-password" value={passwords.newPassword} onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))} required />
                </label>
              </div>
              <button className="btn btn-outline btn-sm mt-4 rounded-full" disabled={saving}>{saving ? "Updating…" : "Update password"}</button>
            </form>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-ink">Preferences</h2>
              <label className="mt-4 block text-xs font-semibold text-slate-600">
                Theme
                <select className="select select-bordered mt-1.5 h-11 w-full rounded-xl" value={theme} onChange={(event) => setTheme(event.target.value)}>
                  <option value="light">Light mode</option>
                  <option value="dark">Dark mode</option>
                  <option value="system">System default</option>
                </select>
              </label>
              <p className="mt-2 text-xs leading-5 text-slate-500">Your choice is saved on this device and applied immediately.</p>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-ink">Account details</h2>
              <dl className="mt-3 space-y-3 text-xs">
                <div><dt className="text-slate-500">Email</dt><dd className="mt-1 break-all font-semibold text-ink">{profile.email}</dd></div>
                <div><dt className="text-slate-500">Created</dt><dd className="mt-1 font-semibold text-ink">{profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}</dd></div>
                <div><dt className="text-slate-500">Status</dt><dd className="mt-1 font-semibold text-ink">{profile.isActive ? "Active" : "Inactive"}</dd></div>
              </dl>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-ink">Your activity</h2>
              <Link to="/my-orders" className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm font-semibold text-brand-blue">
                My orders <span aria-label="order history">View history →</span>
              </Link>
              <Link to="/wishlist" className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm font-semibold text-brand-blue">
                Wishlist <span>{wishlistCount} saved · view</span>
              </Link>
              <p className="mt-3 text-xs text-slate-500">Your saved products stay on this device.</p>
            </section>
          </aside>
        </div>
      )}
    </PageFrame>
  );
}

export function WishlistPage({
  wishlist,
  onAddToCart,
  onToggleWishlist,
  onQuickView,
}) {
  return (
    <PageFrame
      eyebrow="Your account"
      title="Wishlist"
      description="Products you have saved for later."
    >
      {wishlist.length ? (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {wishlist.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              onToggleWishlist={onToggleWishlist}
              onQuickView={onQuickView}
              isWishlisted
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="font-semibold text-ink">Your wishlist is empty.</p>
          <Link to="/shop" className="btn btn-primary mt-4 rounded-full border-0 bg-brand-blue text-white">Browse products</Link>
        </div>
      )}
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
