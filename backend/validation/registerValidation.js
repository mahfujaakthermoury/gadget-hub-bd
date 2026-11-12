const allowedFields = new Set([
  "name",
  "email",
  "password",
  "confirmPassword",
]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const minimumPasswordLength = 6;
const maximumPasswordLength = 128;

export function isValidEmail(email) {
  return email.length <= 254 && emailPattern.test(email);
}

export function getPasswordPolicyErrors(password, minimumLength = minimumPasswordLength) {
  const errors = [];
  const passwordLength = Array.from(password).length;

  if (passwordLength < minimumLength) {
    errors.push(`Password must be at least ${minimumLength} characters.`);
  }
  if (passwordLength > maximumPasswordLength) {
    errors.push(`Password must be ${maximumPasswordLength} characters or fewer.`);
  }
  if (!/[A-Z]/u.test(password)) {
    errors.push("Password must include an uppercase letter.");
  }
  if (!/[a-z]/u.test(password)) {
    errors.push("Password must include a lowercase letter.");
  }
  if (!/[0-9]/u.test(password)) {
    errors.push("Password must include a digit.");
  }
  if (!/[^A-Za-z0-9]/u.test(password)) {
    errors.push("Password must include a special character.");
  }

  return errors;
}

export function validateRegistration(body, { minimumPasswordLength = 6 } = {}) {
  const errors = {};

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      valid: false,
      errors: { request: "A registration object is required." },
    };
  }

  if (Object.keys(body).some((field) => !allowedFields.has(field))) {
    errors.request = "Only name, email, password and confirmPassword are allowed.";
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    errors.name = "Name is required.";
  } else if (name.length > 100) {
    errors.name = "Name must be 100 characters or fewer.";
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(email)) {
    errors.email = "A valid email address is required.";
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    errors.password = "Password is required.";
  } else {
    const passwordErrors = getPasswordPolicyErrors(password, minimumPasswordLength);
    if (passwordErrors.length > 0) {
      errors.password = passwordErrors.join(" ");
    }
  }

  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  if (!confirmPassword) {
    errors.confirmPassword = "Password confirmation is required.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      name,
      email,
      emailNormalized: email.toLowerCase(),
      password,
    },
  };
}
