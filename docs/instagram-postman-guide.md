# Postman Guide — Instagram Publishing API

> **Versión**: 1.0 · **Backend**: Hono + Cloudflare Workers · **Auth**: Better-Auth (cookies)

Esta guía explica cómo probar los 8 endpoints del feature de publicación de Instagram con Postman, incluyendo:
- Setup del environment
- Autenticación (sesión de Better-Auth)
- Flujo OAuth con Meta (paso a paso)
- Mocking de la Meta Graph API (para no necesitar credenciales reales)
- Pruebas de upload a R2, publicación, errores, rate limits

---

## 1. Setup del environment

### 1.1 Crear environment

En Postman: **Environments** → **+** → nombre: `generai-dev`

Define estas variables:

| Variable              | Initial value                                  | Current value (auto) | Descripción                                      |
| --------------------- | ---------------------------------------------- | -------------------- | ------------------------------------------------ |
| `base_url`            | `http://localhost:3000`                        |                      | URL del dev server                               |
| `media_bucket_url`    | `https://test-bucket.r2.dev`                   |                      | URL pública de R2 (para tests)                   |
| `account_id`          | _(vacío)_                                      | _(auto)_             | ID de Instagram Account devuelto por la API      |
| `publish_log_id`      | _(vacío)_                                      | _(auto)_             | ID de un publish log para tests                  |
| `image_id`            | _(vacío)_                                      | _(auto)_             | ID de una imagen subida (R2 key)                 |
| `state_token`         | _(vacío)_                                      | _(auto)_             | State CSRF para OAuth callback                   |
| `meta_code`           | _(vacío)_                                      | _(auto)_             | Code de Meta OAuth (paso 1)                      |

### 1.2 Activar environment

Selecciona `generai-dev` en el dropdown de environments (arriba a la derecha).

---

## 2. Autenticación (Better-Auth)

El server usa **cookies de sesión de Better-Auth** (no JWT en headers). Hay 3 opciones para autenticar en Postman:

### Opción A — Login UI (recomendado para setup inicial)

1. Arranca el dev server: `bun run dev:web` y `bun run dev:server`
2. En **Postman Desktop**, abre una pestaña nueva → **GET** `{{base_url}}/api/auth/sign-in`
3. Se abrirá la página de login en el browser embebido
4. Regístrate o inicia sesión
5. Postman captura automáticamente las cookies
6. Listo: ya puedes llamar a endpoints autenticados

> **Cookies guardadas en**: Postman Cookie Manager → dominio `localhost`.

### Opción B — Captura manual con DevTools

1. En Chrome, ve a `http://localhost:3000`
2. Inicia sesión en la UI
3. DevTools → **Application** → **Cookies** → `http://localhost:3000`
4. Copia el valor de la cookie `better-auth.session_token`
5. En Postman, en cada request → **Cookies** → agrega:
   - **Domain**: `localhost`
   - **Name**: `better-auth.session_token`
   - **Value**: `<valor copiado>`
6. Postman la envía en cada request al dominio

### Opción C — Sign-up directo por API

```http
POST {{base_url}}/api/auth/sign-up/email
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePass123!",
  "name": "Test User"
}
```

Postman capturará la cookie `Set-Cookie: better-auth.session_token=...` automáticamente en la respuesta.

**Para las siguientes requests, Postman la envía sola** (siempre que estén bajo `{{base_url}}`).

---

## 3. Mocking de la Meta Graph API

Meta requiere una **app real de Facebook Developers** con OAuth configurado. Para tests locales sin credenciales, hay 3 opciones:

### Opción A — Usar una app real de Meta (producción-like)

