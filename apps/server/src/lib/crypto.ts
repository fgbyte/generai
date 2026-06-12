/**
 * AES-GCM 256-bit token encryption utility.
 * Cloudflare Workers-compatible (uses Web Crypto API only).
 *
 * Key format: META_TOKEN_ENCRYPTION_KEY env var = 32 bytes, base64-encoded.
 *   Generate: openssl rand -base64 32
 *
 * Ciphertext format: `<iv_base64>:<ciphertext_base64>` — both base64-encoded,
 *   IV (12 bytes) + AES-GCM output. Concatenated with `:` separator.
 *
 * NEVER log the key, IV, or plaintext tokens.
 */

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit IV is the standard for AES-GCM

/**
 * Import the encryption key from the META_TOKEN_ENCRYPTION_KEY env var.
 * @throws if env var is missing or not valid base64-encoded 32 bytes
 */
export async function getEncryptionKey(): Promise<CryptoKey> {
  const raw =
    (typeof process !== "undefined" ? process.env?.META_TOKEN_ENCRYPTION_KEY : undefined) ??
    (globalThis as any).META_TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("META_TOKEN_ENCRYPTION_KEY env var is required");
  }

  let keyBytes: Uint8Array;
  try {
    keyBytes = base64ToBytes(raw);
  } catch {
    throw new Error("META_TOKEN_ENCRYPTION_KEY is not valid base64");
  }

  if (keyBytes.length !== 32) {
    throw new Error(
      `META_TOKEN_ENCRYPTION_KEY must decode to 32 bytes (got ${keyBytes.length})`,
    );
  }

  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: ALGORITHM, length: KEY_LENGTH },
    false, // not extractable
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt a plaintext token with the configured key.
 * Returns: `<iv_base64>:<ciphertext_base64>`.
 * Each call uses a fresh random 12-byte IV.
 */
export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoded,
  );
  return `${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(ciphertext))}`;
}

/**
 * Decrypt a token previously encrypted with `encryptToken`.
 * @throws Error("Invalid token format") if format is wrong
 * @throws if the ciphertext is tampered (AES-GCM auth tag mismatch)
 */
export async function decryptToken(encrypted: string): Promise<string> {
  const parts = encrypted.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid token format");
  }
  const [ivB64, ctB64] = parts;
  if (!ivB64 || !ctB64) {
    throw new Error("Invalid token format");
  }

  let iv: Uint8Array;
  let ciphertext: Uint8Array;
  try {
    iv = base64ToBytes(ivB64);
    ciphertext = base64ToBytes(ctB64);
  } catch {
    throw new Error("Invalid token format");
  }

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid token format");
  }

  const key = await getEncryptionKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(plaintext);
}

// --- internal base64 helpers (Workers-safe) ---

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  // btoa is available in Workers runtime and modern Node
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
