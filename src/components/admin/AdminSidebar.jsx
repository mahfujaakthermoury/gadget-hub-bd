import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Tags,
  UsersRound,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navigation = [
  { label: "Overview", path: "/admin", icon: LayoutDashboard, end: true },
  { label: "Products", path: "/admin/products", icon: Package },
  { label: "Categories", path: "/admin/categories", icon: Tags },
  { label: "Orders", path: "/admin/orders", icon: ShoppingCart },
  { label: "Customers", path: "/admin/customers", icon: UsersRound },
  { label: "Inventory", path: "/admin/inventory", icon: Boxes },
  { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

function NavigationLinks({ onNavigate }) {
  return (
    <nav aria-label="Admin navigation" className="space-y-1">
      {navigation.map(({ label, path, icon: Icon, end }) => (
        <NavLink
          key={path}
          to={path}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              isActive
                ? "bg-brand-blue text-white shadow-sm"
                : "text-slate-600 hover:bg-brand-pale hover:text-brand-blue"
            }`
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AdminSidebar({ mobileOpen, onClose }) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close admin navigation"
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        id="admin-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white px-5 py-5 transition-transform lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:w-64 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        aria-label="Admin sidebar"
      >
        <div className="mb-9 flex items-center justify-between">
          <NavLink
            to="/admin"
            className="flex items-center gap-3"
            aria-label="Gadget Hub admin overview"
            onClick={onClose}
          >
            <img
              src="/gadget-hub-logo.jpeg"
              alt=""
              className="h-10 w-36 object-contain object-left"
            />
          </NavLink>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm lg:hidden"
            aria-label="Close navigation"
          >
            <X size={19} />
          </button>
        </div>
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          Workspace
        </p>
        <NavigationLinks onNavigate={onClose} />
        <div className="mt-auto rounded-2xl bg-brand-pale p-4">
          <p className="text-xs font-bold text-ink">Gadget Hub</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Administration workspace
          </p>
        </div>
      </aside>
    </>
  );
}
