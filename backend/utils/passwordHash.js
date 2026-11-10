import argon2 from "argon2";

export const argon2idOptions = Object.freeze({
  type: argon2.argon2id,
  memoryCost: 19 * 1024,
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
});

export function hashPassword(password) {
  return argon2.hash(password, argon2idOptions);
}

export function verifyPassword(passwordHash, password) {
  return argon2.verify(passwordHash, password);
}
