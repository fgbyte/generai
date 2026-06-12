# GenerAI Instagram API Reference

> **Note**: This feature uses real Meta Graph API v25.0 to publish to Instagram Business/Creator accounts. Endpoints below match `apps/server/src/routes/instagram.routes.ts`.

## Base URL

```
http://localhost:3000   # Local dev
https://your-server.workers.dev   # Production
```

## Authentication

All protected endpoints require a session cookie from Better Auth.

**Login flow:**

1. POST to `/api/auth/sign-in/email` with email/password
2. Session cookie (`better-auth.session_token`) is set automatically
3. Include cookie in subsequent requests

**Required Meta env vars** (server-side):

- `META_APP_ID` — Facebook App ID
- `META_APP_SECRET` — Facebook App Secret
- `META_REDIRECT_URI` — OAuth callback (e.g. `http://localhost:3000/api/instagram/callback`)
- `META_GRAPH_URL` — defaults to `https://graph.facebook.com/v25.0`
- `META_TOKEN_ENCRYPTION_KEY` — 32-byte base64 key (AES-GCM)
- `R2_BUCKET_NAME`, `R2_PUBLIC_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` — Cloudflare R2 for media storage

---

## Endpoints

### POST /api/instagram/upload

Upload an image to Cloudflare R2 (auth required, max 8MB, JPEG/PNG only).

**Request** (multipart/form-data):

```
file: <binary image data>            # required, image/jpeg or image/png
filename: "my-image.jpg"             # optional, hint
```

**Response 200:**

```json
{
  "key": "uploads/uuid/uuid-here.jpg",
  "publicUrl": "https://test-bucket.r2.dev/uploads/uuid/uuid-here.jpg"
}
```

**Error responses:**

- `400` — Missing file field, unsupported type, or invalid magic bytes
- `413` — File too large (max 8MB)
- `500` — Media bucket not configured

---

### GET /api/instagram/auth-url

Generate a Meta OAuth authorization URL (auth required).

**Response 200:**

```json
{
  "url": "https://www.facebook.com/v25.0/dialog/oauth?client_id=...&redirect_uri=...&state=csrf&scope=instagram_business_basic%2Cinstagram_business_content_publish%2Cpages_show_list%2Cbusiness_management"
}
```

The `state` parameter is a CSRF token (valid for 10 minutes) — the client MUST echo it back in the callback.

**Error responses:**

- `500` — META_APP_ID / META_APP_SECRET / META_REDIRECT_URI not set

---

### GET /api/instagram/callback

OAuth callback from Meta (auth required, but invoked via browser redirect from Meta).

**Query params:**

```
code: string     # required, from Meta
state: string    # required, must match the state from /auth-url
```

**Response 200** (new connection):

```json
{
  "message": "Instagram account connected",
  "account": {
    "id": "uuid",
    "igUserId": "17841234567890",
    "igUsername": "test_ig_account",
    "fbPageName": "Test Page"
  }
}
```

**Response 200** (reconnection):

```json
{
  "message": "Instagram account reconnected",
  "account": { "id": "uuid", "igUserId": "...", "igUsername": "...", "fbPageName": "..." }
}
```

**Error responses:**

- `400` — Missing `code`, no Instagram Business account on user's pages
- `401` — State token mismatch or expired
- `502` — Meta token exchange failed
- `500` — Server error

---

### GET /api/instagram/accounts

List the authenticated user's connected Instagram account (auth required). Returns at most 1 account (multi-tenant: 1 IG per user).

**Response 200:**

```json
{
  "accounts": [
    {
      "id": "uuid",
      "userId": "uuid",
      "igUserId": "17841234567890",
      "igUsername": "test_ig_account",
      "fbPageId": "1234567890",
      "fbPageName": "Test Page",
      "tokenExpiresAt": "2026-08-10T10:00:00Z",
      "lastQuotaCheck": null,
      "createdAt": "2026-06-12T10:00:00Z"
    }
  ]
}
```

> **Security**: The `pageAccessToken` field is **never** included in the response (it is stripped server-side and stored encrypted at rest with AES-GCM).

If no account is connected: `{ "accounts": [] }`.

---

### DELETE /api/instagram/accounts/:id

Disconnect an Instagram account (auth required, user must own the account).

