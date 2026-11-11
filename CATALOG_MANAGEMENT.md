# Product and category management

## Catalog setup

Set `MONGODB_URI`, `MONGODB_DB`, `CLIENT_ORIGIN`, and `VITE_API_BASE_URL` for the
target environment. `CLIENT_ORIGIN` must be the exact frontend origin, without a
trailing slash. The checked-in `.env.example` currently has a trailing slash in
`CLIENT_ORIGIN`; remove it when using that value.

The database-backed catalog uses the MongoDB `products` and `categories`
collections. Populate an empty catalog with the existing storefront products
and categories:

```powershell
npm run seed:catalog
```

The command refuses to run if either collection already contains documents.
Existing local product/category fixtures remain as a frontend fallback when the
catalog API cannot be reached. Once the API responds, its active data is used
instead, including an empty result.

## Image handling

No upload integration or cloud-image credentials are configured in this
repository. Admin forms accept hosted HTTP(S) image URLs and store only those
URLs; inline data/Base64 and file uploads are not accepted. Use Cloudinary with
server-signed uploads as the recommended option if binary upload is needed.
Before implementing that integration, configure its cloud name, API key, and
API secret as backend-only environment variables. Never expose the API secret
through a `VITE_` variable.

## API

All `/api/admin` endpoints require the existing HttpOnly session cookie plus
database-verified `admin` role:

- `GET /api/admin/products?page=1&limit=20&search=...&category=...&active=true&sort=price&order=asc`
- `POST /api/admin/products`
- `PUT /api/admin/products/:id`
- `DELETE /api/admin/products/:id` (soft-deactivates the product)
- `GET /api/admin/categories`
- `GET /api/admin/categories/:id`
- `POST /api/admin/categories`
- `PUT /api/admin/categories/:id`
- `DELETE /api/admin/categories/:id`

The public storefront reads active products and categories from
`/api/catalog/products` and `/api/catalog/categories`. Products in inactive
categories are also omitted. Product `category`, `image`, `stock`, ratings,
review counts, badges, and previous prices remain compatible with the existing
storefront data. New product fields include `images`, `brand`, `stockQuantity`,
`available`, and `active`.

Category removal returns HTTP 409 while an active product references it.
Deactivate/reassign those products first. Deleting a product is archival, so
admins can reactivate it through the product form.

## Verification

Run the automated backend, authorization, catalog validation, and utility tests,
then build the frontend:

```powershell
npm run test:backend
npm run build
```

The catalog tests exercise protected and unauthorized requests, category and
product CRUD, ObjectId validation, image URL validation (including rejection of
Base64), category-reference protection, search/filter/sort/pagination, soft
deactivation, and public storefront synchronization. No upload endpoint exists
until an image-hosting provider is configured.
