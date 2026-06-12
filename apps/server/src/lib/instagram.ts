/**
 * Meta Graph API client for Instagram Business publishing.
 * Workers-compatible fetch wrapper.
 *
 * NO TOKEN LOGGING anywhere — page access tokens and long-lived tokens are secrets.
 */

export const IG_API_VERSION = "v25.0";
export const IG_GRAPH_API = `https://graph.facebook.com/${IG_API_VERSION}`;
export const IG_OAUTH_BASE = `https://graph.facebook.com/${IG_API_VERSION}/oauth/access_token`;

export interface InstagramApiConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export class InstagramApiError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly subcode?: string,
    public readonly type?: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "InstagramApiError";
  }
}

const DEFAULT_TIMEOUT_MS = 25_000;

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// --- helpers ---

async function parseError(response: Response): Promise<InstagramApiError> {
  let body: { error?: { code?: number; error_subcode?: string; message?: string; type?: string } };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    return new InstagramApiError(
      `HTTP ${response.status} ${response.statusText}`,
      response.status,
    );
  }
  const err = body.error;
  if (!err) {
    return new InstagramApiError(
      `HTTP ${response.status} ${response.statusText}`,
      response.status,
    );
  }
  return new InstagramApiError(
    err.message ?? `HTTP ${response.status}`,
    err.code,
    err.error_subcode,
    err.type,
    response.status,
  );
}

async function igFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetchWithTimeout(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw await parseError(response);
  }
  return response;
}

// ============================================================================
// Task 10: OAuth
// ============================================================================

export function getOAuthUrl(config: InstagramApiConfig): string {
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: [
      "instagram_business_basic",
      "instagram_business_content_publish",
      "pages_show_list",
      "business_management",
    ].join(","),
  });
  return `https://www.facebook.com/${IG_API_VERSION}/dialog/oauth?${params.toString()}`;
}

export interface ShortLivedToken {
  accessToken: string;
  expiresIn?: number;
}

export async function exchangeCodeForToken(
  code: string,
  config: InstagramApiConfig,
): Promise<ShortLivedToken> {
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    client_secret: config.appSecret,
    code,
  });
  const response = await igFetch(`${IG_OAUTH_BASE}?${params.toString()}`);
  const data = (await response.json()) as { access_token: string; expires_in?: number };
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string,
  config: InstagramApiConfig,
): Promise<ShortLivedToken> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: config.appId,
    client_secret: config.appSecret,
    fb_exchange_token: shortLivedToken,
  });
  const response = await igFetch(`${IG_OAUTH_BASE}?${params.toString()}`);
  const data = (await response.json()) as { access_token: string; expires_in?: number };
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

export interface FacebookPage {
  id: string;
  name: string;
  accessToken: string;
  igBusinessAccountId: string | null;
  igUsername: string | null;
}

interface RawFacebookPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
    username?: string;
  };
}

export async function getUserPages(longLivedToken: string): Promise<FacebookPage[]> {
  const params = new URLSearchParams({
    access_token: longLivedToken,
    fields: "id,name,access_token,instagram_business_account{id,username}",
  });
  const response = await igFetch(`${IG_GRAPH_API}/me/accounts?${params.toString()}`);
  const data = (await response.json()) as { data: RawFacebookPage[] };
  return data.data.map((p) => ({
    id: p.id,
    name: p.name,
    accessToken: p.access_token,
    igBusinessAccountId: p.instagram_business_account?.id ?? null,
    igUsername: p.instagram_business_account?.username ?? null,
  }));
}

// ============================================================================
// Task 11: Container creation
// ============================================================================

