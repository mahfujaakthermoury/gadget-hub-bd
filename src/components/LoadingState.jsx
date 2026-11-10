export default function LoadingState({ label = "Loading..." }) {
  return (
    <div
      className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500"
      role="status"
    >
      <span className="loading loading-spinner loading-sm text-brand-blue" />
      {label}
    </div>
  );
}
