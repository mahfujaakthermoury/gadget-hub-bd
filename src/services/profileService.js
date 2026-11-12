const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/u, "");

export class ProfileServiceError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ProfileServiceError";
    this.status = status;
  }
}

async function profileRequest(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/api/profile${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ProfileServiceError("Unable to reach the profile service.");
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new ProfileServiceError("The profile service returned an invalid response.", response.status);
  }
  if (!response.ok) {
    throw new ProfileServiceError(
      result.error || result.message || "The profile request could not be completed.",
      response.status,
    );
  }
  return result;
}

export async function getProfile() {
  return (await profileRequest("/")).data;
}

export async function updateProfile(details) {
  return (await profileRequest("/", { method: "PATCH", body: details })).data;
}

export function updateProfilePassword(details) {
  return profileRequest("/password", { method: "POST", body: details });
}

export async function uploadProfileAvatar(file) {
  const form = new FormData();
  form.append("image", file);
  let response;
  try {
    response = await fetch(`${apiBaseUrl}/api/profile/avatar`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
  } catch {
    throw new ProfileServiceError("Unable to reach the profile image service.");
  }
  const result = await response.json();
  if (!response.ok) {
    throw new ProfileServiceError(result.error || "The profile image could not be uploaded.", response.status);
  }
  return result.data;
}
