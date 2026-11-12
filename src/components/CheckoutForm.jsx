import { useEffect, useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { formatPrice } from "../data/products.js";
import { customerOrderRequest } from "../services/orderService.js";
import { useTheme } from "../context/ThemeContext.jsx";
import { getProfile } from "../services/profileService.js";

const fieldClass =
  "input input-bordered mt-1.5 h-11 min-h-11 w-full rounded-xl border-slate-200 bg-white text-sm text-ink focus:border-brand-blue focus:outline-none";

export default function CheckoutForm({ user, cart, onCancel, onPlaced }) {
  const { storeSettings } = useTheme();
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
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    getProfile()
      .then((profile) => {
        if (!active) return;
        const addresses = profile.addresses || [];
        setSavedAddresses(addresses);
        const defaultAddress = addresses.find((address) => address.isDefault) || addresses[0];
        if (defaultAddress) {
          setValues((current) => ({
            ...current,
            fullName: defaultAddress.fullName,
            phone: defaultAddress.phoneNumber,
            address: defaultAddress.addressLine,
            city: defaultAddress.city,
            district: defaultAddress.district,
            postalCode: defaultAddress.postalCode || "",
          }));
        }
      })
      .catch((requestError) => {
        if (active) console.warn("Could not load a saved checkout address.", requestError);
      });
    return () => {
      active = false;
    };
  }, [user]);
  const subtotal = cart.reduce(
    (sum, entry) => sum + entry.product.price * entry.quantity,
    0,
  );
  const shipping = storeSettings?.shipping;
  const district = values.district.trim().toLowerCase();
  const shippingAmount = shipping?.enableShipping === false
    ? 0
    : subtotal >= (shipping?.freeShippingThreshold ?? 5000)
      ? 0
      : district === "dhaka"
        ? shipping?.insideDhakaDeliveryCharge ?? 80
        : district === "sylhet"
          ? shipping?.sylhetDeliveryCharge ?? 60
          : shipping?.outsideDhakaDeliveryCharge ?? 120;
  const total = subtotal + shippingAmount;
  const cashOnDeliveryEnabled =
    storeSettings?.payment?.enableCashOnDelivery !== false;
  const stripeEnabled =
    storeSettings?.payment?.enableStripeOnlinePayment === true &&
    storeSettings?.payment?.stripeConfigured === true;
  const paymentEnabled =
    (cashOnDeliveryEnabled && paymentMethod === "cash_on_delivery") ||
    (stripeEnabled && paymentMethod === "stripe");
  const canCheckout =
    paymentEnabled && Boolean(user) && user.role === "customer";
  const productsHaveDatabaseIds = cart.every((entry) =>
    /^[\da-f]{24}$/iu.test(entry.product.mongoId || ""),
  );

  const updateValue = (event) => {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  useEffect(() => {
    const defaultMethod = storeSettings?.payment?.defaultPaymentMethod;
    if (
      (defaultMethod === "stripe" && stripeEnabled) ||
      (defaultMethod === "cash_on_delivery" && cashOnDeliveryEnabled)
    ) {
      setPaymentMethod(defaultMethod);
    } else if (!cashOnDeliveryEnabled && stripeEnabled) {
      setPaymentMethod("stripe");
    } else if (!stripeEnabled && cashOnDeliveryEnabled) {
      setPaymentMethod("cash_on_delivery");
    }
  }, [storeSettings, cashOnDeliveryEnabled, stripeEnabled]);

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
          paymentMethod,
        },
      });
      if (paymentMethod === "stripe") {
        const checkoutUrl = new URL(result.checkoutUrl);
        if (
          checkoutUrl.protocol !== "https:" ||
          checkoutUrl.hostname !== "checkout.stripe.com"
        ) {
          throw new Error("The payment provider returned an invalid checkout URL.");
        }
        window.location.assign(checkoutUrl.href);
        return;
      }
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
        <div className="rounded-xl bg-slate-50 p-4">
          <div>
            <p className="mt-1 text-xs text-slate-500">
              {shipping?.enableShipping === false
                ? "Shipping is currently disabled."
                : shippingAmount === 0 && subtotal >= (shipping?.freeShippingThreshold ?? 5000)
                  ? `Free delivery on orders of ${formatPrice(shipping?.freeShippingThreshold ?? 5000)} or more.`
                  : `Delivery: ${formatPrice(shippingAmount)}.`}
              {" "}Stripe is available only when configured by the store.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {cashOnDeliveryEnabled && (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input type="radio" name="paymentMethod" value="cash_on_delivery" checked={paymentMethod === "cash_on_delivery"} onChange={() => setPaymentMethod("cash_on_delivery")} />
                  Cash on delivery
                </label>
              )}
              {stripeEnabled && (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input type="radio" name="paymentMethod" value="stripe" checked={paymentMethod === "stripe"} onChange={() => setPaymentMethod("stripe")} />
                  Pay securely with Stripe
                </label>
              )}
              {!cashOnDeliveryEnabled && !stripeEnabled && (
                <p className="text-sm font-bold text-rose-700">Checkout unavailable: no payment method is currently configured.</p>
              )}
            </div>
            <div className="mt-3 text-right">
              <p className="text-xs text-slate-500">Subtotal {formatPrice(subtotal)}</p>
              <p className="text-xs text-slate-500">Delivery {formatPrice(shippingAmount)}</p>
              <p className="mt-1 text-sm font-extrabold text-brand-blue">{formatPrice(total)}</p>
            </div>
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
              !productsHaveDatabaseIds ||
              !canCheckout
            }
            className="btn btn-primary rounded-full border-0 bg-brand-blue text-white hover:bg-brand-purple"
          >
            {isSubmitting ? "Processing…" : paymentMethod === "stripe" ? "Continue to Stripe" : "Place order"}
            {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </div>
      </form>
    </section>
  );
}
