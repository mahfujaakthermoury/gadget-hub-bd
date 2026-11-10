import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";

const issuer = "gadget-hub";
const audience = "gadget-hub-web";
const durationMultipliers = Object.freeze({
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
});

export class JwtConfigurationError extends Error {}

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new JwtConfigurationError(
      "JWT_SECRET must contain at least 32 bytes.",
    );
  }
  return secret;
}

export function getJwtExpirationSeconds() {
  const configured = process.env.JWT_EXPIRES_IN;
  if (!configured) {
    throw new JwtConfigurationError("JWT_EXPIRES_IN is required.");
  }

  const match = /^([1-9]\d*)(s|m|h|d)$/iu.exec(configured);
  if (!match) {
    throw new JwtConfigurationError(
      "JWT_EXPIRES_IN must be a positive duration such as 30m, 1h, or 1d.",
    );
  }

  const seconds = Number(match[1]) * durationMultipliers[match[2].toLowerCase()];
  if (!Number.isSafeInteger(seconds)) {
    throw new JwtConfigurationError("JWT_EXPIRES_IN is out of range.");
  }
  return seconds;
}

export function createAuthToken(userId) {
  const secret = getSecret();
  const expiresInSeconds = getJwtExpirationSeconds();
  const issuedAt = Math.floor(Date.now() / 1000);
  const jti = randomUUID();
  const token = jwt.sign(
    { iat: issuedAt },
    secret,
    {
      algorithm: "HS256",
      issuer,
      audience,
      subject: userId.toString(),
      jwtid: jti,
      expiresIn: expiresInSeconds,
    },
  );

  return {
    token,
    jti,
    createdAt: new Date(issuedAt * 1000),
    expiresAt: new Date((issuedAt + expiresInSeconds) * 1000),
  };
}

export function verifyAuthToken(token) {
  const claims = jwt.verify(token, getSecret(), {
    algorithms: ["HS256"],
    issuer,
    audience,
  });

  if (!claims || typeof claims !== "object") {
    throw new jwt.JsonWebTokenError("Invalid token payload.");
  }
  return claims;
}
