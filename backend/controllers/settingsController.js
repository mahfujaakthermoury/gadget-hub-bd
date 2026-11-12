import {
  getAdminLogsCollection,
  getSettingsCollection,
} from "../models/settings.js";

const defaultSettings = {
  general: {
    websiteName: "Gadget Hub",
    websiteLogo: "/gadget-hub-logo.jpeg",
    favicon: "/favicon.ico",
    websiteDescription: "Smart gadgets for everyday life.",
    contactEmail: "",
    contactPhone: "",
    businessAddress: "",
    currency: "BDT",
    timeZone: "Asia/Dhaka",
    maintenanceMode: false,
  },
  store: {
    storeName: "Gadget Hub",
    storeContactInformation: "",
    defaultCurrency: "BDT",
    productsPerPage: 12,
    lowStockAlertThreshold: 5,
    enableProductReviews: true,
    enableGuestCheckout: false,
  },
  payment: {
    enableCashOnDelivery: true,
    enableStripeOnlinePayment: false,
    defaultPaymentMethod: "cash_on_delivery",
  },
  shipping: {
    enableShipping: true,
    freeShippingThreshold: 5000,
    defaultDeliveryCharge: 120,
    insideDhakaDeliveryCharge: 120,
    outsideDhakaDeliveryCharge: 120,
    sylhetDeliveryCharge: 60,
    estimatedDeliveryTime: "2-5 business days",
    shippingPolicy: "",
  },
  notifications: {
    orderConfirmationNotifications: true,
    orderStatusUpdateNotifications: true,
    lowStockNotifications: true,
    newCustomerNotifications: true,
    newOrderNotifications: true,
    adminEmailNotificationPreferences: "",
  },
  security: {
    registrationEnabled: true,
    sessionDurationMinutes: 60,
    minimumPasswordLength: 8,
    loginAttemptLimit: 5,
    adminActivityLogsEnabled: true,
  },
  appearance: {
    defaultTheme: "light",
    primaryBrandColor: "#0876A8",
    secondaryBrandColor: "#7914A4",
  },
  policies: {
    privacyPolicy: "",
    termsAndConditions: "",
    refundAndReturnPolicy: "",
    shippingPolicy: "",
    aboutUsContent: "",
  },
};

const fieldTypes = {
  general: {
    websiteName: "text",
    websiteLogo: "url",
    favicon: "url",
    websiteDescription: "text",
    contactEmail: "email",
    contactPhone: "text",
    businessAddress: "text",
    currency: "currency",
    timeZone: "timezone",
    maintenanceMode: "boolean",
  },
  store: {
    storeName: "text",
    storeContactInformation: "text",
    defaultCurrency: "currency",
    productsPerPage: "positiveInteger",
    lowStockAlertThreshold: "nonNegativeInteger",
    enableProductReviews: "boolean",
    enableGuestCheckout: "boolean",
  },
  payment: {
    enableCashOnDelivery: "boolean",
    enableStripeOnlinePayment: "boolean",
    defaultPaymentMethod: "paymentMethod",
  },
  shipping: {
    enableShipping: "boolean",
    freeShippingThreshold: "nonNegativeNumber",
    defaultDeliveryCharge: "nonNegativeNumber",
    insideDhakaDeliveryCharge: "nonNegativeNumber",
    outsideDhakaDeliveryCharge: "nonNegativeNumber",
    sylhetDeliveryCharge: "nonNegativeNumber",
    estimatedDeliveryTime: "text",
    shippingPolicy: "longText",
  },
  notifications: {
    orderConfirmationNotifications: "boolean",
    orderStatusUpdateNotifications: "boolean",
    lowStockNotifications: "boolean",
    newCustomerNotifications: "boolean",
    newOrderNotifications: "boolean",
    adminEmailNotificationPreferences: "emailList",
  },
  security: {
    registrationEnabled: "boolean",
    sessionDurationMinutes: "positiveInteger",
    minimumPasswordLength: "positiveInteger",
    loginAttemptLimit: "positiveInteger",
    adminActivityLogsEnabled: "boolean",
  },
  appearance: {
    defaultTheme: "theme",
    primaryBrandColor: "color",
    secondaryBrandColor: "color",
  },
  policies: {
    privacyPolicy: "longText",
    termsAndConditions: "longText",
    refundAndReturnPolicy: "longText",
    shippingPolicy: "longText",
    aboutUsContent: "longText",
  },
};

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeSettings(saved = {}) {
  const result = clone(defaultSettings);
  for (const [section, values] of Object.entries(saved)) {
    if (section === "_id" || section === "updatedAt" || section === "updatedBy") {
      continue;
    }
    if (result[section] && values && typeof values === "object") {
      Object.assign(result[section], values);
    }
  }
  return result;
}

