export const authCookieName = "gadget_hub_session";

function getBaseCookieOptions() {
  const sameSite = (process.env.AUTH_COOKIE_SAME_SITE || "lax").toLowerCase();
  if (!["lax", "strict", "none"].includes(sameSite)) {
    throw new Error("AUTH_COOKIE_SAME_SITE must be lax, strict, or none.");
  }

  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" || sameSite === "none",
    sameSite,
    path: "/",
  };
}

export function getAuthCookieOptions(expiresAt) {
  const maxAge = expiresAt.getTime() - Date.now();
  if (!Number.isFinite(maxAge) || maxAge <= 0) {
    throw new Error("Authentication cookie expiry must be in the future.");
  }
  return { ...getBaseCookieOptions(), maxAge };
}

export function getAuthCookieClearOptions() {
  return getBaseCookieOptions();
}
