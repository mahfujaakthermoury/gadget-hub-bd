const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/u, "");

async function readResponse(response) {
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The settings service returned an invalid response.");
  }
  if (!response.ok) {
    throw new Error(result.error || result.message || "The settings request could not be completed.");
  }
  return result;
}

export async function getPublicSettings({ forceRefresh = false } = {}) {
  const response = await fetch(`${apiBaseUrl}/api/settings/public`, {
    cache: forceRefresh ? "no-store" : "default",
  });
  return (await readResponse(response)).data;
}

export async function adminSettingsRequest(path = "", { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/api/admin/settings${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Unable to reach the admin settings service.");
  }
  return readResponse(response);
}
