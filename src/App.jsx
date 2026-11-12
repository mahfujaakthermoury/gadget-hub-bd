import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpDown,
  Check,
  Eye,
  EyeOff,
  Headphones,
  Heart,
  HeartHandshake,
  LockKeyhole,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  X,
} from "lucide-react";
import Navbar from "./components/Navbar.jsx";
import HeroSlider from "./components/HeroSlider.jsx";
import ProductCard from "./components/ProductCard.jsx";
import FeatureCard from "./components/FeatureCard.jsx";
import Newsletter from "./components/Newsletter.jsx";
import Footer from "./components/Footer.jsx";
import Reveal from "./components/Reveal.jsx";
import SectionHeading from "./components/SectionHeading.jsx";
import ShopPage from "./pages/ShopPage.jsx";
import CategoriesPage from "./pages/CategoriesPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import ContactPage from "./pages/ContactPage.jsx";
import ToastNotification from "./components/ToastNotification.jsx";
import CheckoutForm from "./components/CheckoutForm.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import {
  AccountPage,
  MyOrdersPage,
  UnauthorizedPage,
  WishlistPage,
} from "./pages/ProtectedPages.jsx";
import AdminLayout from "./components/admin/AdminLayout.jsx";
import {
  AdminOverviewPage,
  AdminSectionPage,
} from "./pages/admin/AdminPages.jsx";
import {
  AdminCategoriesPage,
  AdminProductsPage,
} from "./pages/admin/AdminCatalogPages.jsx";
import AdminInventoryPage from "./pages/admin/AdminInventoryPage.jsx";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage.jsx";
import {
  AdminCustomersPage,
  AdminOrdersPage,
} from "./pages/admin/AdminOrderPages.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { useCatalog } from "./context/CatalogContext.jsx";
import { useTheme } from "./context/ThemeContext.jsx";
import {
  getLoginError,
  getRegistrationError,
} from "./utils/authValidation.js";
import { formatPrice } from "./data/products.js";

const features = [
  {
    icon: Truck,
    title: "Free & fast delivery",
    description: "Complimentary delivery on orders over ",
    shippingThreshold: true,
  },
  {
    icon: LockKeyhole,
    title: "Checkout with confidence",
    description: "Cash on delivery and secure payment options.",
  },
  {
    icon: HeartHandshake,
    title: "Easy returns",
    description: "A thoughtful, straightforward returns experience.",
  },
  {
    icon: Headphones,
    title: "Here when you need us",
    description: "Our friendly team is ready to help with your order.",
  },
];

const panelCopy = {
  cart: { title: "Your shopping bag", subtitle: "Your picks, all in one place." },
  wishlist: {
    title: "Your wishlist",
    subtitle: "Good things you have your eye on.",
  },
  signin: {
    title: "Welcome back",
    subtitle: "Sign in to see your orders and saved favorites.",
  },
  signup: {
    title: "Make yourself at home",
    subtitle: "Create an account to keep your favorites close.",
  },
};

function readStoredValue(key, fallback) {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (error) {
    console.warn(`Could not read saved ${key} from local storage.`, error);
    return fallback;
  }
}

