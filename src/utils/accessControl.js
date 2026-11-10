export function getAccessDecision({ status, user, requiredRole }) {
  if (status === "loading") return "loading";
  if (status === "unavailable") return "unavailable";
  if (status !== "authenticated" || !user) return "login";
  if (requiredRole && user.role !== requiredRole) return "forbidden";
  return "allow";
}
