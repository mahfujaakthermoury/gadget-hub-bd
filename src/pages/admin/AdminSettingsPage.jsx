import { useEffect, useState } from "react";
import {
  Bell,
  CreditCard,
  Globe,
  Palette,
  RotateCcw,
  Save,
  Shield,
  Truck,
  Warehouse,
  FileText,
  History,
} from "lucide-react";
import { uploadCatalogImage } from "../../services/adminCatalogService.js";
import { adminSettingsRequest } from "../../services/settingsService.js";
import { useTheme } from "../../context/ThemeContext.jsx";

const sections = [
  {
    id: "general",
    label: "General",
    icon: Globe,
    fields: [
      ["websiteName", "Website name", "text"],
      ["websiteLogo", "Website logo", "image"],
      ["favicon", "Favicon", "image"],
      ["websiteDescription", "Website description", "textarea"],
      ["contactEmail", "Contact email", "email"],
      ["contactPhone", "Contact phone", "tel"],
      ["businessAddress", "Business address", "text"],
      ["currency", "Currency", "text", "Use a three-letter ISO currency code, such as BDT."],
      ["timeZone", "Time zone", "text"],
      ["maintenanceMode", "Maintenance mode", "boolean"],
    ],
  },
  {
    id: "store",
    label: "Store",
    icon: Warehouse,
    fields: [
      ["storeName", "Store name", "text"],
      ["storeContactInformation", "Store contact information", "textarea"],
      ["defaultCurrency", "Default currency", "text"],
      ["productsPerPage", "Products per page", "number", "Must be at least 1."],
      ["lowStockAlertThreshold", "Low-stock alert threshold", "number", "Must be zero or higher."],
      ["enableProductReviews", "Enable product reviews", "boolean"],
      ["enableGuestCheckout", "Enable guest checkout", "boolean"],
    ],
  },
  {
    id: "payment",
    label: "Payment",
    icon: CreditCard,
    fields: [
      ["enableCashOnDelivery", "Cash on delivery", "boolean"],
      ["enableStripeOnlinePayment", "Stripe online payment", "boolean"],
      ["defaultPaymentMethod", "Default payment method", "select", "", [["cash_on_delivery", "Cash on delivery"], ["stripe", "Stripe"]]],
    ],
  },
  {
    id: "shipping",
    label: "Shipping",
    icon: Truck,
    fields: [
      ["enableShipping", "Enable shipping", "boolean"],
      ["freeShippingThreshold", "Free shipping threshold (BDT)", "number"],
      ["defaultDeliveryCharge", "Default delivery charge (BDT)", "number"],
      ["insideDhakaDeliveryCharge", "Inside Dhaka delivery charge (BDT)", "number"],
      ["outsideDhakaDeliveryCharge", "Outside Dhaka delivery charge (BDT)", "number"],
      ["sylhetDeliveryCharge", "Sylhet delivery charge (BDT)", "number"],
      ["estimatedDeliveryTime", "Estimated delivery time", "text"],
      ["shippingPolicy", "Shipping policy", "textarea"],
    ],
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: Bell,
    fields: [
      ["orderConfirmationNotifications", "Order confirmation notifications", "boolean"],
      ["orderStatusUpdateNotifications", "Order status update notifications", "boolean"],
      ["lowStockNotifications", "Low-stock notifications", "boolean"],
      ["newCustomerNotifications", "New customer notifications", "boolean"],
      ["newOrderNotifications", "New order notifications", "boolean"],
      ["adminEmailNotificationPreferences", "Admin notification emails", "textarea", "Comma-separated email addresses."],
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    fields: [
      ["registrationEnabled", "Allow new customer registration", "boolean"],
      ["sessionDurationMinutes", "Session duration (minutes)", "number"],
      ["minimumPasswordLength", "Minimum password length", "number"],
      ["loginAttemptLimit", "Login attempt limit", "number"],
      ["adminActivityLogsEnabled", "Enable admin activity logs", "boolean"],
    ],
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: Palette,
    fields: [
      ["defaultTheme", "Default theme", "select", "", [["light", "Light"], ["dark", "Dark"]]],
      ["primaryBrandColor", "Primary brand color", "color"],
      ["secondaryBrandColor", "Secondary brand color", "color"],
    ],
  },
  {
    id: "policies",
    label: "Legal & policies",
    icon: FileText,
    fields: [
      ["privacyPolicy", "Privacy policy", "textarea"],
      ["termsAndConditions", "Terms and conditions", "textarea"],
      ["refundAndReturnPolicy", "Refund and return policy", "textarea"],
      ["shippingPolicy", "Shipping policy", "textarea"],
      ["aboutUsContent", "About us content", "textarea"],
    ],
  },
];

function SettingField({ field, value, onChange, disabled, onUpload }) {
  const [name, label, type, help, options] = field;
  const inputClass = "input input-bordered mt-1.5 h-11 w-full rounded-xl";
  if (type === "boolean") {
    return (
      <label className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-ink">
        <span>{label}</span>
        <input
          type="checkbox"
          className="toggle toggle-primary"
          checked={Boolean(value)}
          onChange={(event) => onChange(name, event.target.checked)}
          disabled={disabled}
        />
      </label>
    );
  }
  if (type === "textarea") {
    return (
      <label className="block text-xs font-semibold text-slate-600">
        {label}
        <textarea
          className="textarea textarea-bordered mt-1.5 min-h-24 w-full rounded-xl"
          value={value ?? ""}
          onChange={(event) => onChange(name, event.target.value)}
          disabled={disabled}
          maxLength="10000"
        />
        {help && <span className="mt-1 block font-normal">{help}</span>}
      </label>
    );
  }
  if (type === "select") {
    return (
      <label className="block text-xs font-semibold text-slate-600">
        {label}
        <select
          className="select select-bordered mt-1.5 h-11 w-full rounded-xl"
          value={value ?? ""}
          onChange={(event) => onChange(name, event.target.value)}
          disabled={disabled}
        >
          {options.map(([option, optionLabel]) => <option key={option} value={option}>{optionLabel}</option>)}
        </select>
      </label>
    );
  }
  if (type === "image") {
    return (
      <label className="block text-xs font-semibold text-slate-600">
        {label}
        <input
          className={inputClass}
          type="url"
          value={value ?? ""}
          onChange={(event) => onChange(name, event.target.value)}
          disabled={disabled}
          placeholder="https://..."
        />
        <span className="mt-2 flex flex-wrap items-center gap-2 font-normal">
          <span>Or choose an image file (JPEG, PNG, WebP; up to 5 MB).</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="file-input file-input-bordered file-input-xs max-w-full"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onUpload(name, file);
            }}
            disabled={disabled}
            aria-label={`Upload ${label}`}
          />
        </span>
      </label>
    );
  }
  return (
    <label className="block text-xs font-semibold text-slate-600">
      {label}
      <input
        className={type === "color" ? "mt-2 h-11 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1" : inputClass}
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(name, type === "number" ? Number(event.target.value) : event.target.value)}
        disabled={disabled}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "1" : undefined}
        maxLength={type === "text" || type === "email" || type === "tel" ? 1000 : undefined}
      />
      {help && <span className="mt-1 block font-normal">{help}</span>}
    </label>
  );
}

