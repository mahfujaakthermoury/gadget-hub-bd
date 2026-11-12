import { useEffect, useRef, useState } from "react";
import { Archive, ImagePlus, Pencil, Plus, Search, Tags, Trash2 } from "lucide-react";
import { useCatalog } from "../../context/CatalogContext.jsx";
import {
  adminCatalogRequest,
  uploadCatalogImage,
} from "../../services/adminCatalogService.js";

function CatalogNotice({ error, success }) {
  if (!error && !success) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={`mb-4 rounded-xl px-4 py-3 text-sm ${
        error
          ? "border border-rose-200 bg-rose-50 text-rose-700"
          : "border border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {error || success}
    </p>
  );
}

function CatalogFormShell({ title, children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="my-auto w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
      >
        <h2 className="mb-5 font-display text-xl font-extrabold text-ink">
          {title}
        </h2>
        {children}
      </section>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block text-xs font-semibold text-slate-600 ${className}`}>
      {label}
      {children}
    </label>
  );
}

function ImageSourceSelector({
  mode,
  onModeChange,
  fileInputRef,
  onFileChange,
  uploading,
  children,
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2" aria-label="Image source">
        <button
          type="button"
          className={`btn btn-sm rounded-full ${mode === "url" ? "btn-primary border-0 bg-brand-blue text-white" : "btn-ghost"}`}
          aria-pressed={mode === "url"}
          onClick={() => onModeChange("url")}
        >
          Upload Image URL
        </button>
        <button
          type="button"
          className={`btn btn-sm rounded-full ${mode === "file" ? "btn-primary border-0 bg-brand-blue text-white" : "btn-ghost"}`}
          aria-pressed={mode === "file"}
          onClick={() => onModeChange("file")}
        >
          <ImagePlus size={15} /> Upload Image File
        </button>
      </div>
      {mode === "url" ? (
        children
      ) : (
        <Field label="Image file (JPEG, PNG, or WebP; up to 5 MB)">
          <input
            ref={fileInputRef}
            className={`${inputClass} file-input`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileChange}
            disabled={uploading}
          />
          <span className="mt-1 block text-xs text-slate-500">
            {uploading
              ? "Uploading image…"
              : "The image is uploaded to the configured cloud image service."}
          </span>
        </Field>
      )}
    </div>
  );
}

const inputClass =
  "input input-bordered mt-1.5 h-11 min-h-11 w-full rounded-xl border-slate-200 bg-white text-sm text-ink focus:border-brand-blue focus:outline-none";
const textAreaClass =
  "textarea textarea-bordered mt-1.5 min-h-24 w-full rounded-xl border-slate-200 bg-white text-sm text-ink focus:border-brand-blue focus:outline-none";

