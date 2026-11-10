import assert from "node:assert/strict";
import test from "node:test";
import { getLoginError, getRegistrationError } from "./authValidation.js";

const validRegistration = {
  name: "Alex Rahman",
  email: "alex@example.com",
  password: "Example-password-8",
  confirmPassword: "Example-password-8",
};

test("accepts a registration password that meets all policy requirements", () => {
  assert.equal(getRegistrationError(validRegistration), "");
});

test("rejects each missing password composition requirement", () => {
  for (const password of [
    "example-password-8",
    "EXAMPLE-PASSWORD-8!",
    "Example-password!",
    "Examplepassword8",
    "Aa1!a",
  ]) {
    assert.match(
      getRegistrationError({
        ...validRegistration,
        password,
        confirmPassword: password,
      }),
      /Password/u,
    );
  }
});

test("rejects a password confirmation mismatch", () => {
  assert.equal(
    getRegistrationError({
      ...validRegistration,
      confirmPassword: "Different-password-9",
    }),
    "Passwords do not match.",
  );
});

test("rejects empty login fields", () => {
  assert.equal(getLoginError({ email: "", password: "" }), "Enter a valid email address.");
});
