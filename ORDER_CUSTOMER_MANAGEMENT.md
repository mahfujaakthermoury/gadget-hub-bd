# Order and customer management

## Order creation and payment

Orders are stored in the MongoDB `orders` collection. Order creation is exposed
to authenticated customers at `POST /api/orders`; customers cannot submit prices,
totals, payment status, customer IDs, or order status. The server reads current
product prices and inventory, reserves stock, and records line-price snapshots
inside a MongoDB transaction. Configure MongoDB as a replica set (MongoDB Atlas
already supports transactions) before accepting orders.

The only currently configured payment method is cash on delivery. Its payment
status starts as `pending`. bKash/Nagad have no gateway credentials, transaction
verification, or webhook in this project, so they cannot be selected and no
client request can mark an online payment paid. Add a verified provider webhook
before enabling online payment statuses.

Delivery is free for item subtotals of ৳5,000 or more. Below ৳5,000, the fee is
৳60 when the shipping district is `Sylhet` and ৳120 otherwise. The server
calculates the fee and final total; frontend totals are display-only.

Example request (prices and totals are intentionally omitted):

```json
{
  "items": [{ "productId": "65a000000000000000000001", "quantity": 2 }],
  "shippingAddress": {
    "fullName": "Customer Name",
    "phone": "+880 1712 345678",
    "address": "12 Example Road",
    "city": "Dhaka",
    "district": "Dhaka",
    "postalCode": "1207"
  },
  "paymentMethod": "cash_on_delivery"
}
```

Products without a configured numeric `stockQuantity` cannot be ordered. The
existing storefront fixture did not define quantities; set real stock levels in
the product admin before accepting orders. Cancelling an eligible order restores
the reserved stock in the same transaction.

## APIs

Every `/api/admin` endpoint requires the current authenticated admin role:

- `GET /api/admin/orders?page=1&limit=20&search=...&status=pending&paymentStatus=pending&from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/admin/orders/:id`
- `PATCH /api/admin/orders/:id/status` with `{ "status": "processing" }`
- `GET /api/admin/customers?page=1&limit=20&search=...&active=true`
- `GET /api/admin/customers/:id`
- `GET /api/admin/customers/:id/orders?page=1&limit=20`
- `PATCH /api/admin/customers/:id/status` with `{ "isActive": false }`
- `GET /api/my-orders` and `GET /api/my-orders/:id` (authenticated customer only)

Status transitions are `pending → processing → shipped → delivered`; pending
and processing orders may instead be cancelled. Delivered and cancelled orders
are terminal. Every status change records its timestamp and authenticated admin.
Payment status is stored separately and is not changed by order-status updates.

Customer results contain only safe profile fields. Only customer-role accounts
can be deactivated; an administrator cannot deactivate their own account or
another administrator through these endpoints. The existing session middleware
immediately rejects inactive accounts.

## Verification

```powershell
npm run test:backend
npm run build
```

The order tests cover server-side price calculation, stock reservation and
restoration, delivery fees, order/customer ownership, status transition history,
payment-status tampering, pagination/filtering, invalid input and IDs, admin
authorization, customer deactivation, and credential privacy.