function ProductDialog({ product, onClose, onAddToCart }) {
  const shouldReduceMotion = useReducedMotion();
  if (!product) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-ink/60 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-view-title"
          initial={
            shouldReduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.22 }}
          className="relative my-auto grid w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl sm:grid-cols-2"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close quick view"
            className="btn btn-circle btn-sm absolute right-3 top-3 z-10 border-0 bg-white/90 text-slate-700 shadow-sm hover:bg-white"
          >
            <X size={18} />
          </button>
          <img
            src={product.image}
            alt={product.name}
            className="h-64 w-full bg-slate-100 object-cover sm:h-full sm:min-h-[380px]"
          />
          <div className="flex flex-col p-6 sm:p-8">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand-blue">
              {product.category} · {product.badge}
            </span>
            <h2
              id="quick-view-title"
              className="mt-3 font-display text-2xl font-extrabold leading-tight text-ink"
            >
              {product.name}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              {product.description}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="text-2xl font-extrabold text-ink">
                {formatPrice(product.price)}
              </span>
              <span className="text-sm text-slate-400 line-through">
                {formatPrice(product.oldPrice)}
              </span>
            </div>
            <p className={`mt-2 text-xs font-semibold ${
              product.available === false || product.stockQuantity === 0
                ? "text-rose-700"
                : "text-emerald-700"
            }`}>
              {product.available === false || product.stockQuantity === 0
                ? "Currently unavailable"
                : product.stock === "Low stock"
                  ? "Only a few left — order soon"
                  : "In stock and ready to ship"}
            </p>
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              disabled={
                product.active === false ||
                product.available === false ||
                product.stockQuantity === 0
              }
              className="btn btn-primary mt-auto min-h-12 rounded-full border-0 bg-brand-blue text-white hover:bg-brand-purple disabled:bg-slate-300"
            >
              {product.available === false || product.stockQuantity === 0
                ? "Unavailable"
                : "Add to bag"} <ArrowRight size={17} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SidePanel({
  panel,
  onClose,
  onOpenPanel,
  cart,
  wishlist,
  onRemoveCartItem,
  onUpdateCartQuantity,
  onRemoveWishlistItem,
  onAddToCart,
  onLoginSuccess,
  onCheckout,
}) {
  const shouldReduceMotion = useReducedMotion();
  const { login, register } = useAuth();
  const [accountMessage, setAccountMessage] = useState("");
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  if (!panel) return null;
  const isCart = panel === "cart";
  const isWishlist = panel === "wishlist";
  const isAccount = !isCart && !isWishlist;
  const items = isCart ? cart : wishlist;
  const total = cart.reduce(
    (sum, entry) => sum + entry.product.price * entry.quantity,
    0,
  );

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] bg-ink/45 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <motion.aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="panel-title"
          initial={shouldReduceMotion ? false : { x: 32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 32, opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
          className="ml-auto flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2
                id="panel-title"
                className="font-display text-xl font-extrabold text-ink"
              >
                {panelCopy[panel].title}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {panelCopy[panel].subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="btn btn-circle btn-sm border-0 bg-slate-50 text-slate-600 hover:bg-slate-100"
            >
              <X size={18} />
            </button>
          </div>

          {isAccount ? (
            <form
              noValidate
              className="flex flex-1 flex-col p-5 sm:p-6"
              onSubmit={async (event) => {
                event.preventDefault();
                setAccountMessage("");

                const form = event.currentTarget;
                const details = Object.fromEntries(
                  new FormData(form).entries(),
                );
                const validationError =
                  panel === "signup"
                    ? getRegistrationError(details)
                    : getLoginError(details);
                if (validationError) {
                  setAccountMessage(validationError);
                  window.alert(validationError);
                  return;
                }

                setIsSubmittingAccount(true);

                try {
                  const result =
                    panel === "signup"
                      ? await register(details)
                      : await login(details);
                  form.reset();
                  if (panel === "signup") {
                    const message =
                      result.message ||
                      "Your account has been created. Please sign in.";
                    setAccountMessage(message);
                    window.alert(message);
                    onOpenPanel("signin");
                  } else {
                    const message = `Welcome back, ${result.user.name}.`;
                    setAccountMessage(message);
                    window.alert(message);
                    onLoginSuccess(result.user);
                  }
                } catch (error) {
                  const message =
                    error.message ||
                    "The account request could not be completed.";
                  setAccountMessage(message);
                  window.alert(message);
                } finally {
                  setIsSubmittingAccount(false);
                }
              }}
            >
              {panel === "signup" && (
                <label className="mb-4 text-xs font-semibold text-slate-600">
                  Your name
                  <input
                    required
                    name="name"
                    autoComplete="name"
                    maxLength={100}
                    placeholder="e.g. Alex Rahman"
                    className="input input-bordered mt-2 h-12 w-full rounded-xl border-slate-200 text-sm"
                  />
                </label>
              )}
              <label className="mb-4 text-xs font-semibold text-slate-600">
                Email address
                <input
                  required
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="input input-bordered mt-2 h-12 w-full rounded-xl border-slate-200 text-sm"
                />
              </label>
              <div className="mb-5 text-xs font-semibold text-slate-600">
                <label htmlFor={`account-password-${panel}`}>Password</label>
                <div className="relative mt-2">
                <input
                  id={`account-password-${panel}`}
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete={
                    panel === "signup" ? "new-password" : "current-password"
                  }
                  minLength={6}
                  maxLength={128}
                  placeholder="At least 6 characters"
                  className="input input-bordered h-12 w-full rounded-xl border-slate-200 pr-12 text-sm"
                />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-3 my-auto grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              {panel === "signup" && (
                <div className="mb-5 text-xs font-semibold text-slate-600">
                  <label htmlFor="account-confirm-password">
                    Confirm password
                  </label>
                  <div className="relative mt-2">
                  <input
                    id="account-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    autoComplete="new-password"
                    minLength={6}
                    maxLength={128}
                    placeholder="Enter your password again"
                    className="input input-bordered h-12 w-full rounded-xl border-slate-200 pr-12 text-sm"
                  />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((visible) => !visible)
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirmation password"
                          : "Show confirmation password"
                      }
                      className="absolute inset-y-0 right-3 my-auto grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </div>
              )}
              <p className="mb-5 rounded-xl bg-brand-pale p-3 text-xs leading-5 text-slate-600">
                {panel === "signup"
                  ? "Use at least 6 characters with uppercase and lowercase letters, a digit, and a special character."
                  : "Your session is kept in an HttpOnly cookie and verified by the backend."}
              </p>
              {accountMessage && (
                <p className="mb-4 text-xs font-semibold text-brand-purple" aria-live="polite">
                  {accountMessage}
                </p>
              )}
              <button
                type="submit"
                disabled={isSubmittingAccount}
                className="btn btn-primary mt-auto min-h-12 rounded-full border-0 bg-brand-blue text-white hover:bg-brand-purple"
              >
                {isSubmittingAccount
                  ? panel === "signup"
                    ? "Creating account..."
                    : "Signing in..."
                  : panel === "signup"
                    ? "Create account"
                    : "Sign in"}
              </button>
            </form>
          ) : items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-pale text-brand-blue">
                {isCart ? <ShoppingBag size={26} /> : <Heart size={26} />}
              </div>
              <h3 className="mt-5 text-base font-bold text-ink">
                {isCart
                  ? "Your bag is looking a little light"
                  : "Nothing saved just yet"}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                {isCart
                  ? "Find something you love and it will be waiting here."
                  : "Tap the heart on a product to keep it close."}
              </p>
              <a
                href="#products"
                onClick={onClose}
                className="btn btn-primary mt-6 rounded-full border-0 bg-brand-blue px-6 text-white hover:bg-brand-purple"
              >
                Explore products
              </a>
            </div>
          ) : (
            <>
              <motion.div layout className="flex-1 overflow-y-auto px-5 py-3 sm:px-6">
                <AnimatePresence initial={false}>
                {items.map((entry) => (
                  <motion.div
                    key={entry.product.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    className={`flex gap-4 border-b border-slate-100 py-4 ${
                      isWishlist ? "flex-wrap" : ""
                    }`}
                  >
                    <img
                      src={entry.product.image}
                      alt=""
                      className="h-20 w-20 rounded-xl bg-slate-100 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-bold leading-5 text-ink">
                        {entry.product.name}
                      </p>
                      {isCart && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                          <span>Quantity</span>
                          <div
                            role="group"
                            aria-label={`Quantity for ${entry.product.name}`}
                            className="flex h-7 items-center overflow-hidden rounded-lg border border-slate-200"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateCartQuantity(entry.product.id, -1)
                              }
                              disabled={entry.quantity <= 1}
                              aria-label={`Decrease ${entry.product.name} quantity`}
                              className="grid h-full w-7 place-items-center text-slate-600 transition hover:bg-slate-50 hover:text-brand-blue disabled:cursor-not-allowed disabled:text-slate-300"
                            >
                              <Minus size={13} />
                            </button>
                            <output
                              aria-label={`${entry.product.name} quantity`}
                              aria-live="polite"
                              className="min-w-7 text-center text-xs font-semibold tabular-nums text-ink"
                            >
                              {entry.quantity}
                            </output>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateCartQuantity(entry.product.id, 1)
                              }
                              aria-label={`Increase ${entry.product.name} quantity`}
                              className="grid h-full w-7 place-items-center text-slate-600 transition hover:bg-slate-50 hover:text-brand-blue"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                      <p className="mt-2 text-sm font-bold text-brand-blue">
                        {formatPrice(entry.product.price)}
                      </p>
                      {isWishlist && (
                        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-600">
                          <Star
                            size={13}
                            className="fill-amber-400 text-amber-400"
                          />
                          {entry.product.rating}
                          <span className="font-normal text-slate-400">
                            ({entry.product.reviews} reviews)
                          </span>
                        </p>
                      )}
                    </div>
                    {isCart && (
                      <button
                        type="button"
                        onClick={() => onRemoveCartItem(entry.product.id)}
                        className="self-start text-xs font-semibold text-slate-400 transition hover:text-rose-600"
                      >
                        Remove
                      </button>
                    )}
                    {isWishlist && (
                      <div className="flex w-full items-center justify-between gap-3 pl-24">
                        <button
                          type="button"
                          onClick={() => onAddToCart(entry.product)}
                          className="btn btn-primary btn-sm min-h-9 flex-1 rounded-full border-0 bg-brand-blue text-[11px] text-white hover:bg-brand-purple"
                        >
                          <ShoppingBag size={14} />
                          Add to Cart
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onRemoveWishlistItem(entry.product.id)
                          }
                          className="text-xs font-semibold text-slate-500 transition hover:text-rose-600"
                        >
                          Remove from Wishlist
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
                </AnimatePresence>
              </motion.div>
              {isCart && (
                <div className="border-t border-slate-100 p-5 sm:p-6">
                  <div className="mb-4 flex items-center justify-between text-sm font-bold text-ink">
                    <span>Subtotal</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <p className="mb-4 text-xs text-slate-500">
                    Shipping is calculated at checkout.
                  </p>
                  <button
                    type="button"
                    onClick={onCheckout}
                    className="btn btn-primary w-full rounded-full border-0 bg-brand-blue text-white hover:bg-brand-purple"
                  >
                    Continue to checkout <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </motion.aside>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState("All products");
  const [sortBy, setSortBy] = useState("featured");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState(() => readStoredValue("gadget-hub-cart", []));
  const [wishlist, setWishlist] = useState(() =>
    readStoredValue("gadget-hub-wishlist", []),
  );
  const [panel, setPanel] = useState(null);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [protectedReturnPath, setProtectedReturnPath] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { storeSettings } = useTheme();
  const { products, productCategories, refreshCatalog } = useCatalog();
  const isAdminRoute =
    location.pathname === "/admin" || location.pathname.startsWith("/admin/");

  useEffect(() => {
    try {
      window.localStorage.setItem("gadget-hub-cart", JSON.stringify(cart));
    } catch (error) {
      console.warn("Could not save the cart to local storage.", error);
    }
  }, [cart]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "gadget-hub-wishlist",
        JSON.stringify(wishlist),
      );
    } catch (error) {
      console.warn("Could not save the wishlist to local storage.", error);
    }
  }, [wishlist]);

  useEffect(() => {
    const productsById = new Map(products.map((product) => [product.id, product]));
    setCart((currentCart) =>
      currentCart.flatMap((entry) => {
        const product = productsById.get(entry.product.id);
        if (
          !product ||
          product.active === false ||
          product.available === false ||
          product.stockQuantity === 0
        ) {
          return [];
        }
        return [{ ...entry, product }];
      }),
    );
    setWishlist((currentWishlist) =>
      currentWishlist.map((item) => productsById.get(item.id) || item),
    );
    setQuickViewProduct((currentProduct) =>
      currentProduct
        ? productsById.get(currentProduct.id) || null
        : currentProduct,
    );
  }, [products]);

  useEffect(() => {
    if (!panel && !quickViewProduct) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setPanel(null);
        setQuickViewProduct(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [panel, quickViewProduct]);

  useEffect(() => {
    if (!location.state?.authRequired) return;

    setProtectedReturnPath(location.state.returnTo || null);
    setPanel("signin");
    navigate("/", { replace: true, state: null });
  }, [location.state, navigate]);

  useEffect(() => {
    if (!checkoutOpen || location.pathname !== "/") return;
    document
      .getElementById("checkout-note")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [checkoutOpen, location.pathname]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const matchesCategory =
        activeCategory === "All products" ||
        product.category === activeCategory;
      const matchesSearch =
        !normalizedQuery ||
        `${product.name} ${product.category} ${product.description} ${product.brand || ""}`
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesCategory && matchesSearch;
    });

    if (sortBy === "price-low") {
      return [...filtered].sort((a, b) => a.price - b.price);
    }
    if (sortBy === "price-high") {
      return [...filtered].sort((a, b) => b.price - a.price);
    }
    if (sortBy === "rating") {
      return [...filtered].sort((a, b) => b.rating - a.rating);
    }
    return filtered;
  }, [activeCategory, products, searchQuery, sortBy]);

  const cartCount = cart.reduce((total, entry) => total + entry.quantity, 0);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const addToCart = (product) => {
    const currentProduct = products.find((item) => item.id === product.id);
    if (
      !currentProduct ||
      currentProduct.active === false ||
      currentProduct.available === false ||
      currentProduct.stockQuantity === 0
    ) {
      showToast("This product is currently unavailable.");
      return;
    }
    setCart((currentCart) => {
      const existing = currentCart.find(
        (entry) => entry.product.id === product.id,
      );
      if (existing) {
        return currentCart.map((entry) =>
          entry.product.id === product.id
            ? {
                ...entry,
                product: currentProduct,
                quantity: entry.quantity + 1,
              }
            : entry,
        );
      }
      return [...currentCart, { product: currentProduct, quantity: 1 }];
    });
    setQuickViewProduct(null);
    showToast("Product added to cart successfully!");
  };

  const updateCartQuantity = (productId, change) => {
    setCart((currentCart) =>
      currentCart.map((entry) =>
        entry.product.id === productId
          ? { ...entry, quantity: Math.max(1, entry.quantity + change) }
          : entry,
      ),
    );
  };

  const toggleWishlist = (product) => {
    const exists = wishlist.some((item) => item.id === product.id);
    setWishlist((current) =>
      exists
        ? current.filter((item) => item.id !== product.id)
        : [...current, product],
    );
    showToast(
      exists
        ? `${product.name} removed from your wishlist.`
        : `${product.name} saved to your wishlist.`,
    );
  };

  const searchProducts = (query) => {
    const trimmedQuery = query.trim();
    navigate(trimmedQuery ? `/shop?q=${encodeURIComponent(trimmedQuery)}` : "/shop");
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActiveCategory("All products");
  };

  const handleLoginSuccess = (signedInUser) => {
    const destination =
      protectedReturnPath ||
      (signedInUser.role === "admin" ? "/admin" : location.pathname);
    setProtectedReturnPath(null);
    setPanel(null);
    navigate(destination, { replace: true });
  };

  const handleCheckout = () => {
    setPanel(null);
    setCheckoutOpen(true);
    if (!user) {
      setProtectedReturnPath("/");
      setPanel("signin");
    } else if (location.pathname !== "/") {
      navigate("/");
    }
  };

  const handleOrderPlaced = (order) => {
    setCart([]);
    setCheckoutOpen(false);
    showToast(`Order ${order.orderNumber} placed successfully.`);
    refreshCatalog();
    navigate("/my-orders");
  };

  return (
    <div className="min-h-screen bg-white text-ink">
      {isAdminRoute ? (
        <Routes>
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminOverviewPage />} />
            <Route
              path="products"
              element={<AdminProductsPage />}
            />
            <Route
              path="categories"
              element={<AdminCategoriesPage />}
            />
            <Route
              path="orders"
              element={<AdminOrdersPage />}
            />
            <Route
              path="customers"
              element={<AdminCustomersPage />}
            />
            <Route
              path="inventory"
              element={<AdminInventoryPage />}
            />
            <Route
              path="analytics"
              element={<AdminSectionPage section="analytics" />}
            />
            <Route
              path="settings"
              element={<AdminSettingsPage />}
            />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Routes>
      ) : (
        <>
          <Navbar
            cartCount={cartCount}
            wishlistCount={wishlist.length}
            onOpenPanel={setPanel}
            onSearch={searchProducts}
            activePath={location.pathname}
          />
          {storeSettings?.general?.maintenanceMode && (
            <p className="bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900" role="status">
              The store is in maintenance mode. Some services may be temporarily unavailable.
            </p>
          )}
          <main>
            <Routes>
              <Route
                path="/"
            element={
              <>
        <HeroSlider />

        <section
          id="categories"
          className="mx-auto max-w-[1440px] px-5 pb-5 pt-12 sm:px-8 sm:pt-16 lg:px-12"
          aria-label="Our promises"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                {...feature}
                description={feature.shippingThreshold
                  ? `${feature.description}${formatPrice(storeSettings?.shipping?.freeShippingThreshold ?? 5000)}.`
                  : feature.description}
                index={index}
              />
            ))}
          </div>
        </section>

        <section
          id="trending"
          className="mx-auto max-w-[1440px] px-5 pb-14 pt-16 sm:px-8 sm:pb-16 sm:pt-20 lg:px-12"
        >
          <SectionHeading
            eyebrow="A few good finds"
            title="Trending Products"
            description="A little inspiration from the things everyone has their eye on."
            action={
              <a
                href="#products"
                className="btn btn-outline h-11 min-h-11 rounded-full border-slate-200 px-5 text-xs font-bold text-ink transition hover:border-brand-blue hover:bg-brand-blue hover:text-white"
              >
                See what else is good <ArrowRight size={15} />
              </a>
            }
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {products.slice(0, 4).map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                onAddToCart={addToCart}
                onToggleWishlist={toggleWishlist}
                onQuickView={setQuickViewProduct}
                isWishlisted={wishlist.some((item) => item.id === product.id)}
              />
            ))}
          </div>
        </section>

        <section
          id="about"
          className="bg-[#f7f9fc] py-14 sm:py-16"
          aria-labelledby="about-heading"
        >
          <div className="mx-auto grid max-w-[1440px] items-center gap-8 px-5 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-14 lg:px-12">
            <Reveal>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand-blue">
                A little more thought, a lot more joy
              </p>
              <h2
                id="about-heading"
                className="max-w-xl font-display text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl"
              >
                Good tech should feel good to bring home.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-slate-500 sm:text-base">
                We believe the best gadgets aren’t just clever — they make
                everyday life a little easier, more creative, or simply more
                fun. That’s why we keep the good stuff, and leave the noise
                behind.
              </p>
              <a
                href="#products"
                className="btn btn-primary mt-6 rounded-full border-0 bg-brand-blue px-5 text-xs text-white hover:bg-brand-purple"
              >
                Get to know our picks <ArrowRight size={15} />
              </a>
            </Reveal>
            <Reveal delay={0.12} className="relative">
              <img
                src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=85"
                alt="A bright, inspiring creative workspace"
                loading="lazy"
                className="h-64 w-full rounded-3xl object-cover shadow-soft sm:h-[330px]"
              />
              <div className="absolute -bottom-4 right-3 rounded-2xl bg-white px-4 py-3 shadow-soft sm:-bottom-5 sm:right-6 sm:px-5 sm:py-4">
                <p className="font-display text-sm font-extrabold text-ink sm:text-base">
                  Smarter tech.
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  A better everyday.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section
          id="products"
          className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12"
        >
          <SectionHeading
            eyebrow="Picked for real life"
            title="Explore Our Products"
            description="From a better workday to a slower Sunday — find your next good thing."
            action={
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <ArrowUpDown
                  size={14}
                  className="hidden text-slate-400 sm:block"
                />
                <label className="sr-only" htmlFor="sort-products">
                  Sort products
                </label>
                <select
                  id="sort-products"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="select select-bordered select-sm h-10 min-h-10 rounded-full border-slate-200 bg-white pl-4 pr-9 text-xs font-semibold text-slate-600 focus:border-brand-blue focus:outline-none"
                >
                  <option value="featured">Sort: Featured</option>
                  <option value="price-low">Price: Low to high</option>
                  <option value="price-high">Price: High to low</option>
                  <option value="rating">Top rated</option>
                </select>
              </div>
            }
          />

          <div
            className="mb-6 flex gap-2 overflow-x-auto pb-2"
            role="group"
            aria-label="Filter by category"
          >
            {productCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                aria-pressed={activeCategory === category}
                className={`btn btn-sm min-h-10 shrink-0 rounded-full px-4 text-xs font-bold transition ${
                  activeCategory === category
                    ? "border-0 bg-brand-blue text-white hover:bg-brand-purple"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-brand-blue hover:bg-brand-pale hover:text-brand-blue"
                }`}
              >
                {category}
              </button>
            ))}
            {searchQuery && (
              <button
                type="button"
                onClick={clearFilters}
                className="btn btn-ghost btn-sm min-h-10 shrink-0 rounded-full px-3 text-xs text-brand-purple"
              >
                Clear search ×
              </button>
            )}
          </div>

          {searchQuery && (
            <p className="mb-5 text-sm text-slate-500" aria-live="polite">
              Showing results for{" "}
              <span className="font-bold text-ink">“{searchQuery}”</span>
            </p>
          )}

          <AnimatePresence mode="wait">
            {filteredProducts.length > 0 ? (
              <motion.div
                key={`${activeCategory}-${sortBy}-${searchQuery}`}
                layout
                className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:gap-5 lg:grid-cols-4"
              >
                {filteredProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={index}
                    onAddToCart={addToCart}
                    onToggleWishlist={toggleWishlist}
                    onQuickView={setQuickViewProduct}
                    isWishlisted={wishlist.some(
                      (item) => item.id === product.id,
                    )}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-2xl border border-dashed border-slate-200 py-16 text-center"
              >
                <p className="text-base font-bold text-ink">
                  No gadgets found just yet.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Try another search or take a look at everything.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn btn-primary mt-5 rounded-full border-0 bg-brand-blue text-white hover:bg-brand-purple"
                >
                  Show all products
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-9 flex justify-center">
            <button
              type="button"
              onClick={() => {
                clearFilters();
                document
                  .getElementById("products")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="btn btn-outline rounded-full border-slate-200 px-6 text-xs font-bold text-ink transition hover:border-brand-blue hover:bg-brand-blue hover:text-white"
            >
              View All Products <ArrowRight size={15} />
            </button>
          </div>
        </section>

        <section
          id="checkout-note"
          className="mx-auto max-w-[1440px] px-5 pb-16 sm:px-8 sm:pb-20 lg:px-12"
        >
          <Reveal className="grid gap-5 rounded-3xl border border-slate-100 bg-[#f8fafc] p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-blue shadow-sm">
                <ShieldCheck size={21} />
              </div>
              <div>
                <h2 className="font-display text-base font-extrabold text-ink">
                  A checkout that works for you
                </h2>
                <p className="mt-1.5 max-w-2xl text-xs leading-6 text-slate-500 sm:text-sm">
                  Cash on delivery is available. Online payments will be
                  enabled after a local gateway is configured.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <span className="rounded-md bg-white px-3 py-2 text-[11px] font-bold text-pink-600 shadow-sm">
                bKash
              </span>
              <span className="rounded-md bg-white px-3 py-2 text-[11px] font-bold text-emerald-700 shadow-sm">
                Nagad
              </span>
              <span className="rounded-md bg-white px-3 py-2 text-[11px] font-bold text-blue-700 shadow-sm">
                COD
              </span>
            </div>
          </Reveal>
          {checkoutOpen && (
            <CheckoutForm
              user={user}
              cart={cart}
              onCancel={() => setCheckoutOpen(false)}
              onPlaced={handleOrderPlaced}
            />
          )}
        </section>

        <section className="mx-auto max-w-[1440px] px-5 pb-16 sm:px-8 sm:pb-20 lg:px-12">
          <Newsletter />
        </section>
              </>
            }
          />
          <Route
            path="/shop"
            element={
              <ShopPage
                onAddToCart={addToCart}
                onToggleWishlist={toggleWishlist}
                onQuickView={setQuickViewProduct}
                wishlist={wishlist}
              />
            }
          />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountPage user={user} wishlistCount={wishlist.length} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-orders"
            element={
              <ProtectedRoute requiredRole="customer">
                <MyOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute requiredRole="customer">
                <WishlistPage
                  wishlist={wishlist}
                  onAddToCart={addToCart}
                  onToggleWishlist={toggleWishlist}
                  onQuickView={setQuickViewProduct}
                />
              </ProtectedRoute>
            }
          />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />

          <SidePanel
            key={`panel-${panel || "closed"}`}
            panel={panel}
            onClose={() => setPanel(null)}
            onOpenPanel={setPanel}
            onLoginSuccess={handleLoginSuccess}
            onCheckout={handleCheckout}
            cart={cart}
            wishlist={wishlist.map((product) => ({ product, quantity: 1 }))}
            onRemoveCartItem={(productId) =>
              setCart((current) =>
                current.filter((entry) => entry.product.id !== productId),
              )
            }
            onUpdateCartQuantity={updateCartQuantity}
            onRemoveWishlistItem={(productId) =>
              setWishlist((current) =>
                current.filter((product) => product.id !== productId),
              )
            }
            onAddToCart={addToCart}
          />
          <ProductDialog
            key={`product-${quickViewProduct?.id || "closed"}`}
            product={quickViewProduct}
            onClose={() => setQuickViewProduct(null)}
            onAddToCart={addToCart}
          />

          <ToastNotification message={toast} />
        </>
      )}
    </div>
  );
}
