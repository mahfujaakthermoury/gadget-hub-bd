# Payment setup and testing

## Stripe

Stripe Checkout is implemented as a server-created, one-time Checkout Session. The backend reserves stock when it creates the order, and only a verified Stripe webhook can mark that order paid. Checkout expiration or asynchronous payment failure cancels the pending order and restores stock once. A browser redirect is never treated as proof of payment.

1. Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_CURRENCY` to the backend environment. Keep both keys out of browser code and source control. The default currency is `bdt`; verify that the Stripe account and payment methods you intend to use support BDT before enabling checkout. Do not silently convert prices.
2. Register `https://<your-api-host>/api/payments/stripe/webhook` as a webhook endpoint in Stripe. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `checkout.session.expired`. Put that endpoint's signing secret in `STRIPE_WEBHOOK_SECRET`.
3. For local development, run the Stripe CLI listener and forward events to `http://localhost:5000/api/payments/stripe/webhook`. Copy the CLI-generated signing secret into the backend environment, restart the API, and confirm the public settings response reports Stripe as configured.
4. In Admin → Settings → Payment, enable Stripe and save. Stripe remains unavailable in checkout until both backend keys exist and this setting is enabled.
5. In Stripe test mode, place an order using the test card `4242 4242 4242 4242`, any future expiry date, and any CVC. Confirm the webhook updates the order to paid and the dashboard revenue changes. Also test abandoning checkout until expiration; the order should be cancelled and its stock restored once.

The admin order screen intentionally does not directly cancel Stripe orders. Expiration handles unpaid sessions; captured payments must be refunded through Stripe before a cancellation workflow can safely restock them. Automated Stripe refunds are not implemented.

## Adding bKash

Use the official bKash Merchant Checkout/API product available to your merchant account. Keep merchant credentials in backend environment variables. The backend should create a payment tied to an existing order, store the bKash payment/transaction identifiers, execute or query the payment server-to-server, and verify the final status and amount with bKash before marking the order paid. Handle callbacks idempotently and reconcile pending payments; never trust a browser redirect or client-submitted status. Apply the same stock-reservation, expiration, and cancellation rules as Stripe. Add bKash as an explicit payment method in validated server settings and checkout only after the backend flow is tested in the merchant sandbox.

## Regression checks

- `npm run test:backend` exercises order stock reservation, stock adjustment, webhook idempotency, expiration restocking, analytics revenue filtering, and validation.
- `npm run build` checks the storefront and admin UI.
- After starting the API, check `GET /api/health`, authenticate as an admin, then check `GET /api/admin/analytics/overview` and `GET /api/admin/inventory`.