**URL params:**

```
id: string   # the account UUID from /api/instagram/accounts
```

**Response 200:**

```json
{ "success": true }
```

**Error responses:**

- `400` — Missing `id` parameter
- `403` — Account belongs to another user
- `404` — Account not found

---

### POST /api/instagram/publish

Publish a post (single image or carousel) to Instagram (auth required).

**Request (single image):**

```json
{
  "mediaType": "single_image",
  "accountId": "uuid",
  "imageUrl": "https://test-bucket.r2.dev/uploads/uuid/uuid-here.jpg",
  "caption": "Hello from Postman! 🚀 #test",
  "altText": "A landscape photo"
}
```

**Request (carousel, 2-10 images):**

```json
{
  "mediaType": "carousel",
  "accountId": "uuid",
  "imageUrls": [
    "https://test-bucket.r2.dev/uploads/uuid/img1.jpg",
    "https://test-bucket.r2.dev/uploads/uuid/img2.jpg",
    "https://test-bucket.r2.dev/uploads/uuid/img3.jpg"
  ],
  "caption": "Carousel test"
}
```

**Validation:**

- `imageUrl` / `imageUrls` must be valid URLs
- `caption` max 2200 characters
- `altText` max 100 characters (single_image only)
- Carousel: 2-10 images

**Response 200:**

```json
{
  "success": true,
  "containerId": "17899999999999999",
  "mediaId": "17888888888888888"
}
```

**Error responses:**

- `400` — Invalid body, account not found, or concurrent publish
- `403` — Account belongs to another user
- `404` — Account not found
- `409` — Another publish is in progress for this account
- `429` — Instagram publishing quota exceeded (response body includes `quota` object)
- `500` — Failed to create publish log
- `503` — Container not ready (media still processing on Meta)
- `502` — Meta API error

The `409` response body includes the conflicting `publishLogId` for client tracking.

---

### GET /api/instagram/publish-log

List the authenticated user's publish history (auth required).

**Query params:**

```
limit: number   # optional, 1-100, default 20
```

**Response 200:**

```json
{
  "items": [
    {
      "id": "uuid",
      "instagramAccountId": "uuid",
      "status": "published",
      "mediaType": "single_image",
      "imageUrl": "https://...",
      "caption": "Hello",
      "containerId": "17899999999999999",
      "mediaId": "17888888888888888",
      "errorCode": null,
      "errorSubcode": null,
      "errorMessage": null,
      "createdAt": "2026-06-12T10:00:00Z",
      "publishedAt": "2026-06-12T10:00:05Z"
    }
  ]
}
```

Status values: `processing`, `published`, `failed`.

---

### GET /api/instagram/quota

Get the current Instagram publishing quota for the user's account (auth required).

**Response 200:**

```json
{
  "quotaUsage": 5,
  "publishingLimit": 50,
  "resetAt": "2026-06-13T10:00:00Z"
}
```

**Error responses:**

- `404` — No Instagram account connected
- `401` — Token expired
- `502` — Meta API error

---

## Testing with API Clients

This API is a standard JSON REST API — it works with **Postman**, **Bruno**, **Insomnia**, **HTTPie**, **curl**, **Hoppscotch**, or any HTTP client.

### Session Cookie

After signing in via `POST /api/auth/sign-in/email`, the response sets a `better-auth.session_token` cookie. Capture it from browser DevTools (**Application** → **Cookies**) or from the API client's cookie manager.

### Required environment variables (any client)

```env
BASE_URL=http://localhost:3000
AUTH_COOKIE=better-auth.session_token
```

### Example: Postman

```http
POST {{BASE_URL}}/api/instagram/publish
Content-Type: application/json
Cookie: better-auth.session_token={{AUTH_COOKIE}}

{
  "mediaType": "single_image",
  "accountId": "<uuid-from-/accounts>",
  "imageUrl": "https://test-bucket.r2.dev/uploads/uuid/uuid-here.jpg",
  "caption": "Posted via Postman"
}
```

### Example: Bruno (.bru file)

