import { hash, verify } from "@node-rs/argon2";

// The binding defaults to Argon2id.
const options = { memoryCost: 19456, timeCost: 2, parallelism: 1 };
const common = new Set([
  "1234567890", "12345678910", "password123", "password1234", "password123!", "qwerty12345",
  "qwertyuiop", "admin123456", "letmein123", "iloveyou123", "changeme123",
]);

export function passwordError(password: string) {
  if (password.length < 10) return "Use at least 10 characters for your password.";
  if (password.length > 1024) return "Use at most 1024 characters for your password.";
  if (common.has(password.trim().toLowerCase())) return "Choose a less common password.";
  return null;
}

export const hashPassword = (password: string) => hash(password, options);
export const verifyPassword = (password: string, encoded: string) =>
  password.length <= 1024 ? verify(encoded, password).catch(() => false) : Promise.resolve(false);