function ProductForm({ product, categories, busy, onClose, onSave }) {
  const [values, setValues] = useState(() => ({
    name: product?.name || "",
    description: product?.description || "",
    price: product?.price ?? "",
    oldPrice: product?.oldPrice ?? "",
    category: product?.category || categories.find((item) => item.active)?.name || "",
    brand: product?.brand || "",
    stockQuantity: product?.stockQuantity ?? (product ? "" : 0),
    imageUrls: (product?.images?.length ? product.images : product?.image ? [product.image] : []).join("\n"),
    available: product?.available ?? true,
    active: product?.active ?? true,
    rating: product?.rating ?? "",
    reviews: product?.reviews ?? "",
    badge: product?.badge || "",
    badgeTone: product?.badgeTone || "",
  }));
  const [error, setError] = useState("");
  const [imageMode, setImageMode] = useState("url");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setValues((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };
  const handleImageFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image files must be 5 MB or smaller.");
      return;
    }

    setError("");
    setUploadingImage(true);
    try {
      const url = await uploadCatalogImage(file);
      setValues((current) => ({
        ...current,
        imageUrls: [current.imageUrls.trim(), url].filter(Boolean).join("\n"),
      }));
      setImageMode("url");
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploadingImage(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    const images = values.imageUrls
      .split(/\r?\n/u)
      .map((url) => url.trim())
      .filter(Boolean);
    if (!images.length) {
      setError("Enter at least one product image URL.");
      return;
    }
    const numeric = (value) => (value === "" ? undefined : Number(value));
    try {
      await onSave({
        name: values.name.trim(),
        description: values.description.trim(),
        price: numeric(values.price),
        oldPrice: numeric(values.oldPrice),
        category: values.category,
        brand: values.brand.trim(),
        stockQuantity: numeric(values.stockQuantity),
        images,
        image: images[0],
        available: values.available,
        active: values.active,
        rating: numeric(values.rating),
        reviews: numeric(values.reviews),
        badge: values.badge.trim(),
        badgeTone: values.badgeTone.trim(),
      });
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  return (
    <CatalogFormShell
      title={product ? "Edit product" : "Add product"}
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={submit}>
        {error && <CatalogNotice error={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product name *">
            <input className={inputClass} name="name" value={values.name} onChange={change} maxLength="160" required />
          </Field>
          <Field label="Brand">
            <input className={inputClass} name="brand" value={values.brand} onChange={change} maxLength="120" />
          </Field>
          <Field label="Category *">
            <select className={inputClass} name="category" value={values.category} onChange={change} required>
              <option value="">Select category</option>
              {categories.map((category) => (
                <option
                  key={category.id || category.slug || category.name}
                  value={category.name}
                  disabled={!category.active && category.name !== values.category}
                >
                  {category.name}{category.active ? "" : " (inactive)"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Price (৳) *">
            <input className={inputClass} name="price" type="number" min="0" step="0.01" value={values.price} onChange={change} required />
          </Field>
          <Field label="Previous price (৳)">
            <input className={inputClass} name="oldPrice" type="number" min="0" step="0.01" value={values.oldPrice} onChange={change} />
          </Field>
          <Field label={`Stock quantity${product ? "" : " *"}`}>
            <input className={inputClass} name="stockQuantity" type="number" min="0" step="1" value={values.stockQuantity} onChange={change} required={!product} />
          </Field>
          <Field label="Rating">
            <input className={inputClass} name="rating" type="number" min="0" max="5" step="0.1" value={values.rating} onChange={change} />
          </Field>
          <Field label="Review count">
            <input className={inputClass} name="reviews" type="number" min="0" step="1" value={values.reviews} onChange={change} />
          </Field>
          <Field label="Badge">
            <input className={inputClass} name="badge" value={values.badge} onChange={change} maxLength="80" />
          </Field>
          <Field label="Badge tone">
            <input className={inputClass} name="badgeTone" value={values.badgeTone} onChange={change} maxLength="40" />
          </Field>
        </div>
        <Field label="Description *">
          <textarea className={textAreaClass} name="description" value={values.description} onChange={change} maxLength="5000" required />
        </Field>
        <ImageSourceSelector
          mode={imageMode}
          onModeChange={setImageMode}
          fileInputRef={fileInputRef}
          onFileChange={handleImageFile}
          uploading={uploadingImage}
        >
          <Field label="Product image URLs * (one URL per line)">
            <textarea className={`${textAreaClass} min-h-20`} name="imageUrls" value={values.imageUrls} onChange={change} required placeholder="https://images.example.com/product.jpg" />
          </Field>
        </ImageSourceSelector>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {[
            ["available", "Available to purchase"],
            ["active", "Visible in storefront"],
          ].map(([name, label]) => (
            <label key={name} className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" name={name} checked={values[name]} onChange={change} />
              {label}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" className="btn btn-ghost rounded-full" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary rounded-full border-0 bg-brand-blue text-white" disabled={busy || uploadingImage}>
            {busy ? "Saving…" : "Save product"}
          </button>
        </div>
      </form>
    </CatalogFormShell>
  );
}

export function AdminProductsPage() {
  const { refreshCatalog } = useCatalog();
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("updated-desc");
  const [page, setPage] = useState(1);
  const [formProduct, setFormProduct] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProducts = async () => {
    setError("");
    try {
      const sortOptions = {
        "updated-desc": ["updatedAt", "desc"],
        "name-asc": ["name", "asc"],
        "price-asc": ["price", "asc"],
        "price-desc": ["price", "desc"],
        "rating-desc": ["rating", "desc"],
      };
      const [sort, order] = sortOptions[sortBy];
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        sort,
        order,
      });
      if (search.trim()) params.set("search", search.trim());
      if (category) params.set("category", category);
      if (status) params.set("active", status);
      const result = await adminCatalogRequest(`products?${params}`);
      setProducts(result.data);
      setPagination(result.pagination);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await adminCatalogRequest("categories");
      setCategories(result.data);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [page, search, category, status, sortBy]);
  useEffect(() => {
    loadCategories();
  }, []);

  const saveProduct = async (values) => {
    setBusy(true);
    try {
      const editing = Boolean(formProduct?.id);
      await adminCatalogRequest(
        editing ? `products/${formProduct.mongoId}` : "products",
        { method: editing ? "PUT" : "POST", body: values },
      );
      setFormProduct(undefined);
      setSuccess(editing ? "Product updated." : "Product created.");
      await Promise.all([loadProducts(), loadCategories(), refreshCatalog()]);
    } finally {
      setBusy(false);
    }
  };

  const archiveProduct = async (product) => {
    if (!window.confirm(`Deactivate ${product.name}?`)) return;
    setError("");
    try {
      await adminCatalogRequest(`products/${product.mongoId}`, { method: "DELETE" });
      setSuccess("Product deactivated and removed from the storefront.");
      await Promise.all([loadProducts(), loadCategories(), refreshCatalog()]);
    } catch (actionError) {
      setError(actionError.message);
    }
  };

  const restoreProduct = async (product) => {
    setError("");
    try {
      await adminCatalogRequest(`products/${product.mongoId}`, {
        method: "PUT",
        body: { active: true, available: true },
      });
      setSuccess("Product reactivated.");
      await Promise.all([loadProducts(), loadCategories(), refreshCatalog()]);
    } catch (actionError) {
      setError(actionError.message);
    }
  };

  return (
    <div>
      <p className="mb-5 text-sm leading-6 text-slate-500">
        Add, update, and deactivate products in your live Gadget Hub storefront.
      </p>
      <CatalogNotice error={error} success={success} />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <label className="relative flex-1">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input className="input input-bordered h-10 min-h-10 w-full rounded-xl border-slate-200 pl-9 text-sm" placeholder="Search products" value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} />
            </label>
            <select className="select select-bordered h-10 min-h-10 rounded-xl border-slate-200 text-sm" value={category} onChange={(event) => { setPage(1); setCategory(event.target.value); }}>
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item.id || item.slug || item.name} value={item.name}>
                  {item.name}{item.active ? "" : " (inactive)"}
                </option>
              ))}
            </select>
            <select className="select select-bordered h-10 min-h-10 rounded-xl border-slate-200 text-sm" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <select className="select select-bordered h-10 min-h-10 rounded-xl border-slate-200 text-sm" aria-label="Sort products" value={sortBy} onChange={(event) => { setPage(1); setSortBy(event.target.value); }}>
              <option value="updated-desc">Recently updated</option>
              <option value="name-asc">Name</option>
              <option value="price-asc">Price: Low to high</option>
              <option value="price-desc">Price: High to low</option>
              <option value="rating-desc">Top rated</option>
            </select>
          </div>
          <button type="button" className="btn btn-primary min-h-10 h-10 rounded-full border-0 bg-brand-blue text-white" onClick={() => setFormProduct(null)}>
            <Plus size={16} /> Add product
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="flex min-w-52 items-center gap-3">
                      <img src={product.image || "/product-placeholder.svg"} alt="" className="h-11 w-11 rounded-lg bg-slate-100 object-cover" />
                      <div><p className="font-bold text-ink">{product.name}</p><p className="text-xs text-slate-500">{product.brand || "—"}</p></div>
                    </div>
                  </td>
                  <td>{product.category}</td>
                  <td>৳{Number(product.price).toLocaleString("en-BD")}</td>
                  <td>{product.stockQuantity ?? product.stock ?? "Not set"}</td>
                  <td><span className={`badge ${product.active ? "badge-success" : "badge-ghost"}`}>{product.active ? product.available ? "Active" : "Unavailable" : "Inactive"}</span></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button type="button" aria-label={`Edit ${product.name}`} className="btn btn-ghost btn-sm btn-square" onClick={() => setFormProduct(product)}><Pencil size={16} /></button>
                      {product.active ? (
                        <button type="button" aria-label={`Deactivate ${product.name}`} className="btn btn-ghost btn-sm btn-square text-rose-600" onClick={() => archiveProduct(product)}><Archive size={16} /></button>
                      ) : (
                        <button type="button" aria-label={`Reactivate ${product.name}`} className="btn btn-ghost btn-sm text-brand-blue" onClick={() => restoreProduct(product)}>Restore</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!products.length && <tr><td colSpan="6" className="py-12 text-center text-sm text-slate-500">{error ? "Products could not be loaded." : "No products match these filters."}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>{pagination.total} products</span>
          <div className="flex items-center gap-3">
            <button type="button" className="btn btn-ghost btn-xs" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
            <span>Page {page} of {Math.max(1, pagination.pages)}</span>
            <button type="button" className="btn btn-ghost btn-xs" disabled={page >= pagination.pages} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        </div>
      </section>
      {formProduct !== undefined && (
        <ProductForm
          product={formProduct}
          categories={categories}
          busy={busy}
          onClose={() => setFormProduct(undefined)}
          onSave={saveProduct}
        />
      )}
    </div>
  );
}

function CategoryForm({ category, busy, onClose, onSave }) {
  const [values, setValues] = useState({
    name: category?.name || "",
    slug: category?.slug || "",
    description: category?.description || "",
    image: category?.image || "",
    featured: category?.featured ?? false,
    popular: category?.popular ?? false,
    active: category?.active ?? true,
  });
  const [error, setError] = useState("");
  const [imageMode, setImageMode] = useState("url");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setValues((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };
  const handleImageFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image files must be 5 MB or smaller.");
      return;
    }

    setError("");
    setUploadingImage(true);
    try {
      const image = await uploadCatalogImage(file);
      setValues((current) => ({ ...current, image }));
      setImageMode("url");
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploadingImage(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    try {
      await onSave({ ...values, name: values.name.trim(), slug: values.slug.trim() || undefined });
    } catch (saveError) {
      setError(saveError.message);
    }
  };
  return (
    <CatalogFormShell title={category ? "Edit category" : "Add category"} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {error && <CatalogNotice error={error} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category name *"><input className={inputClass} name="name" value={values.name} onChange={change} maxLength="120" required /></Field>
          <Field label="Slug"><input className={inputClass} name="slug" value={values.slug} onChange={change} maxLength="140" placeholder="Generated from name" /></Field>
        </div>
        <Field label="Description"><textarea className={textAreaClass} name="description" value={values.description} onChange={change} maxLength="1000" /></Field>
        <ImageSourceSelector
          mode={imageMode}
          onModeChange={setImageMode}
          fileInputRef={fileInputRef}
          onFileChange={handleImageFile}
          uploading={uploadingImage}
        >
          <Field label="Category image URL *"><input className={inputClass} name="image" type="url" value={values.image} onChange={change} required /></Field>
        </ImageSourceSelector>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {[
            ["active", "Active in storefront"],
            ["featured", "Featured"],
            ["popular", "Popular"],
          ].map(([name, label]) => (
            <label key={name} className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" name={name} checked={values[name]} onChange={change} />
              {label}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button type="button" className="btn btn-ghost rounded-full" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary rounded-full border-0 bg-brand-blue text-white" disabled={busy || uploadingImage}>{busy ? "Saving…" : "Save category"}</button>
        </div>
      </form>
    </CatalogFormShell>
  );
}

export function AdminCategoriesPage() {
  const { refreshCatalog } = useCatalog();
  const [categories, setCategories] = useState([]);
  const [formCategory, setFormCategory] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCategories = async () => {
    setError("");
    try {
      const result = await adminCatalogRequest("categories");
      setCategories(result.data);
    } catch (loadError) {
      setError(loadError.message);
    }
  };
  useEffect(() => {
    loadCategories();
  }, []);

  const saveCategory = async (values) => {
    setBusy(true);
    try {
      const editing = Boolean(formCategory?.id);
      await adminCatalogRequest(
        editing ? `categories/${formCategory.id}` : "categories",
        { method: editing ? "PUT" : "POST", body: values },
      );
      setFormCategory(undefined);
      setSuccess(editing ? "Category updated." : "Category created.");
      await Promise.all([loadCategories(), refreshCatalog()]);
    } finally {
      setBusy(false);
    }
  };

  const deleteCategory = async (category) => {
    if (!window.confirm(`Delete ${category.name}?`)) return;
    setError("");
    try {
      await adminCatalogRequest(`categories/${category.id}`, { method: "DELETE" });
      setSuccess("Category deleted.");
      await Promise.all([loadCategories(), refreshCatalog()]);
    } catch (actionError) {
      setError(actionError.message);
    }
  };

  return (
    <div>
      <p className="mb-5 text-sm leading-6 text-slate-500">
        Organize storefront categories. Categories referenced by active products cannot be deleted.
      </p>
      <CatalogNotice error={error} success={success} />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <div className="flex items-center gap-2 font-bold text-ink"><Tags size={18} /> Categories</div>
          <button type="button" className="btn btn-primary min-h-10 h-10 rounded-full border-0 bg-brand-blue text-white" onClick={() => setFormCategory(null)}><Plus size={16} /> Add category</button>
        </div>
        <div className="divide-y divide-slate-100">
          {categories.map((category) => (
            <article key={category.id} className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
              <img src={category.image || "/product-placeholder.svg"} alt="" className="h-14 w-16 rounded-lg bg-slate-100 object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-ink">{category.name}</h3>
                  <span className={`badge ${category.active ? "badge-success" : "badge-ghost"}`}>{category.active ? "Active" : "Inactive"}</span>
                </div>
                <p className="truncate text-xs text-slate-500">{category.description || category.slug}</p>
              </div>
              <div className="flex gap-1">
                <button type="button" aria-label={`Edit ${category.name}`} className="btn btn-ghost btn-sm btn-square" onClick={() => setFormCategory(category)}><Pencil size={16} /></button>
                <button type="button" aria-label={`Delete ${category.name}`} className="btn btn-ghost btn-sm btn-square text-rose-600" onClick={() => deleteCategory(category)}><Trash2 size={16} /></button>
              </div>
            </article>
          ))}
          {!categories.length && <p className="p-10 text-center text-sm text-slate-500">{error ? "Categories could not be loaded." : "No categories yet."}</p>}
        </div>
      </section>
      {formCategory !== undefined && (
        <CategoryForm
          category={formCategory}
          busy={busy}
          onClose={() => setFormCategory(undefined)}
          onSave={saveCategory}
        />
      )}
    </div>
  );
}