function validateValue(type, value, field) {
  if (type === "boolean") {
    if (typeof value !== "boolean") throw httpError(400, `${field} must be a boolean.`);
    return value;
  }
  if (type === "nonNegativeNumber" || type === "positiveInteger" || type === "nonNegativeInteger") {
    const maximums = {
      productsPerPage: 100,
      lowStockAlertThreshold: 1_000_000,
      freeShippingThreshold: 1_000_000_000,
      defaultDeliveryCharge: 1_000_000,
      insideDhakaDeliveryCharge: 1_000_000,
      outsideDhakaDeliveryCharge: 1_000_000,
      sylhetDeliveryCharge: 1_000_000,
      sessionDurationMinutes: 10_080,
      minimumPasswordLength: 128,
      loginAttemptLimit: 50,
    };
    const minimums = {
      sessionDurationMinutes: 5,
      minimumPasswordLength: 6,
      loginAttemptLimit: 1,
    };
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < (minimums[field] ?? (type === "positiveInteger" ? 1 : 0)) ||
      (maximums[field] !== undefined && value > maximums[field]) ||
      (type !== "nonNegativeNumber" && !Number.isSafeInteger(value))
    ) {
      throw httpError(400, `${field} must be a valid ${type === "nonNegativeNumber" ? "non-negative number" : "integer"}.`);
    }
    return value;
  }
  if (typeof value !== "string") throw httpError(400, `${field} must be text.`);
  const maxLength = type === "longText" ? 10000 : 1000;
  if (value.length > maxLength) throw httpError(400, `${field} is too long.`);
  if (type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) {
    throw httpError(400, `${field} must be a valid email address.`);
  }
  if (type === "emailList" && value) {
    const addresses = value.split(",").map((address) => address.trim());
    if (addresses.some((address) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(address))) {
      throw httpError(400, `${field} must contain comma-separated email addresses.`);
    }
  }
  if (type === "currency" && !/^[A-Z]{3}$/u.test(value)) {
    throw httpError(400, `${field} must be a three-letter currency code.`);
  }
  if (type === "theme" && !["light", "dark"].includes(value)) {
    throw httpError(400, `${field} must be light or dark.`);
  }
  if (type === "paymentMethod" && !["cash_on_delivery", "stripe"].includes(value)) {
    throw httpError(400, `${field} is not supported.`);
  }
  if (type === "color" && !/^#[\da-f]{6}$/iu.test(value)) {
    throw httpError(400, `${field} must be a six-digit hex color.`);
  }
  if (type === "url" && value) {
    if (!value.startsWith("/") && !/^https?:\/\//iu.test(value)) {
      throw httpError(400, `${field} must be an HTTP(S) URL or a local path.`);
    }
    let url;
    try {
      url = new URL(value, "https://gadget-hub.example");
    } catch {
      throw httpError(400, `${field} must be a valid HTTP(S) URL or local path.`);
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      throw httpError(400, `${field} must be a valid HTTP(S) URL or local path.`);
    }
  }
  if (type === "timezone") {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
    } catch {
      throw httpError(400, `${field} must be a valid time zone.`);
    }
  }
  return value.trim();
}

function validateSettingsInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw httpError(400, "A settings object is required.");
  }
  const updates = {};
  for (const [section, values] of Object.entries(body)) {
    if (!fieldTypes[section]) throw httpError(400, `Unknown settings section: ${section}.`);
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      throw httpError(400, `${section} must be an object.`);
    }
    updates[section] = {};
    for (const [field, value] of Object.entries(values)) {
      const type = fieldTypes[section][field];
      if (!type) throw httpError(400, `Unknown setting: ${section}.${field}.`);
      updates[section][field] = validateValue(type, value, field);
    }
    if (!Object.keys(updates[section]).length) delete updates[section];
  }
  if (!Object.keys(updates).length) throw httpError(400, "No settings supplied.");
  for (const [section, field] of [
    ["general", "websiteName"],
    ["store", "storeName"],
  ]) {
    if (
      updates[section]?.[field] !== undefined &&
      !updates[section][field].trim()
    ) {
      throw httpError(400, `${field} cannot be empty.`);
    }
  }
  if (
    updates.payment?.enableStripeOnlinePayment === true &&
    (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET)
  ) {
    throw httpError(400, "Configure STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET on the backend before enabling Stripe.");
  }
  return updates;
}

