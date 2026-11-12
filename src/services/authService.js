const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/u, "");

export class AuthServiceError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "AuthServiceError";
    this.status = status;
  }
}

async function authRequest(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/api/auth${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new AuthServiceError(
      `The account API at ${apiBaseUrl} is unreachable. Start the backend server and confirm VITE_API_BASE_URL.`,
    );
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new AuthServiceError(
      "The account service returned an invalid response.",
      response.status,
    );
  }

  if (!response.ok) {
    const validationMessage = result.errors
      ? Object.values(result.errors).flat().join(" ")
      : "";
    throw new AuthServiceError(
      validationMessage ||
        (typeof result.message === "string"
          ? result.message
          : "The account request could not be completed."),
      response.status,
    );
  }
  return result;
}

export function registerUser(details) {
  return authRequest("/register", { method: "POST", body: details });
}

export function loginUser(details) {
  return authRequest("/login", { method: "POST", body: details });
}

export async function getCurrentUser() {
  const result = await authRequest("/me");
  return result.user;
}

export function logoutUser() {
  return authRequest("/logout", { method: "POST" });
}
