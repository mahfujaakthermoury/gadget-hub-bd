const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/u, "");

export async function customerOrderRequest(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/api/${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Unable to reach the order service. Please try again.");
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The order service returned an invalid response.");
  }
  if (!response.ok) {
    throw new Error(
      result.error || result.message || "The order request could not be completed.",
    );
  }
  return result;
}
