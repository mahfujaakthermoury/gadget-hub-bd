import Stripe from "stripe";

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

let stripeClient;

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw httpError(503, "Stripe payments are not configured.");
  }
  if (!stripeClient) stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

export async function createStripeCheckoutSession(order) {
  const stripe = getStripeClient();
  const origin = process.env.CLIENT_ORIGIN;
  if (!origin) throw httpError(503, "The storefront origin is not configured.");
  const currency = (process.env.STRIPE_CURRENCY || "bdt").toLowerCase();
  const lineItems = order.items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency,
      unit_amount: Math.round(item.unitPrice * 100),
      product_data: {
        name: item.name,
        ...(item.image && /^https:\/\//iu.test(item.image)
          ? { images: [item.image] }
          : {}),
      },
    },
  }));
  if (order.shippingAmount > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency,
        unit_amount: Math.round(order.shippingAmount * 100),
        product_data: { name: "Delivery" },
      },
    });
  }
  return stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    client_reference_id: order._id.toString(),
    metadata: { orderId: order._id.toString() },
    success_url: `${origin}/my-orders?payment=success`,
    cancel_url: `${origin}/my-orders?payment=cancelled`,
    customer_email: order.customer.email,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
  }, { idempotencyKey: order._id.toString() });
}

export async function constructStripeWebhookEvent(payload, signature) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw httpError(503, "Stripe webhook verification is not configured.");
  }
  return getStripeClient().webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET,
  );
}
