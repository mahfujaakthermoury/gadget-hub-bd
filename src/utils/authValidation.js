const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function getRegistrationError(details) {
  const name = typeof details.name === "string" ? details.name.trim() : "";
  const email = typeof details.email === "string" ? details.email.trim() : "";
  const password = typeof details.password === "string" ? details.password : "";
  const confirmPassword =
    typeof details.confirmPassword === "string"
      ? details.confirmPassword
      : "";

  if (!name) return "Full name is required.";
  if (name.length > 100) return "Full name must be 100 characters or fewer.";
  if (!email || email.length > 254 || !emailPattern.test(email)) {
    return "Enter a valid email address.";
  }
  if (Array.from(password).length < 6) {
    return "Password must be at least 6 characters.";
  }
  if (Array.from(password).length > 128) {
    return "Password must be 128 characters or fewer.";
  }
  if (!/[A-Z]/u.test(password)) {
    return "Password must include an uppercase letter.";
  }
  if (!/[a-z]/u.test(password)) {
    return "Password must include a lowercase letter.";
  }
  if (!/[0-9]/u.test(password)) {
    return "Password must include a digit.";
  }
  if (!/[^A-Za-z0-9]/u.test(password)) {
    return "Password must include a special character.";
  }
  if (!confirmPassword) return "Please confirm your password.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return "";
}

export function getLoginError(details) {
  const email = typeof details.email === "string" ? details.email.trim() : "";
  const password = typeof details.password === "string" ? details.password : "";

  if (!email || email.length > 254 || !emailPattern.test(email)) {
    return "Enter a valid email address.";
  }
  if (!password) return "Password is required.";
  if (Array.from(password).length > 128) {
    return "Password must be 128 characters or fewer.";
  }
  return "";
}
