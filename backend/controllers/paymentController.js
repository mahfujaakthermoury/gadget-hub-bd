import { ObjectId } from "mongodb";
import { withDatabaseTransaction } from "../db.js";
import { getOrdersCollection } from "../models/orders.js";
import { getProductsCollection } from "../models/catalog.js";
import { getInventoryAdjustmentsCollection } from "../models/inventoryAdjustments.js";
import {
  constructStripeWebhookEvent,
  createStripeCheckoutSession,
} from "../services/stripeService.js";

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

export function createStripeWebhookController({
  loadOrders = getOrdersCollection,
  loadProducts = getProductsCollection,
  loadAdjustments = getInventoryAdjustmentsCollection,
  runTransaction = withDatabaseTransaction,
  constructEvent = constructStripeWebhookEvent,
} = {}) {
  return async function stripeWebhook(request, response, next) {
    let event;
    try {
      const signature = request.headers["stripe-signature"];
      if (typeof signature !== "string" || !Buffer.isBuffer(request.body)) {
        throw httpError(400, "A valid Stripe webhook signature is required.");
      }
      event = await constructEvent(request.body, signature);
    } catch (error) {
      if (error.status) return next(error);
      return response.status(400).json({ error: "Invalid Stripe webhook signature." });
    }

    try {
      if (
        event.type !== "checkout.session.completed" &&
        event.type !== "checkout.session.async_payment_succeeded" &&
        event.type !== "checkout.session.async_payment_failed" &&
        event.type !== "checkout.session.expired"
      ) {
        return response.status(200).json({ received: true });
      }
      const checkout = event.data.object;
      const orderId = checkout.metadata?.orderId || checkout.client_reference_id;
      if (typeof orderId !== "string" || !/^[\da-f]{24}$/iu.test(orderId)) {
        throw httpError(400, "Stripe event does not reference a valid order.");
      }
      const orders = await loadOrders();
      const products = await loadProducts();
      const adjustments = await loadAdjustments();
      const id = new ObjectId(orderId);
      await runTransaction(async (session) => {
        const order = await orders.findOne(
          { _id: id, paymentMethod: "stripe" },
          { session },
        );
        if (!order) throw httpError(404, "Stripe order not found.");
        if (order.stripeSessionId && order.stripeSessionId !== checkout.id) {
          throw httpError(409, "Stripe session does not match the order.");
        }
        if (
          event.type === "checkout.session.expired" ||
          event.type === "checkout.session.async_payment_failed"
        ) {
          if (order.paymentStatus !== "pending" || order.status === "cancelled") return;
          const cancelled = await orders.updateOne(
            { _id: id, paymentStatus: "pending", status: { $ne: "cancelled" } },
            {
              $set: { status: "cancelled", paymentStatus: "failed", updatedAt: new Date() },
              $push: {
                statusHistory: {
                  status: "cancelled",
                  changedAt: new Date(),
                  changedBy: { name: "Stripe", role: "system" },
                },
              },
            },
            { session },
          );
          if (cancelled.matchedCount) {
            for (const item of order.items) {
              const product = await products.findOne(
                { _id: item.productId },
                { session },
              );
              await products.updateOne(
                { _id: item.productId },
                { $inc: { stockQuantity: item.quantity }, $set: { updatedAt: new Date() } },
                { session },
              );
              await adjustments.insertOne({
                productId: item.productId,
                productName: item.name,
                previousStock: product?.stockQuantity ?? null,
                updatedStock: Number.isSafeInteger(product?.stockQuantity)
                  ? product.stockQuantity + item.quantity
                  : null,
                quantityChanged: item.quantity,
                reason: `Restock after expired Stripe checkout for ${order.orderNumber}.`,
                type: "restock",
                orderId: order._id,
                adminId: null,
                createdAt: new Date(),
              }, { session });
            }
          }
          return;
        }
        if (checkout.payment_status !== "paid") return;
        if (order.status === "cancelled") {
          throw httpError(409, "A cancelled order cannot be marked paid.");
        }
        const currency = (process.env.STRIPE_CURRENCY || "bdt").toLowerCase();
        if (
          checkout.currency !== currency ||
          checkout.amount_total !== Math.round(order.totalAmount * 100)
        ) {
          throw httpError(400, "Stripe payment amount or currency does not match the order.");
        }
        const paidAt = new Date();
        const paymentFields = {
          paymentStatus: "paid",
          paymentVerifiedAt: paidAt,
          paidAt,
          stripeSessionId: checkout.id,
          updatedAt: paidAt,
        };
        if (typeof checkout.payment_intent === "string") {
          paymentFields.stripePaymentIntentId = checkout.payment_intent;
        }
        await orders.updateOne(
          {
            _id: id,
            paymentMethod: "stripe",
            paymentStatus: "pending",
            status: { $ne: "cancelled" },
          },
          { $set: paymentFields },
          { session },
        );
      });
      return response.status(200).json({ received: true });
    } catch (error) {
      return next(error);
    }
  };
}

export function createStripeCheckoutController({
  loadOrders = getOrdersCollection,
  createSession = createStripeCheckoutSession,
} = {}) {
  return async function startStripeCheckout(request, response, next) {
    try {
      const body = request.body;
      if (
        !body ||
        typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).some((key) => key !== "orderId") ||
        typeof body.orderId !== "string" ||
        !/^[\da-f]{24}$/iu.test(body.orderId)
      ) {
        throw httpError(400, "A valid order ID is required.");
      }
      const orders = await loadOrders();
      const order = await orders.findOne({
        _id: new ObjectId(body.orderId),
        customerId: new ObjectId(request.user._id),
        paymentMethod: "stripe",
        paymentStatus: "pending",
        status: { $ne: "cancelled" },
      });
      if (!order) throw httpError(404, "Pending Stripe order not found.");
      const session = await createSession(order);
      if (!session?.id || !session.url) {
        throw httpError(502, "Stripe did not return a checkout URL.");
      }
      await orders.updateOne(
        { _id: order._id, paymentStatus: "pending" },
        { $set: { stripeSessionId: session.id, updatedAt: new Date() } },
      );
      response.status(200).json({
        success: true,
        data: { checkoutUrl: session.url },
      });
    } catch (error) {
      next(error);
    }
  };
}
