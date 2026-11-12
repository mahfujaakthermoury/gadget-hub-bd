const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/u, "");

export async function adminRequest(path, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/api/admin/${path}`, {
      method,
      credentials: "include",
      signal,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("Unable to reach the admin API. Check the backend server.");
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The admin API returned an invalid response.");
  }
  if (!response.ok) {
    throw new Error(result.error || result.message || "The admin request failed.");
  }
  return result;
}

export function getAdminOverview({ from, to, signal } = {}) {
  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  const suffix = query.size ? `?${query}` : "";
  return adminRequest(`analytics/overview${suffix}`, { signal });
}

export function getAdminInventory({ search, category, status, page, limit = 20, signal }) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) query.set("search", search);
  if (category) query.set("category", category);
  if (status && status !== "all") query.set("status", status);
  return adminRequest(`inventory?${query}`, { signal });
}

export function updateInventoryStock(productId, adjustment) {
  return adminRequest(`inventory/${encodeURIComponent(productId)}/adjustments`, {
    method: "POST",
    body: adjustment,
  });
}

export function getInventoryAdjustments({ page = 1, signal } = {}) {
  return adminRequest(`inventory/adjustments?page=${page}&limit=20`, { signal });
}

export function getAdminCategories({ signal } = {}) {
  return adminRequest("categories?limit=100", { signal });
}