export default function AdminSettingsPage() {
  const { refreshStoreSettings } = useTheme();
  const [settings, setSettings] = useState(null);
  const [activeSection, setActiveSection] = useState("general");
  const [logs, setLogs] = useState([]);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSettings = async () => {
    setError("");
    try {
      const result = await adminSettingsRequest();
      setSettings(result.data);
      setStripeConfigured(result.stripeConfigured);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void loadSettings();
  }, []);

  const updateField = (field, value) => {
    setSettings((current) => ({
      ...current,
      [activeSection]: { ...current[activeSection], [field]: value },
    }));
    setSuccess("");
  };

  const uploadSettingImage = async (field, file) => {
    if (file.size > 5 * 1024 * 1024) {
      setError("Image files must be 5 MB or smaller.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      updateField(field, await uploadCatalogImage(file));
      setSuccess(`${field === "favicon" ? "Favicon" : "Logo"} uploaded. Save changes to publish it.`);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    setError("");
    setSuccess("");
    if (
      activeSection === "general" &&
      settings.general.maintenanceMode &&
      !window.confirm("Enable maintenance mode for storefront visitors?")
    ) {
      return;
    }
    setBusy(true);
    try {
      const result = await adminSettingsRequest("", {
        method: "PUT",
        body: { [activeSection]: settings[activeSection] },
      });
      setSettings(result.data);
      setStripeConfigured(result.stripeConfigured);
      await refreshStoreSettings(true);
      setSuccess("Settings saved successfully.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  };

  const resetSettings = async () => {
    if (!window.confirm("Reset all settings to the Gadget Hub defaults? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await adminSettingsRequest("/reset", { method: "POST" });
      setSettings(result.data);
      setStripeConfigured(result.stripeConfigured);
      await refreshStoreSettings(true);
      setSuccess("All settings were reset to defaults.");
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setBusy(false);
    }
  };

  const loadLogs = async () => {
    setError("");
    setBusy(true);
    try {
      const result = await adminSettingsRequest("/logs");
      setLogs(result.data);
      setActiveSection("logs");
    } catch (logsError) {
      setError(logsError.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="space-y-4" role="status" aria-label="Loading settings"><div className="h-14 animate-pulse rounded-2xl bg-slate-100" /><div className="h-80 animate-pulse rounded-2xl bg-slate-100" /></div>;
  }

  const section = sections.find((item) => item.id === activeSection);
  return (
    <div>
      <p className="mb-5 text-sm leading-6 text-slate-500">
        Manage the storefront and admin preferences. Payment secrets are configured only on the backend.
      </p>
      {error && <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{error}</p>}
      {success && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{success}</p>}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Settings sections">
        {sections.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={activeSection === id} className={`btn btn-sm shrink-0 rounded-full ${activeSection === id ? "btn-primary border-0 bg-brand-blue text-white" : "btn-ghost"}`} onClick={() => setActiveSection(id)}>
            <Icon size={15} />{label}
          </button>
        ))}
        <button type="button" className={`btn btn-sm shrink-0 rounded-full ${activeSection === "logs" ? "btn-primary border-0 bg-brand-blue text-white" : "btn-ghost"}`} onClick={loadLogs} disabled={busy}>
          <History size={15} />Activity logs
        </button>
      </div>
      {activeSection === "logs" ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <h2 className="border-b border-slate-100 p-5 font-display text-lg font-extrabold text-ink">Recent admin activity</h2>
          {logs.length ? logs.map((entry) => (
            <div key={entry.id || `${entry.action}-${entry.createdAt}`} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 px-5 py-4 text-sm">
              <span className="font-semibold text-ink">{entry.action.replaceAll(".", " ")} · {entry.sections.join(", ")}</span>
              <time className="text-xs text-slate-500">{new Date(entry.createdAt).toLocaleString()}</time>
            </div>
          )) : <p className="p-8 text-sm text-slate-500">No settings changes have been recorded.</p>}
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 p-5">
            <h2 className="font-display text-xl font-extrabold text-ink">{section.label} settings</h2>
            {activeSection === "payment" && <p className="mt-1 text-xs text-slate-500">{stripeConfigured ? "Stripe backend credentials are configured." : "Stripe is not configured. Set STRIPE_SECRET_KEY on the backend before enabling it."} Secret keys are never stored in settings or returned by the API. Checkout currently processes cash on delivery only; enabling Stripe does not itself activate online checkout.</p>}
            {activeSection === "security" && <p className="mt-1 text-xs text-slate-500">Change your administrator password from the Account page's security section.</p>}
          </header>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {section.fields.map((field) => (
              <SettingField
                key={field[0]}
                field={field}
                value={settings[activeSection][field[0]]}
                onChange={updateField}
                onUpload={uploadSettingImage}
                disabled={busy}
              />
            ))}
          </div>
          <footer className="flex flex-wrap justify-between gap-3 border-t border-slate-100 p-5">
            <button type="button" className="btn btn-ghost rounded-full text-rose-700" onClick={resetSettings} disabled={busy}><RotateCcw size={16} />Reset to defaults</button>
            <button type="button" className="btn btn-primary rounded-full border-0 bg-brand-blue text-white" onClick={saveSettings} disabled={busy}><Save size={16} />{busy ? "Saving…" : "Save changes"}</button>
          </footer>
        </section>
      )}
    </div>
  );
}
