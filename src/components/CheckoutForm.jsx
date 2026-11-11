import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { formatPrice } from "../data/products.js";
import { customerOrderRequest } from "../services/orderService.js";

const fieldClass =
  "input input-bordered mt-1.5 h-11 min-h-11 w-full rounded-xl border-slate-200 bg-white text-sm text-ink focus:border-brand-blue focus:outline-none";

export default function CheckoutForm({ user, cart, onCancel, onPlaced }) {
  const [values, setValues] = useState({
    fullName: user?.name || "",
    phone: "",
    address: "",
    city: "",
    district: "",
    postalCode: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const subtotal = cart.reduce(
    (sum, entry) => sum + entry.product.price * entry.quantity,
    0,
  );
  const shippingAmount =
    subtotal >= 5000
      ? 0
      : values.district.trim().toLowerCase() === "sylhet"
        ? 60
        : 120;
  const total = subtotal + shippingAmount;
  const productsHaveDatabaseIds = cart.every((entry) =>
    /^[\da-f]{24}$/iu.test(entry.product.mongoId || ""),
  );

  const updateValue = (event) => {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const result = await customerOrderRequest("orders", {
        method: "POST",
        body: {
          items: cart.map((entry) => ({
            productId: entry.product.mongoId,
            quantity: entry.quantity,
          })),
          shippingAddress: values,
          paymentMethod: "cash_on_delivery",
        },
      });
      onPlaced(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-soft sm:p-7">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-pale text-brand-blue">
          <ShieldCheck size={19} />
        </span>
        <div>
          <h2 className="font-display text-lg font-extrabold text-ink">
            Delivery details
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {user?.name} · {user?.email}. Prices and inventory are confirmed securely when your order is placed.
          </p>
        </div>
      </div>
      {error && (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}
      {!user && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
          Sign in with a customer account before placing your order.
        </p>
      )}
      {user?.role === "admin" && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
          Orders can only be placed from a customer account.
        </p>
      )}
      {cart.length > 0 && !productsHaveDatabaseIds && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
          The live catalog is not connected. Refresh the page before placing an order.
        </p>
      )}
      <form className="space-y-4" onSubmit={submitOrder}>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["fullName", "Recipient name", "text", true],
            ["phone", "Phone number", "tel", true],
            ["city", "City", "text", true],
            ["district", "District", "text", true],
            ["postalCode", "Postal code (optional)", "text", false],
          ].map(([name, label, type, required]) => (
            <label key={name} className="text-xs font-semibold text-slate-600">
              {label}
              <input
                className={fieldClass}
                name={name}
                type={type}
                autoComplete={name === "fullName" ? "name" : name === "phone" ? "tel" : "off"}
                value={values[name]}
                onChange={updateValue}
                maxLength={120}
                required={required}
              />
            </label>
          ))}
        </div>
        <label className="block text-xs font-semibold text-slate-600">
          Street address
          <textarea
            className="textarea textarea-bordered mt-1.5 min-h-20 w-full rounded-xl border-slate-200 bg-white text-sm text-ink focus:border-brand-blue focus:outline-none"
            name="address"
            value={values.address}
            onChange={updateValue}
            maxLength={300}
            required
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
          <div>
            <p className="text-sm font-bold text-ink">Cash on delivery</p>
            <p className="mt-1 text-xs text-slate-500">
              {subtotal >= 5000
                ? "Free delivery on orders of ৳5,000 or more."
                : values.district.trim().toLowerCase() === "sylhet"
                  ? "Delivery: ৳60 in Sylhet."
                  : "Delivery: ৳120 outside Sylhet."}
              {" "}Online payment will be available after a gateway is configured.
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Subtotal {formatPrice(subtotal)}</p>
            <p className="text-xs text-slate-500">Delivery {formatPrice(shippingAmount)}</p>
            <p className="mt-1 text-sm font-extrabold text-brand-blue">{formatPrice(total)}</p>
          </div>
        </div>
        {!cart.length && (
          <p className="text-sm text-rose-700" role="alert">Your bag is empty.</p>
        )}
        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button type="button" className="btn btn-ghost rounded-full" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              !cart.length ||
              !user ||
              user.role !== "customer" ||
              !productsHaveDatabaseIds
            }
            className="btn btn-primary rounded-full border-0 bg-brand-blue text-white hover:bg-brand-purple"
          >
            {isSubmitting ? "Placing order…" : "Place order"}
            {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </div>
      </form>
    </section>
  );
}
