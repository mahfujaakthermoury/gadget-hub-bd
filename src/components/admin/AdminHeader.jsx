import { ChevronRight, LogOut, Menu, Store, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const sectionTitles = {
  "/admin": "Overview",
  "/admin/products": "Products",
  "/admin/categories": "Categories",
  "/admin/orders": "Orders",
  "/admin/customers": "Customers",
  "/admin/inventory": "Inventory",
  "/admin/analytics": "Analytics",
  "/admin/settings": "Settings",
};

export default function AdminHeader({
  user,
  onMenuClick,
  onLogout,
  isLoggingOut,
}) {
  const location = useLocation();
  const title = sectionTitles[location.pathname] || "Overview";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex min-h-[72px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="btn btn-ghost btn-circle btn-sm lg:hidden"
            aria-label="Open admin navigation"
            aria-controls="admin-sidebar"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <div className="mb-1 hidden items-center gap-1 text-xs text-slate-400 sm:flex">
              <span>Admin</span>
              <ChevronRight size={13} />
              <span className="text-slate-600">{title}</span>
            </div>
            <h1 className="truncate font-display text-lg font-extrabold text-ink sm:text-xl">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className="btn btn-ghost btn-sm hidden gap-2 rounded-full text-xs font-semibold text-slate-600 sm:inline-flex"
          >
            <Store size={16} />
            View storefront
          </Link>
          <div className="dropdown dropdown-end">
            <button
              type="button"
              tabIndex={0}
              className="btn btn-ghost btn-sm max-w-48 gap-2 rounded-full px-2 sm:px-3"
              aria-label="Open admin profile menu"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-pale text-brand-blue">
                <UserRound size={17} />
              </span>
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block truncate text-xs font-bold text-ink">
                  {user.name}
                </span>
                <span className="block text-[10px] font-medium capitalize text-slate-400">
                  {user.role}
                </span>
              </span>
            </button>
            <ul
              tabIndex={0}
              className="menu dropdown-content z-40 mt-2 w-52 rounded-2xl border border-slate-100 bg-white p-2 shadow-soft"
            >
              <li>
                <Link to="/account">My account</Link>
              </li>
              <li>
                <Link to="/">View storefront</Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={onLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut size={15} />
                  {isLoggingOut ? "Signing out..." : "Log out"}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
}
