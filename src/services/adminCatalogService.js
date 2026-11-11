const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/u, "");

export class AdminCatalogError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "AdminCatalogError";
    this.status = status;
  }
}

export async function adminCatalogRequest(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/api/admin/${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AdminCatalogError("Unable to reach the catalog service.");
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new AdminCatalogError("The catalog service returned an invalid response.", response.status);
  }
  if (!response.ok) {
    throw new AdminCatalogError(
      result.error || result.message || "The catalog request could not be completed.",
      response.status,
    );
  }
  return result;
}