export async function createSingleImageContainer(
  igUserId: string,
  imageUrl: string,
  pageAccessToken: string,
  caption?: string,
  altText?: string,
): Promise<string> {
  const body: Record<string, string> = {
    image_url: imageUrl,
    access_token: pageAccessToken,
  };
  if (caption) body.caption = caption;
  if (altText) body.alt_text = altText;
  const response = await igFetch(`${IG_GRAPH_API}/${igUserId}/media`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as { id: string };
  return data.id;
}

export async function createCarouselChildContainer(
  igUserId: string,
  imageUrl: string,
  pageAccessToken: string,
): Promise<string> {
  const body = {
    image_url: imageUrl,
    is_carousel_item: "true",
    access_token: pageAccessToken,
  };
  const response = await igFetch(`${IG_GRAPH_API}/${igUserId}/media`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as { id: string };
  return data.id;
}

export async function createCarouselParentContainer(
  igUserId: string,
  children: string[],
  pageAccessToken: string,
  caption?: string,
): Promise<string> {
  const body: Record<string, string> = {
    media_type: "CAROUSEL",
    children: children.join(","),
    access_token: pageAccessToken,
  };
  if (caption) body.caption = caption;
  const response = await igFetch(`${IG_GRAPH_API}/${igUserId}/media`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as { id: string };
  return data.id;
}

// ============================================================================
// Task 12: Status / Polling / Publish
// ============================================================================

export interface ContainerStatus {
  statusCode: "IN_PROGRESS" | "FINISHED" | "ERROR" | "EXPIRED" | "PUBLISHED";
  statusMessage?: string;
}

export async function getContainerStatus(
  containerId: string,
  pageAccessToken: string,
): Promise<ContainerStatus> {
  const params = new URLSearchParams({
    fields: "status_code,status",
    access_token: pageAccessToken,
  });
  const response = await igFetch(`${IG_GRAPH_API}/${containerId}?${params.toString()}`);
  const data = (await response.json()) as { status_code?: string; status?: string };
  return {
    statusCode: (data.status_code as ContainerStatus["statusCode"]) ?? "ERROR",
    statusMessage: data.status,
  };
}

export interface PollResult {
  status: "FINISHED" | "ERROR" | "EXPIRED" | "PUBLISHED" | "TIMEOUT";
  message?: string;
}

export async function pollContainerStatus(
  containerId: string,
  pageAccessToken: string,
  maxAttempts = 25,
  initialDelayMs = 2000,
): Promise<PollResult> {
  let delay = initialDelayMs;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    const { statusCode, statusMessage } = await getContainerStatus(containerId, pageAccessToken);
    if (statusCode === "FINISHED" || statusCode === "PUBLISHED") {
      return { status: statusCode, message: statusMessage };
    }
    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      return { status: statusCode, message: statusMessage };
    }
    // IN_PROGRESS: continue with exponential backoff
    delay = Math.min(delay * 1.5, 25_000);
  }
  return { status: "TIMEOUT" };
}

export async function publishContainer(
  igUserId: string,
  creationId: string,
  pageAccessToken: string,
): Promise<string> {
  const body = {
    creation_id: creationId,
    access_token: pageAccessToken,
  };
  const response = await igFetch(`${IG_GRAPH_API}/${igUserId}/media_publish`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as { id: string };
  return data.id;
}

// ============================================================================
// Task 13: Quota
// ============================================================================

export interface QuotaInfo {
  quotaUsage: number;
  publishingLimit: number;
}

export async function getContentPublishingLimit(
  igUserId: string,
  pageAccessToken: string,
): Promise<QuotaInfo> {
  const params = new URLSearchParams({
    access_token: pageAccessToken,
  });
  try {
    const response = await igFetch(
      `${IG_GRAPH_API}/${igUserId}/content_publishing_limit?${params.toString()}`,
    );
    const data = (await response.json()) as {
      data?: Array<{ quota_usage?: number; publishing_limit?: number }>;
    };
    const first = data.data?.[0];
    if (first) {
      return {
        quotaUsage: first.quota_usage ?? 0,
        publishingLimit: first.publishing_limit ?? 25,
      };
    }
  } catch {
    // fall through to default
  }
  return { quotaUsage: 0, publishingLimit: 25 };
}
