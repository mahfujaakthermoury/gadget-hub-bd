import { isValidEmail } from "./registerValidation.js";

export function validateLogin(body) {
  const errors = {};

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      valid: false,
      errors: { request: "A login object is required." },
    };
  }

  if (Object.keys(body).some((field) => !["email", "password"].includes(field))) {
    errors.request = "Only email and password are allowed.";
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!isValidEmail(email)) {
    errors.email = "A valid email address is required.";
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    errors.password = "Password is required.";
  } else if (Array.from(password).length > 128) {
    errors.password = "Password must be 128 characters or fewer.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: { emailNormalized: email.toLowerCase(), password },
  };
}
