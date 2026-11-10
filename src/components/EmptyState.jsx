import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";

export default function EmptyState({
  title = "Nothing to show just yet",
  description = "Try adjusting your filters or search for something else.",
  actionLabel = "Browse all products",
  actionTo = "/shop",
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
      <SearchX className="mx-auto text-brand-blue" size={30} />
      <h2 className="mt-4 text-lg font-bold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      <Link
        to={actionTo}
        className="btn btn-primary mt-5 rounded-full border-0 bg-brand-blue text-white hover:bg-brand-purple"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
