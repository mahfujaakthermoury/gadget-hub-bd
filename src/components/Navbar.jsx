import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Heart,
  LogOut,
  Menu,
  Moon,
  Search,
  ShoppingBag,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";
import { formatPrice } from "../data/products.js";

const links = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Categories", href: "/categories" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar({
  cartCount,
  wishlistCount,
  onOpenPanel,
  onSearch,
  activePath,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, status, logout } = useAuth();
  const { theme, toggleTheme, storeSettings } = useTheme();
  const freeShippingThreshold = storeSettings?.shipping?.freeShippingThreshold ?? 5000;
  const currentPath = activePath || location.pathname;

  const submitSearch = (event) => {
    event.preventDefault();
    onSearch(searchValue);
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setMenuOpen(false);
    try {
      await logout();
      window.alert("You have been logged out.");
    } catch (error) {
      window.alert(
        error.message ||
        "Your local session was cleared, but the server could not confirm logout.",
      );
    } finally {
      setIsLoggingOut(false);
      navigate("/");
    }
  };

  const profileLinks =
    user?.role === "admin"
      ? [
        { label: "Admin Dashboard", href: "/admin" },
        { label: "Account", href: "/account" },
      ]
      : [
        { label: "Account", href: "/account" },
        { label: "My Orders", href: "/my-orders" },
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 shadow-[0_3px_20px_rgba(20,37,61,0.04)] backdrop-blur-xl">
      <div className="bg-brand-gradient text-center text-[11px] font-semibold tracking-wide text-white sm:text-xs">
        <p className="px-3 py-2">
          A little something for your next big idea — free delivery on orders
          over {formatPrice(freeShippingThreshold)}
        </p>
      </div>
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="flex h-[76px] items-center justify-between gap-4">
          <Link
            to="/"
            className="flex shrink-0 items-center"
            aria-label="Gadget Hub home"
          >
            <img
              src={storeSettings?.general?.websiteLogo || "/gadget-hub-logo.jpeg"}
              alt={`${storeSettings?.general?.websiteName || "Gadget Hub"} logo`}
              className="h-10 w-[138px] object-contain sm:h-12 sm:w-[166px]"
            />
          </Link>

          <nav className="hidden items-center gap-6 xl:flex" aria-label="Main">
            {links.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                aria-current={currentPath === link.href ? "page" : undefined}
                className={`nav-link text-[13px] font-semibold transition-colors hover:text-brand-blue ${currentPath === link.href
                    ? "text-brand-blue"
                    : "text-slate-600"
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <form
            onSubmit={submitSearch}
            className="hidden min-w-48 max-w-[280px] flex-1 lg:flex xl:max-w-[320px]"
            role="search"
          >
            <label className="input input-bordered flex h-11 w-full items-center gap-2 rounded-full border-slate-200 bg-slate-50 px-4 focus-within:border-brand-blue focus-within:outline-none">
              <Search size={17} className="shrink-0 text-slate-400" />
              <input
                type="search"
                placeholder="Search gadgets..."
                className="grow text-xs"
                aria-label="Search products"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
              />
              <button
                type="submit"
                className="text-[11px] font-semibold text-brand-blue transition-colors hover:text-brand-purple"
              >
                Search
              </button>
            </label>
          </form>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="btn btn-ghost btn-circle btn-sm text-slate-600 transition hover:text-brand-blue"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              title="Toggle light and dark mode"
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              type="button"
              onClick={() => onOpenPanel("wishlist")}
              className="btn btn-ghost btn-circle btn-sm relative text-slate-600 transition hover:scale-105 hover:text-brand-purple"
              aria-label={`Open wishlist, ${wishlistCount} items`}
            >
              <Heart size={20} />
              {wishlistCount > 0 && (
                <span className="badge badge-sm absolute -right-1 -top-1 h-[18px] min-h-0 min-w-[18px] border-0 bg-brand-purple px-1 text-[10px] text-white">
                  {wishlistCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onOpenPanel("cart")}
              className="btn btn-ghost btn-circle btn-sm relative text-slate-600 transition hover:scale-105 hover:text-brand-blue"
              aria-label={`Open shopping bag, ${cartCount} items`}
            >
              <ShoppingBag size={20} />
              <span className="badge badge-sm absolute -right-1 -top-1 h-[18px] min-h-0 min-w-[18px] border-0 bg-brand-blue px-1 text-[10px] text-white">
                {cartCount}
              </span>
            </button>
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            {status === "loading" ? (
              <span
                role="status"
                aria-label="Checking account"
                className="hidden h-9 w-20 animate-pulse rounded-full bg-slate-100 sm:block"
              />
            ) : user ? (
              <div className="dropdown dropdown-end hidden sm:block">
                <button
                  type="button"
                  tabIndex={0}
                  className="btn btn-ghost btn-sm max-w-40 gap-2 rounded-full px-3 text-xs font-semibold text-slate-700"
                  aria-label="Open account menu"
                >
                  <UserRound size={17} />
                  <span className="truncate">{user.name}</span>
                </button>
                <ul
                  tabIndex={0}
                  className="menu dropdown-content z-50 mt-2 w-52 rounded-2xl border border-slate-100 bg-white p-2 shadow-soft"
                >
                  {profileLinks.map((link) => (
                    <li key={link.href}>
                      <Link to={link.href}>{link.label}</Link>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                    >
                      <LogOut size={15} />
                      {isLoggingOut ? "Signing out..." : "Log out"}
                    </button>
                  </li>
                </ul>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onOpenPanel("signin")}
                  className="btn btn-ghost btn-sm hidden gap-2 rounded-full px-3 text-xs font-semibold text-slate-700 sm:flex"
                >
                  <UserRound size={17} />
                  <span>Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenPanel("signup")}
                  className="btn btn-primary btn-sm hidden rounded-full border-0 bg-brand-blue px-4 text-xs text-white shadow-none hover:bg-brand-purple md:inline-flex"
                >
                  Register
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="btn btn-ghost btn-circle btn-sm xl:hidden"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.22 }}
              className="overflow-hidden xl:hidden"
            >
              <form onSubmit={submitSearch} className="mb-3 lg:hidden">
                <label className="input input-bordered flex h-11 items-center gap-2 rounded-xl border-slate-200 bg-slate-50">
                  <Search size={17} className="text-slate-400" />
                  <input
                    type="search"
                    placeholder="Search gadgets..."
                    aria-label="Search products"
                    className="grow text-sm"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                  />
                </label>
              </form>
              <nav
                aria-label="Mobile"
                className="grid gap-1 border-t border-slate-100 py-3"
              >
                {links.map((link) => (
                  <Link
                    key={link.label}
                    to={link.href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={currentPath === link.href ? "page" : undefined}
                    className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition hover:bg-brand-pale hover:text-brand-blue ${currentPath === link.href
                        ? "bg-brand-pale text-brand-blue"
                        : "text-slate-700"
                      }`}
                  >
                    {link.label}
                  </Link>
                ))}
                {user ? (
                  <>
                    {profileLinks.map((link) => (
                      <Link
                        key={link.href}
                        to={link.href}
                        onClick={() => setMenuOpen(false)}
                        className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-brand-pale hover:text-brand-blue"
                      >
                        {link.label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-brand-pale hover:text-brand-blue"
                    >
                      <LogOut size={17} />
                      {isLoggingOut ? "Signing out..." : "Log out"}
                    </button>
                  </>
                ) : status === "loading" ? (
                  <p role="status" className="px-3 py-2 text-sm text-slate-400">
                    Checking account...
                  </p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenPanel("signin");
                      }}
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-brand-pale hover:text-brand-blue sm:hidden"
                    >
                      <UserRound size={17} />
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenPanel("signup");
                      }}
                      className="btn btn-primary mt-2 rounded-full border-0 bg-brand-blue text-white hover:bg-brand-purple sm:hidden"
                    >
                      Register
                    </button>
                  </>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
