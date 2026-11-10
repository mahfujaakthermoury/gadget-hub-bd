import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getAccessDecision } from "../utils/accessControl.js";

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, status, error, refreshUser } = useAuth();
  const location = useLocation();
  const decision = getAccessDecision({ status, user, requiredRole });

  if (decision === "loading") {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-2xl items-center justify-center px-6">
        <p role="status" className="text-sm font-semibold text-slate-500">
          Checking your session...
        </p>
      </div>
    );
  }

  if (decision === "unavailable") {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-2xl font-extrabold text-ink">
          Account service unavailable
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {error || "Your session could not be verified. Please try again."}
        </p>
        <button
          type="button"
          onClick={() => void refreshUser()}
          className="btn btn-primary mt-6 rounded-full border-0 bg-brand-blue text-white hover:bg-brand-purple"
        >
          Retry
        </button>
      </div>
    );
  }

  if (decision === "login") {
    return (
      <Navigate
        to="/"
        replace
        state={{
          authRequired: true,
          returnTo: `${location.pathname}${location.search}`,
        }}
      />
    );
  }

  if (decision === "forbidden") {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