```bru
meta {
  name: Publish single image
  type: http
  seq: 1
}

post {
  url: {{BASE_URL}}/api/instagram/publish
  body: json
  auth: none
}

headers {
  Cookie: better-auth.session_token={{AUTH_COOKIE}}
  Content-Type: application/json
}

body:json {
  {
    "mediaType": "single_image",
    "accountId": "{{accountId}}",
    "imageUrl": "{{imageUrl}}",
    "caption": "Posted via Bruno"
  }
}
```

### Example: Insomnia

Request:
- **Method**: `POST`
- **URL**: `{{ BASE_URL }}/api/instagram/publish`
- **Header**: `Cookie: better-auth.session_token={{ AUTH_COOKIE }}`
- **Body** (JSON):

```json
{
  "mediaType": "single_image",
  "accountId": "<uuid>",
  "imageUrl": "https://test-bucket.r2.dev/uploads/uuid/uuid-here.jpg",
  "caption": "Posted via Insomnia"
}
```

### Example: curl

```bash
curl -X POST http://localhost:3000/api/instagram/publish \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=$AUTH_COOKIE" \
  -d '{
    "mediaType": "single_image",
    "accountId": "uuid",
    "imageUrl": "https://test-bucket.r2.dev/uploads/uuid/uuid-here.jpg",
    "caption": "Posted via curl"
  }'
```

### Full end-to-end flow (any client)

1. **Sign in** → `POST /api/auth/sign-in/email` (capture cookie)
2. **Get OAuth URL** → `GET /api/instagram/auth-url` (copy URL, open in browser)
3. **Authorize in Meta** → Facebook login + grant permissions (browser redirect)
4. **Upload image** → `POST /api/instagram/upload` (multipart, returns `key` + `publicUrl`)
5. **Publish** → `POST /api/instagram/publish` with `imageUrl = publicUrl`
6. **Check status** → `GET /api/instagram/publish-log?limit=5`
7. **Check quota** → `GET /api/instagram/quota`
8. **Disconnect** → `DELETE /api/instagram/accounts/:id`

> **Mocking Meta**: For local dev without a real Facebook App, set `META_GRAPH_URL` to a Postman Mock Server URL that returns the pre-canned responses documented in `docs/instagram-postman-guide.md` section 3.

---

## Error Responses

| Status | Meaning                                                                | Example body                                                                                  |
| ------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `400`  | Invalid request body / Zod validation failed                           | `{ "error": "Invalid request body", "details": {...} }`                                        |
| `401`  | No session cookie / state token mismatch / Meta token expired         | `{ "error": "Unauthorized" }`                                                                  |
| `403`  | Account belongs to another user                                        | `{ "error": "Forbidden" }`                                                                     |
| `404`  | Account not found / not connected                                      | `{ "error": "Not found" }`                                                                     |
| `409`  | Another publish in progress for this account                           | `{ "error": "Another publish is in progress for this account", "publishLogId": "uuid" }`     |
| `413`  | Upload file too large (> 8MB)                                          | `{ "error": "File too large (max 8MB)" }`                                                     |
| `429`  | Instagram rate limit / quota exceeded                                 | `{ "error": "Instagram publishing quota exceeded", "quota": {...} }`                         |
| `500`  | Server error (config missing, DB failure, internal)                    | `{ "message": "Internal Server Error", "error": "..." }`                                       |
| `502`  | Meta API upstream error                                                | `{ "error": "META_API_ERROR" }`                                                                |
| `503`  | Container not ready (media still processing on Meta)                   | `{ "error": "Container not ready", "status": "IN_PROGRESS" }`                                  |

The `429` response includes a `Retry-After` HTTP header (in seconds).

---

## Security Notes

- **Tokens**: All Instagram access tokens are encrypted at rest with **AES-GCM 256-bit** (Web Crypto API). They are **never** logged, **never** returned in API responses, and **never** persisted in plaintext.
- **CSRF**: The OAuth `state` parameter prevents CSRF attacks during the Meta callback flow (10-minute TTL).
- **Ownership**: All mutations verify that the authenticated user owns the target account.
- **Concurrency**: A user cannot have two simultaneous publishes for the same account (returns `409`).
- **Multi-tenant**: One Instagram account per user (single record enforced server-side).
- **Image validation**: Magic bytes are checked to ensure files are genuine JPEG/PNG, not renamed binaries.
- **Cloudflare Workers**: No `process.env` is used; all secrets come from `c.env.META_*` (Hono bindings).
