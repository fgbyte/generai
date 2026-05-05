# GenerAI API Reference

> **Tip**: This project already has auto-generated OpenAPI docs at `/docs` (Scalar UI) and `/doc` (OpenAPI JSON).

## Base URL

```
http://localhost:8787   # Local dev
https://your-worker.workers.dev   # Production
```

## Authentication

All protected endpoints require a session cookie from Better Auth.

**Login flow:**

1. POST to `/api/auth/sign-in` with email/password
2. Session cookie is set automatically
3. Include cookie in subsequent requests

---

## Endpoints

### POST /api/generate

Generate AI content (requires auth + 5 points).

**Request:**

```json
{
  "contentType": "thread" | "instagram" | "linkedin",
  "prompt": "Write a post about...",
  "imageBase64": "optional base64 image"
}
```

**Response:**

```json
{
  "content": ["Generated line 1", "Generated line 2"],
  "contentType": "thread",
  "id": "uuid"
}
```

---

### GET /api/generate/history

Get user's generated content history (requires auth).

**Response:**

```json
{
  "items": [
    {
      "id": "uuid",
      "content": "...",
      "prompt": "...",
      "contentType": "thread",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

### GET /api/generate/points

Get user's points balance (requires auth).

**Response:**

```json
{
  "points": 50
}
```

---

### DELETE /api/generate/history/:id

Delete a generated content item (requires auth).

**Response:**

```json
{
  "success": true
}
```

---

### POST /api/auth/sign-in

Sign in with email/password.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response:** Session cookie set automatically.

---

### POST /api/auth/sign-up

Sign up new user (email verification required).

**Request:**

```json
{
  "email": "user@example.com",
  "password": "yourpassword",
  "name": "User Name"
}
```

**Response:** Session cookie set after email verification.

---

### POST /api/auth/sign-out

Sign out (clears session).

**Response:**

```json
{
  "message": "Signed out successfully"
}
```

---

### GET /api/auth/get-session

Get current session info.

**Response:**

```json
{
  "session": {
    "expiresAt": "2025-01-01T00:00:00Z",
    "token": "...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "image": null,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  }
}
```

---

### GET /api/people

Public endpoint (no auth).

**Response:**

```json
[
  { "id": 1, "name": "Alice" },
  { "id": 2, "name": "Bob" },
  { "id": 3, "name": "Charlie" }
]
```

---

## Testing with Postman

1. **Import session cookie**: After signing in, copy the `better-auth.session` cookie to your Postman requests.
2. **Auth cookie name**: Check browser DevTools → Application → Cookies for the exact cookie name.

### Postman Environment Variables

```env
BASE_URL=http://localhost:8787
AUTH_COOKIE=better-auth.session
```

### Example Request (Generate)

```http
POST {{BASE_URL}}/api/generate
Content-Type: application/json
Cookie: better-auth.session={{AUTH_COOKIE}}

{
  "contentType": "thread",
  "prompt": "Write a short motivational post"
}
```

---

## Error Responses

```json
{ "error": "Insufficient points" }
{ "error": "Invalid request body", "details": {...} }
{ "error": "Failed to generate content" }
{ "error": "Not found" }
{ "error": "Forbidden" }
```