1. Crea app en [developers.facebook.com](https://developers.facebook.com)
2. Agrega el producto **Instagram Graph API**
3. Configura OAuth redirect: `http://localhost:3000/api/instagram/callback`
4. Obtén `META_APP_ID` y `META_APP_SECRET`
5. Ponlos en `apps/server/.env.local`:
   ```
   META_APP_ID=1234567890
   META_APP_SECRET=abc123def456
   META_REDIRECT_URI=http://localhost:3000/api/instagram/callback
   ```
6. Usa una **cuenta Business o Creator de Instagram** (no Personal — Meta no permite)

### Opción B — Mock Server de Postman (recomendado para CI/dev)

Crea un **Mock Server** en Postman que responda a los endpoints de Meta:

1. Postman → **Mock Servers** → **+** → nombre: `meta-mock`
2. Crea un environment aparte `meta-mock` con variable `mock_url` apuntando a la URL del mock
3. Agrega ejemplos (responses pre-canned) para cada endpoint:

#### Mock para OAuth token exchange

**Request**: `POST https://graph.facebook.com/v25.0/oauth/access_token`
**Response 200**:
```json
{
  "access_token": "EAAxxxxxxxxxxxxxxxxx",
  "token_type": "bearer",
  "expires_in": 5184000
}
```

#### Mock para pages listing

**Request**: `GET https://graph.facebook.com/v25.0/me/accounts`
**Response 200**:
```json
{
  "data": [
    {
      "id": "1234567890",
      "name": "Test Page",
      "access_token": "EAA_PAGE_TOKEN_xxxxxxxxx",
      "instagram_business_account": {
        "id": "17841234567890",
        "username": "test_ig_account"
      }
    }
  ]
}
```

#### Mock para crear container

**Request**: `POST https://graph.facebook.com/v25.0/17841234567890/media`
**Response 200**:
```json
{
  "id": "17899999999999999"
}
```

#### Mock para publicar media

**Request**: `POST https://graph.facebook.com/v25.0/17841234567890/media_publish`
**Response 200**:
```json
{
  "id": "17888888888888888"
}
```

#### Mock para status (FINISHED)

**Request**: `GET https://graph.facebook.com/v25.0/17899999999999999?fields=status_code`
**Response 200**:
```json
{
  "id": "17899999999999999",
  "status_code": "FINISHED"
}
```

#### Mock para content publishing limit

**Request**: `GET https://graph.facebook.com/v25.0/17841234567890/content_publishing_limit`
**Response 200**:
```json
{
  "data": [{
    "quota_usage": 5,
    "rate_limit_settings": {
      "max_publish_per_window": 50,
      "window_hours": 24
    }
  }]
}
```

Para activar el mock, haz un **Override** de la variable `META_GRAPH_URL` en `apps/server/.env.local`:
```
META_GRAPH_URL=https://<tu-mock>.mock.pstmn.io
```

Y configura los mocks para que listen en `https://graph.facebook.com/v25.0/...` (usando `match` por path).

### Opción C — MSW (Mock Service Worker) en dev (no recomendado)

Requiere tocar el código del server. No cubierto en esta guía.

---

## 4. Los 8 endpoints

Base path: `/api/instagram`

| # | Método | Path                          | Auth | Descripción                          |
| - | ------ | ----------------------------- | ---- | ------------------------------------ |
| 1 | GET    | `/auth-url`                   | ✅   | Genera URL de OAuth con Meta         |
| 2 | GET    | `/callback`                   | ❌   | Recibe `code` y `state` de Meta      |
| 3 | GET    | `/accounts`                   | ✅   | Lista cuentas IG del user            |
| 4 | GET    | `/accounts/:id`               | ✅   | Detalle de una cuenta                |
| 5 | DELETE | `/accounts/:id`               | ✅   | Desconecta una cuenta                |
| 6 | POST   | `/publish`                    | ✅   | Publica un post (single o carousel)  |
| 7 | GET    | `/publish-log/:logId`         | ✅   | Status de un publish                 |
| 8 | GET    | `/quota`                      | ✅   | Cuota de publicación restante        |
| 9 | POST   | `/upload`                     | ✅   | Sube imagen a R2 (helper)            |

---

## 5. Flujo end-to-end paso a paso

### Paso 0 — Variables de entorno del server

Asegúrate de tener esto en `apps/server/.env.local`:

```bash
# Encryption
META_TOKEN_ENCRYPTION_KEY="9J1NIW0/oTJVOUxEEyA9nS8dvVLGVCunAS4ufjlMLXQ="

# R2
R2_BUCKET_NAME="test-bucket"
R2_PUBLIC_URL="https://test-bucket.r2.dev"
R2_ACCOUNT_ID="test-account-id"
R2_ACCESS_KEY_ID="test-key"
R2_SECRET_ACCESS_KEY="test-secret"

# Meta (o mock)
META_APP_ID="1234567890"
META_APP_SECRET="abc123def456"
META_REDIRECT_URI="http://localhost:3000/api/instagram/callback"
META_GRAPH_URL="https://graph.facebook.com/v25.0"   # o tu mock

# Database
DATABASE_URL="postgresql://..."

# Auth (Better-Auth)
BETTER_AUTH_SECRET="dev-secret-32-chars-min-1234567890"
BETTER_AUTH_URL="http://localhost:3000"
```

### Paso 1 — Login

```http
POST {{base_url}}/api/auth/sign-in/email
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePass123!"
}
```

**Expected**: `200 OK` con `Set-Cookie: better-auth.session_token=...`

Postman guarda la cookie automáticamente. Para todas las requests siguientes, ve a **Cookies** y verifica que esté.

### Paso 2 — Obtener URL de OAuth

```http
GET {{base_url}}/api/instagram/auth-url
```

**Headers** (Postman los pone auto si estás en el environment correcto):
- `Cookie: better-auth.session_token=<auto>`

**Response 200**:
```json
{
  "url": "https://www.facebook.com/v25.0/dialog/oauth?client_id=1234567890&redirect_uri=...&state=<csrf-token>&scope=instagram_business_basic%2Cinstagram_business_content_publish%2Cpages_show_list%2Cbusiness_management",
  "state": "csrf-token-aqui"
}
```

**Postman — Tests tab** (auto-guarda el state):
```javascript
const data = pm.response.json();
pm.environment.set("state_token", data.state);
pm.test("URL contains required scopes", () => {
  pm.expect(data.url).to.include("instagram_business_content_publish");
  pm.expect(data.url).to.include("pages_show_list");
  pm.expect(data.url).to.include("business_management");
});
```

### Paso 3 — Autorizar en Meta (manual)

> **Si usas MOCK**: sáltate este paso. El callback se prueba directamente.

1. Copia el valor de `url` del response
2. Ábrelo en el browser
3. Inicia sesión en Facebook
4. Autoriza la app
5. Facebook te redirige a: `http://localhost:3000/api/instagram/callback?code=ABC123&state=<csrf-token>`

### Paso 4 — Simular callback (para MOCK)

Si estás usando el mock server de Postman, simula el callback con el `code` que devuelve Meta mock y el `state` que guardaste:

```http
GET {{base_url}}/api/instagram/callback?code=TEST_CODE_FROM_MOCK&state={{state_token}}
```

**Response 200** (o redirect):
```json
{
  "success": true,
  "accountId": "17841234567890"
}
```

**Postman — Tests tab** (auto-guarda el account_id):
```javascript
pm.test("Callback successful", () => {
  pm.response.to.have.status(200);
  const data = pm.response.json();
  pm.environment.set("account_id", data.accountId);
});
```

> **Nota de seguridad**: El server valida que el `state` coincida con el que emitió. Si el state expiró (>10 min) o no coincide, devuelve 401.

### Paso 5 — Listar cuentas conectadas

```http
GET {{base_url}}/api/instagram/accounts
```

**Response 200**:
```json
{
  "accounts": [
    {
      "id": "uuid-here",
      "instagramAccountId": "17841234567890",
      "igUsername": "test_ig_account",
      "pageId": "1234567890",
      "pageName": "Test Page",
      "connectedAt": "2026-06-12T10:00:00Z",
      "lastQuotaCheck": null
    }
  ]
}
```

**Verificación crítica**: El response **NO** debe contener `pageAccessToken` ni `accessToken`. Si los ves, es un bug.

### Paso 6 — Subir imagen a R2

Para publicar primero necesitas subir la imagen. Hay 2 opciones:

#### Opción A — POST /upload (helper)

```http
POST {{base_url}}/api/instagram/upload
Content-Type: multipart/form-data

[form-data]
  file: <archivo jpeg/png>     # binary
  filename: "my-image.jpg"
```

**Response 200**:
```json
{
  "url": "https://test-bucket.r2.dev/uploads/uuid-here.jpg",
  "key": "uploads/uuid-here.jpg"
}
```

**Postman — Tests**:
```javascript
const data = pm.response.json();
pm.environment.set("image_id", data.key);
pm.test("Magic bytes check", () => {
  // No podemos verificar magic bytes desde Postman, pero verificamos MIME type por extensión
  pm.expect(data.url).to.match(/\.(jpg|jpeg|png)$/i);
});
```

#### Opción B — Subir directamente a R2 (más realista)

```http
PUT https://test-bucket.r2.dev/uploads/{{$randomUUID}}.jpg
Content-Type: image/jpeg

[binary data]
```

> **Requiere**: R2 configurado con CORS allow `PUT` desde `localhost:3000`. Solo para tests avanzados.

### Paso 7 — Publicar post (single image)

```http
POST {{base_url}}/api/instagram/publish
Content-Type: application/json

{
  "instagramAccountId": "{{account_id}}",
  "imageUrls": ["{{media_bucket_url}}/{{image_id}}"],
  "caption": "Hello from Postman! 🚀 #test",
  "isCarousel": false
}
```

**Response 200**:
```json
{
  "publishLogId": "uuid-here",
  "containerId": "17899999999999999",
  "mediaId": "17888888888888888",
  "status": "PUBLISHED"
}
```

**Postman — Tests**:
```javascript
const data = pm.response.json();
pm.environment.set("publish_log_id", data.publishLogId);
pm.test("Published successfully", () => {
  pm.expect(data.status).to.eql("PUBLISHED");
  pm.expect(data.mediaId).to.exist;
});
```

### Paso 8 — Publicar carousel (2-10 imágenes)

```http
POST {{base_url}}/api/instagram/publish
Content-Type: application/json

{
  "instagramAccountId": "{{account_id}}",
  "imageUrls": [
    "{{media_bucket_url}}/img1.jpg",
    "{{media_bucket_url}}/img2.jpg",
    "{{media_bucket_url}}/img3.jpg"
  ],
  "caption": "Carousel test with 3 images",
  "isCarousel": true
}
```

**Response 200**:
```json
{
  "publishLogId": "uuid-here",
  "containerId": "17899999999999999",
  "mediaId": "17888888888888888",
  "status": "PUBLISHED"
}
```

**Verificaciones**:
- `isCarousel: true` con 1 sola imagen → 400 Bad Request
- 11+ imágenes → 400 Bad Request
- `caption.length > 2200` → 400 Bad Request

### Paso 9 — Ver status del publish

```http
GET {{base_url}}/api/instagram/publish-log/{{publish_log_id}}
```

**Response 200**:
```json
{
  "id": "uuid-here",
  "instagramAccountId": "17841234567890",
  "status": "PUBLISHED",
  "containerId": "17899999999999999",
  "mediaId": "17888888888888888",
  "errorCode": null,
  "errorMessage": null,
  "createdAt": "2026-06-12T10:00:00Z",
  "publishedAt": "2026-06-12T10:00:05Z"
}
```

### Paso 10 — Ver quota

```http
GET {{base_url}}/api/instagram/quota?instagramAccountId={{account_id}}
```

**Response 200**:
```json
{
  "quotaUsage": 5,
  "maxPublishPerWindow": 50,
  "windowHours": 24,
  "remaining": 45,
  "windowResetAt": "2026-06-13T10:00:00Z"
}
```

### Paso 11 — Desconectar cuenta

```http
DELETE {{base_url}}/api/instagram/accounts/{{account_id}}
```

**Response 200**:
```json
{
  "success": true
}
```

> **Cuidado**: Esto borra el `instagramAccountId` y el `encryptedToken` de la DB. No se puede deshacer. Para volver a usar la cuenta, hay que re-hacer el OAuth flow.

---

## 6. Colección de Postman (importable)

Copia este JSON y pégalo en Postman → **Import** → **Raw text**:

```json
{
  "info": {
    "name": "Generai - Instagram Publishing",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Auth — Sign In",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"SecurePass123!\"\n}"
        },
        "url": { "raw": "{{base_url}}/api/auth/sign-in/email", "host": ["{{base_url}}"], "path": ["api", "auth", "sign-in", "email"] }
      }
    },
    {
      "name": "2. Instagram — Get Auth URL",
      "request": {
        "method": "GET",
        "url": { "raw": "{{base_url}}/api/instagram/auth-url", "host": ["{{base_url}}"], "path": ["api", "instagram", "auth-url"] }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "const data = pm.response.json();",
              "pm.environment.set('state_token', data.state);"
            ]
          }
        }
      ]
    },
    {
      "name": "3. Instagram — OAuth Callback (mock)",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{base_url}}/api/instagram/callback?code=MOCK_CODE&state={{state_token}}",
          "host": ["{{base_url}}"],
          "path": ["api", "instagram", "callback"],
          "query": [
            { "key": "code", "value": "MOCK_CODE" },
            { "key": "state", "value": "{{state_token}}" }
          ]
        }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "const data = pm.response.json();",
              "pm.environment.set('account_id', data.accountId);"
            ]
          }
        }
      ]
    },
    {
      "name": "4. Instagram — List Accounts",
      "request": {
        "method": "GET",
        "url": { "raw": "{{base_url}}/api/instagram/accounts", "host": ["{{base_url}}"], "path": ["api", "instagram", "accounts"] }
      }
    },
    {
      "name": "5. Instagram — Upload Image",
      "request": {
        "method": "POST",
        "body": {
          "mode": "formdata",
          "formdata": [
            { "key": "file", "type": "file", "src": "/path/to/your/image.jpg" },
            { "key": "filename", "value": "image.jpg" }
          ]
        },
        "url": { "raw": "{{base_url}}/api/instagram/upload", "host": ["{{base_url}}"], "path": ["api", "instagram", "upload"] }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "const data = pm.response.json();",
              "pm.environment.set('image_id', data.key);"
            ]
          }
        }
      ]
    },
    {
      "name": "6. Instagram — Publish (single)",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"instagramAccountId\": \"{{account_id}}\",\n  \"imageUrls\": [\"{{media_bucket_url}}/{{image_id}}\"],\n  \"caption\": \"Hello from Postman! 🚀\",\n  \"isCarousel\": false\n}"
        },
        "url": { "raw": "{{base_url}}/api/instagram/publish", "host": ["{{base_url}}"], "path": ["api", "instagram", "publish"] }
      },
      "event": [
        {
          "listen": "test",
          "script": {
            "type": "text/javascript",
            "exec": [
              "const data = pm.response.json();",
              "pm.environment.set('publish_log_id', data.publishLogId);"
            ]
          }
        }
      ]
    },
    {
      "name": "7. Instagram — Publish (carousel)",
      "request": {
        "method": "POST",
        "header": [{ "key": "Content-Type", "value": "application/json" }],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"instagramAccountId\": \"{{account_id}}\",\n  \"imageUrls\": [\"{{media_bucket_url}}/img1.jpg\", \"{{media_bucket_url}}/img2.jpg\"],\n  \"caption\": \"Carousel test\",\n  \"isCarousel\": true\n}"
        },
        "url": { "raw": "{{base_url}}/api/instagram/publish", "host": ["{{base_url}}"], "path": ["api", "instagram", "publish"] }
      }
    },
    {
      "name": "8. Instagram — Get Publish Status",
      "request": {
        "method": "GET",
        "url": { "raw": "{{base_url}}/api/instagram/publish-log/{{publish_log_id}}", "host": ["{{base_url}}"], "path": ["api", "instagram", "publish-log", "{{publish_log_id}}"] }
      }
    },
    {
      "name": "9. Instagram — Get Quota",
      "request": {
        "method": "GET",
        "url": {
          "raw": "{{base_url}}/api/instagram/quota?instagramAccountId={{account_id}}",
          "host": ["{{base_url}}"],
          "path": ["api", "instagram", "quota"],
          "query": [{ "key": "instagramAccountId", "value": "{{account_id}}" }]
        }
      }
    },
    {
      "name": "10. Instagram — Disconnect Account",
      "request": {
        "method": "DELETE",
        "url": { "raw": "{{base_url}}/api/instagram/accounts/{{account_id}}", "host": ["{{base_url}}"], "path": ["api", "instagram", "accounts", "{{account_id}}"] }
      }
    }
  ]
}
```

> **Cómo usar**: Importa el JSON → ve al **Collection Runner** → ejecuta los 10 requests en orden.

---

## 7. Casos de error (testing negativo)

### 7.1 Token expirado (Meta error 190)

Mock the Meta response:
```json
{
  "error": {
    "code": 190,
    "message": "Error validating access token: Session has expired",
    "type": "OAuthException"
  }
}
```

**Expected from /publish**: `401 Unauthorized` con body:
```json
{
  "error": "TOKEN_EXPIRED",
  "message": "Instagram access token expired. Please reconnect."
}
```

### 7.2 Rate limit (Meta error 4 / subcode 2207001)

Mock:
```json
{
  "error": {
    "code": 4,
    "error_subcode": 2207001,
    "message": "Application request limit reached"
  }
}
```

**Expected**: `429 Too Many Requests` con `Retry-After: 60` header.

### 7.3 Media not ready (subcode 9004)

Mock (status check antes de publish):
```json
{
  "error": {
    "code": 9,
    "error_subcode": 9004,
    "message": "Media not ready"
  }
}
```

**Expected**: `503 Service Unavailable` con body:
```json
{
  "error": "MEDIA_NOT_READY",
  "message": "Instagram is still processing the media. Please try again in a few seconds.",
  "retryAfter": 5
}
```

### 7.4 Concurrent publish (mismo user, mismo account)

Dispara dos requests `/publish` en paralelo desde el Collection Runner con `--delay 0`.

**Expected**: la primera devuelve 200, la segunda devuelve 409 Conflict con body:
```json
{
  "error": "PUBLISH_IN_PROGRESS",
  "message": "Another publish is already in progress for this account.",
  "publishLogId": "<id-de-la-primera>"
}
```

### 7.5 Validation errors (Zod)

```http
POST {{base_url}}/api/instagram/publish
{
  "instagramAccountId": "123",
  "imageUrls": [],
  "caption": "",
  "isCarousel": true
}
```

**Expected**: `400 Bad Request` con body:
```json
{
  "error": "VALIDATION_ERROR",
  "issues": [
    { "path": ["imageUrls"], "message": "Array must contain at least 1 element(s)" },
    { "path": ["caption"], "message": "String must contain at least 1 character(s)" }
  ]
}
```

### 7.6 Caption muy larga (> 2200 chars)

```json
{
  "caption": "x".repeat(2201)
}
```

**Expected**: `400 Bad Request` con mensaje `caption must be at most 2200 characters`.

### 7.7 Carousel con 11+ imágenes

```json
{
  "isCarousel": true,
  "imageUrls": ["url1", "url2", "url3", "url4", "url5", "url6", "url7", "url8", "url9", "url10", "url11"]
}
```

**Expected**: `400 Bad Request` con mensaje `carousel must have between 2 and 10 images`.

### 7.8 Magic bytes inválidos (no es JPEG ni PNG)

Sube un `.txt` renombrado a `.jpg`.

**Expected**: `400 Bad Request` con mensaje `Invalid image format. Only JPEG and PNG are supported.`

### 7.9 Cuenta no encontrada

```http
GET {{base_url}}/api/instagram/accounts/00000000-0000-0000-0000-000000000000
```

**Expected**: `404 Not Found`.

### 7.10 Auth faltante

Sin cookie de Better-Auth:

```http
GET {{base_url}}/api/instagram/accounts
```

**Expected**: `401 Unauthorized`.

---

## 8. Collection Runner (testing automatizado)

1. **Postman** → tu colección → **Run collection**
2. Configura:
   - **Iterations**: 1
   - **Delay**: 0 ms (para test de concurrencia)
   - **Save responses**: ✅
3. **Run**
4. Revisa el **Test Results tab**: si algún test falló, el JSON response está en la sección de "Failed" tests.

### Pre-request Script global (en toda la collection)

```javascript
// Auto-refresh auth si la cookie expiró
const sessionToken = pm.cookies.get('better-auth.session_token');
if (!sessionToken) {
  pm.sendRequest({
    url: pm.environment.get('base_url') + '/api/auth/sign-in/email',
    method: 'POST',
    header: { 'Content-Type': 'application/json' },
    body: {
      mode: 'raw',
      raw: JSON.stringify({
        email: 'test@example.com',
        password: 'SecurePass123!'
      })
    }
  }, (err, res) => {
    if (!err) console.log('Auto-login successful');
  });
}
```

---

## 9. Scripting avanzado (Tests tab examples)

### Verificar que NO se filtra el token en responses

```javascript
pm.test("No tokens in response", () => {
  const text = pm.response.text();
  pm.expect(text).to.not.include('pageAccessToken');
  pm.expect(text).to.not.include('access_token');
  pm.expect(text).to.not.include('EAA'); // prefix típico de tokens Meta
});
```

### Verificar rate limit headers

```javascript
pm.test("Rate limit headers present", () => {
  pm.expect(pm.response.headers.get('X-RateLimit-Remaining')).to.exist;
});
```

### Verificar encryption del token (querying DB directo)

Si tienes acceso a la DB:

```sql
SELECT id, "pageAccessToken"
FROM instagram_accounts
WHERE id = '<account_id>';
```

El `pageAccessToken` debe ser base64 de un objeto cifrado AES-GCM (formato: `iv:ciphertext:tag`), NO plaintext.

---

## 10. Newman (CLI para CI/CD)

Corre la colección desde la terminal:

```bash
# Install Newman
npm install -g newman

# Run con environment
newman run instagram-collection.json \
  -e generai-dev.postman_environment.json \
  --reporters cli,html \
  --reporter-html-export report.html
```

Para CI/CD (GitHub Actions, etc.), ver `docs/postman-ci.md` (pendiente).

---

## 11. Troubleshooting

| Problema                                          | Solución                                                                                  |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `401 Unauthorized` en endpoints autenticados      | La cookie de Better-Auth no se está enviando. Verifica en **Cookies** de Postman.        |
| `ECONNREFUSED 127.0.0.1:3000`                     | El server no está corriendo. `bun run dev:server`.                                        |
| `Invalid state token` en callback                | El `state` de la URL no coincide con el que emitió el server. Re-haz el paso 2.            |
| Mock server no responde                           | Verifica que el `META_GRAPH_URL` apunte a la URL del mock, no a `graph.facebook.com`.    |
| `File too large` en upload                        | Cloudflare Workers limit: 100 MB por request. Reduce el tamaño de la imagen.             |
| Magic bytes check fails                           | El archivo no es JPEG ni PNG genuino. Usa una imagen real, no un `.txt` renombrado.       |
| `publishLog` siempre queda en `PENDING`           | El mock de `media_publish` no está retornando `mediaId`. Verifica el response del mock.   |

---

## 12. Referencias

- **Meta Graph API v25.0**: `https://developers.facebook.com/docs/instagram-api/`
- **Better-Auth (cookies)**: `https://www.better-auth.com/docs/concepts/session`
- **Hono testing**: `apps/server/src/tests/instagram.test.ts` (24 tests = referencia canónica)
- **OpenAPI spec** (si la tienes): `apps/server/src/openapi.json`

---

## TL;DR — Setup rápido (5 minutos)

```bash
# 1. Variables de entorno
cp apps/server/.env.example apps/server/.env.local
# Editar .env.local con tus valores

# 2. Arrancar dev server
bun run dev:server

# 3. En Postman:
#    a. Importar la colección (sección 6)
#    b. Crear environment "generai-dev" (sección 1.1)
#    c. Hacer login (paso 1)
#    d. Correr los 10 requests en orden con Collection Runner
```

Si todo sale bien: **10/10 requests devuelven 2xx** y los tests pasan.