function publicSettings(settings) {
  return {
    general: {
      websiteName: settings.general.websiteName,
      websiteLogo: settings.general.websiteLogo,
      favicon: settings.general.favicon,
      websiteDescription: settings.general.websiteDescription,
      contactEmail: settings.general.contactEmail,
      contactPhone: settings.general.contactPhone,
      currency: settings.general.currency,
      maintenanceMode: settings.general.maintenanceMode,
    },
    store: {
      storeName: settings.store.storeName,
      defaultCurrency: settings.store.defaultCurrency,
      productsPerPage: settings.store.productsPerPage,
      lowStockAlertThreshold: settings.store.lowStockAlertThreshold,
      enableProductReviews: settings.store.enableProductReviews,
      enableGuestCheckout: settings.store.enableGuestCheckout,
    },
    payment: {
      enableCashOnDelivery: settings.payment.enableCashOnDelivery,
      enableStripeOnlinePayment: settings.payment.enableStripeOnlinePayment,
      stripeConfigured: Boolean(
        process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET,
      ),
      defaultPaymentMethod: settings.payment.defaultPaymentMethod,
    },
    shipping: {
      enableShipping: settings.shipping.enableShipping,
      freeShippingThreshold: settings.shipping.freeShippingThreshold,
      defaultDeliveryCharge: settings.shipping.defaultDeliveryCharge,
      insideDhakaDeliveryCharge: settings.shipping.insideDhakaDeliveryCharge,
      outsideDhakaDeliveryCharge: settings.shipping.outsideDhakaDeliveryCharge,
      sylhetDeliveryCharge: settings.shipping.sylhetDeliveryCharge,
    },
    appearance: settings.appearance,
    policies: {
      privacyPolicy: settings.policies.privacyPolicy,
      termsAndConditions: settings.policies.termsAndConditions,
      refundAndReturnPolicy: settings.policies.refundAndReturnPolicy,
      shippingPolicy: settings.policies.shippingPolicy,
      aboutUsContent: settings.policies.aboutUsContent,
    },
  };
}

export function getDefaultSettings() {
  return clone(defaultSettings);
}

export function createAdminSettingsController({
  loadSettings = getSettingsCollection,
  loadLogs = getAdminLogsCollection,
} = {}) {
  const logAction = async (request, action, sections) => {
    const settings = await loadSettings();
    const savedSettings = await settings.findOne({ _id: "store-settings" });
    if (savedSettings?.security?.adminActivityLogsEnabled === false) return;
    const logs = await loadLogs();
    await logs.insertOne({
      adminId: request.user._id,
      action,
      sections,
      createdAt: new Date(),
    });
  };

  return {
    getSettings: async (_request, response, next) => {
      try {
        const collection = await loadSettings();
        const saved = await collection.findOne({ _id: "store-settings" });
        response.status(200).json({
          success: true,
          data: mergeSettings(saved || {}),
          stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
        });
      } catch (error) {
        next(error);
      }
    },
    updateSettings: async (request, response, next) => {
      try {
        const updates = validateSettingsInput(request.body);
        const collection = await loadSettings();
        const existing = await collection.findOne({ _id: "store-settings" });
        const merged = mergeSettings(existing || {});
        for (const [section, values] of Object.entries(updates)) {
          Object.assign(merged[section], values);
        }
        if (
          merged.payment.defaultPaymentMethod === "stripe" &&
          !merged.payment.enableStripeOnlinePayment
        ) {
          throw httpError(400, "The default payment method must be enabled.");
        }
        const now = new Date();
        const result = await collection.findOneAndUpdate(
          { _id: "store-settings" },
          {
            $set: {
              ...merged,
              updatedAt: now,
              updatedBy: request.user._id,
            },
          },
          { upsert: true, returnDocument: "after" },
        );
        await logAction(request, "settings.updated", Object.keys(updates));
        response.status(200).json({
          success: true,
          data: mergeSettings(result || merged),
          stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
        });
      } catch (error) {
        next(error);
      }
    },
    resetSettings: async (request, response, next) => {
      try {
        const collection = await loadSettings();
        const defaults = getDefaultSettings();
        const result = await collection.findOneAndUpdate(
          { _id: "store-settings" },
          {
            $set: {
              ...defaults,
              updatedAt: new Date(),
              updatedBy: request.user._id,
            },
          },
          { upsert: true, returnDocument: "after" },
        );
        await logAction(request, "settings.reset", Object.keys(defaults));
        response.status(200).json({
          success: true,
          data: mergeSettings(result || defaults),
          stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
        });
      } catch (error) {
        next(error);
      }
    },
    listLogs: async (_request, response, next) => {
      try {
        const logs = await loadLogs();
        const data = await logs
          .find({})
          .sort({ createdAt: -1 })
          .limit(100)
          .toArray();
        response.status(200).json({
          success: true,
          data: data.map((entry) => ({
            id: entry._id?.toString(),
            adminId: entry.adminId,
            action: entry.action,
            sections: entry.sections,
            createdAt: entry.createdAt,
          })),
        });
      } catch (error) {
        next(error);
      }
    },
    getPublicSettings: async (_request, response, next) => {
      try {
        const collection = await loadSettings();
        const saved = await collection.findOne({ _id: "store-settings" });
        response.set("Cache-Control", "public, max-age=60");
        response.status(200).json({
          success: true,
          data: publicSettings(mergeSettings(saved || {})),
        });
      } catch (error) {
        next(error);
      }
    },
  };
}
