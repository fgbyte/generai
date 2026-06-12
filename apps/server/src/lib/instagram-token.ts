/**
 * Centralized token encryption wrapper for Instagram account tokens.
 * Provides a single chokepoint for audit logging and future KMS integration.
 *
 * NEVER log tokens, IVs, or keys.
 */

import { encryptToken, decryptToken } from "./crypto";
import { getProcessingPublishLogForAccount } from "@generai/db/queries/instagram-publish-log";

/**
 * Encrypt a plaintext page access token for storage in the database.
 * Returns the IV-prefixed ciphertext string (format: `<iv_b64>:<ct_b64>`).
 */
export const encryptAccountToken = async (plaintext: string): Promise<string> => {
  return encryptToken(plaintext);
};

/**
 * Decrypt an encrypted page access token previously stored in the database.
 * @throws Error("Invalid token format") if the encrypted string is malformed
 */
export const decryptAccountToken = async (encrypted: string): Promise<string> => {
  return decryptToken(encrypted);
};

/**
 * Recursively walks an object, replacing any field whose name matches a
 * sensitive pattern (token, access_token, page_access_token, secret) with
 * the literal string "[REDACTED]". Used for error logging.
 */
const SENSITIVE_KEY_RE = /token|access_token|page_access_token|secret/i;

export function sanitizeForLog<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeForLog(v)) as unknown as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_RE.test(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = sanitizeForLog(v);
      }
    }
    return out as unknown as T;
  }
  return value;
}

// ============================================================================
// Task 23: Concurrent publish guard
// ============================================================================

export class ConcurrentPublishError extends Error {
  constructor(public readonly publishLogId: string) {
    super("Another publish is in progress for this account");
    this.name = "ConcurrentPublishError";
  }
}

export async function assertNoConcurrentPublish(accountId: string): Promise<void> {
  const log = await getProcessingPublishLogForAccount(accountId);
  if (log) {
    throw new ConcurrentPublishError(log.id);
  }
}
