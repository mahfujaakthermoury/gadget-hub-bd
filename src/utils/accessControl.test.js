import assert from "node:assert/strict";
import test from "node:test";
import { getAccessDecision } from "./accessControl.js";

test("protected routes wait for session restoration", () => {
  assert.equal(
    getAccessDecision({ status: "loading", user: null, requiredRole: "admin" }),
    "loading",
  );
});

test("service failures do not become guest or authenticated states", () => {
  assert.equal(
    getAccessDecision({
      status: "unavailable",
      user: null,
      requiredRole: "admin",
    }),
    "unavailable",
  );
});

test("guests must authenticate before protected pages", () => {
  assert.equal(
    getAccessDecision({
      status: "unauthenticated",
      user: null,
      requiredRole: "customer",
    }),
    "login",
  );
});

test("customers are forbidden from admin pages", () => {
  assert.equal(
    getAccessDecision({
      status: "authenticated",
      user: { role: "customer" },
      requiredRole: "admin",
    }),
    "forbidden",
  );
});

test("admins can access admin pages", () => {
  assert.equal(
    getAccessDecision({
      status: "authenticated",
      user: { role: "admin" },
      requiredRole: "admin",
    }),
    "allow",
  );
});
