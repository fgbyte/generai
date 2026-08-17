# Pruebas visuales de Analytics

Este documento te enseña a verificar a mano las dos capas de analítica de generai:

1. **Web Analytics de Cloudflare** (frontend): mide tráfico y páginas vistas. Los datos se ven en el dashboard de Cloudflare Web Analytics y no requieren backend propio.
2. **Logging de eventos en servidor** (backend): registra eventos de negocio por usuario en la tabla `analytics_events` de Postgres.

Son capas independientes. Puedes probar una sin la otra.

## 1. Qué se mide

### Frontend (beacon de Cloudflare)

- Página visitada y navegación SPA. El beacon se inyecta con `spa: "auto"`, así que los cambios de ruta del TanStack Router también se registran como visitas.
- Se visualiza en el dashboard de Cloudflare: `dash.cloudflare.com` → Web Analytics.
- No se necesita backend propio ni base de datos.

### Backend (eventos de negocio)

Tres eventos por usuario, escritos en la tabla `analytics_events`:

| Evento | Cuándo se emite | Claves de `properties` (allowlist) |
| --- | --- | --- |
| `generate.success` | Generación exitosa | `userId`, `contentType`, `creditsUsed`, `elapsedMs`, `captionCount` |
| `generate.rejected` | Generación rechazada | `userId`, `contentType`, `reason`, `creditsAvailable` |
| `credits.reset` | Reset perezoso de créditos aplicado | `userId`, `previousPoints`, `newPoints` |

Razones posibles de `generate.rejected`: `insufficient_points`, `race_condition`, `provider_error`.

Cada fila guarda: `id`, `user_id`, `event`, `properties` (JSON), `created_at`.

**Seguridad PII**: nunca se guardan `prompt`, `content`, `imageBase64`, `email`, `imageKB` ni `promptPreview`. La sanitización corre siempre antes de escribir.

## 2. Requisitos previos

### Variables de entorno

- `apps/web/.env` → `VITE_CF_WEB_ANALYTICS_TOKEN=` (token de Cloudflare Web Analytics; opcional, si está vacío el beacon no se inyecta). Es build-time: Vite reemplaza `%VITE_CF_WEB_ANALYTICS_TOKEN%` en `apps/web/index.html`.
- `apps/server/.env` → `ANALYTICS_ENABLED=true` (por defecto habilitado si no está; poner `false` deshabilita). En dev local no está definido en `apps/server/.env.dev`, así que queda habilitado por defecto.
- Las demás variables del server (`DATABASE_URL`, `BETTER_AUTH_SECRET`, etc.) también deben estar configuradas para que la app funcione.

### Base de datos

La tabla `analytics_events` viene en la migración `0003_stiff_charles_xavier.sql`. Si no está aplicada, desde la raíz:

```bash
bun run db:push
```

### Levantar la app

```bash
bun run dev
```

Levanta la web (http://localhost:3001) y el server (http://localhost:3000). No abre Drizzle Studio: para ver la base de datos usa `bun run db:studio` (sección 5, Paso A).

Alternativa:

```bash
bun run dev:web       # solo frontend (apunta al server dev desplegado)
```

Nota: el server local se levanta con `bun run dev` (Alchemy dev). No existe un script `dev:server` independiente: `apps/server/package.json` no tiene script `dev`, así que `bun run dev:server` falla.

## 3. ⚠️ GOTCHA CRÍTICO: el "stage gate"

`trackEvent` (en `apps/server/src/lib/analytics.ts`) tiene DOS compuertas:

1. `ANALYTICS_ENABLED` debe ser distinto de `false` o `"false"`.
2. El stage debe ser `"production"`. Se lee de `ENV`, si no de `NODE_ENV`, si no por defecto `"production"`.

**Clave**: `getEnv` lee las bindings del Worker (`c.env`), NO las variables de entorno del shell. Un `NODE_ENV=production` en la shell no llega a `c.env` salvo que esté declarado como binding.

En dev local (`bun run dev`, Alchemy dev), las bindings generadas no incluyen `ENV`, `NODE_ENV` ni `ANALYTICS_ENABLED`. Por lo tanto:

- `ANALYTICS_ENABLED` → `undefined` → compuerta 1 PASA (`undefined` no es `false` ni `"false"`).
- `ENV` → `undefined`, `NODE_ENV` → `undefined` → el stage cae al default `"production"` → compuerta 2 PASA.

**Consecuencia práctica**: en dev local los eventos SÍ se escriben, a la base que apunte `DATABASE_URL` (en dev, la base `generai-dev` de Neon). Es el comportamiento esperado, no un error.

Consejos prácticos:

- Para deshabilitar el logging local: pon `ANALYTICS_ENABLED=false` en `apps/server/.env` y reinicia `bun run dev`.
- Para forzar un stage distinto de `production` (por ejemplo, para probar la compuerta): tendrías que añadir una binding `ENV` o `NODE_ENV` al Worker. No se recomienda para pruebas normales.
- En producción real (Cloudflare Workers), las bindings `ENV` vienen del stage de Alchemy, así que la compuerta funciona sin tocar nada.

## 4. Prueba visual del BEACON (frontend)

1. Con `VITE_CF_WEB_ANALYTICS_TOKEN` seteado en `apps/web/.env` y tras `bun run dev` (o un build), abre la web en el navegador.
2. Abre DevTools → Elements/Inspector y busca `beacon.min.js`. El script debe existir:

   ```html
   <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon="{&quot;token&quot;:&quot;TU_TOKEN&quot;,&quot;spa&quot;:&quot;auto&quot;}"></script>
   ```

   Verifica que `data-cf-beacon` contiene el token real y `spa: "auto"`.
3. En la pestaña Network, filtra por `cloudflareinsights` para ver el request de `beacon.min.js` y las llamadas de `__cf.beacon` (pageviews). Navega por la SPA (cambia de ruta) y verás requests adicionales, gracias al `spa: "auto"`.
4. En el dashboard de Cloudflare → Analytics → Web Analytics, revisa las visitas en tiempo real. Pueden tardar unos minutos en aparecer.
5. **Prueba negativa**: quita el token del `.env` (déjalo vacío), reinicia dev/build y verifica que el script NO aparece en el DOM. La guardia `if (!token || token.indexOf("%VITE_") === 0) return;` lo mantiene inerte.

## 5. Prueba visual de EVENTOS (backend)

### Paso A: ver la tabla

Opción 1 (recomendada): desde la raíz:

```bash
bun run db:studio
```

Drizzle Studio abre en el navegador. Busca la tabla `analytics_events`, revisa las filas, el JSON de `properties` y `created_at`. Refresca tras cada acción.

Opción 2: consulta SQL directa a la base (psql o la consola de Neon):

```sql
SELECT event, user_id, properties, created_at
FROM analytics_events
ORDER BY created_at DESC
LIMIT 20;
```

### Paso B: Generar eventos

1. Inicia sesión en la web (http://localhost:3001) con un usuario.
2. **`generate.success`**: genera contenido con créditos suficientes (elige un `contentType`, escribe un prompt, pulsa Generar). En la tabla debe aparecer `generate.success` con properties como `contentType`, `creditsUsed`, `elapsedMs`, `captionCount` (y `userId`). Verifica que `prompt` NO está en properties.
3. **`generate.rejected`**: deja al usuario con menos créditos que el coste de la generación (por ejemplo, gastándolos o ajustándolos en la DB) e intenta generar. Debe aparecer `generate.rejected` con `reason: "insufficient_points"` y `creditsAvailable`.
4. **`credits.reset`**: cuando el usuario tiene el reset perezoso pendiente (créditos vencidos según la configuración de reset mensual) y vuelve a generar, aparecerá `credits.reset` con `previousPoints` y `newPoints`, seguido del evento del generate.

### Paso C: Prueba PII

En Drizzle Studio (o SQL), abre el JSON de `properties` de un `generate.success` y confirma que NUNCA contiene `prompt`, `content`, `imageBase64`, `email`, `imageKB` ni `promptPreview`. Solo claves de la allowlist: `userId`, `contentType`, `creditsUsed`, `elapsedMs`, `captionCount` (o `reason`, `creditsAvailable` / `previousPoints`, `newPoints`).

## 6. Resolución de problemas

| Síntoma | Causa probable |
| --- | --- |
| No aparecen eventos | ¿`ANALYTICS_ENABLED=false` en `apps/server/.env`? ¿El server corre vía `bun run dev` (Alchemy)? ¿`DATABASE_URL` apunta a una base que no estás inspeccionando? |
| No aparece el beacon | ¿Token vacío en `apps/web/.env`? ¿Se reinició dev/build tras cambiar el `.env`? (es build-time) |
| Errores del logger | El servidor loguea `[analytics] failed to write event:` en consola. Es fire-and-forget, nunca rompe la request |

## 7. Referencias de código

| Pieza | Ubicación |
| --- | --- |
| Beacon | `apps/web/index.html` (script con `%VITE_CF_WEB_ANALYTICS_TOKEN%`, `data-cf-beacon`, `spa: "auto"`) |
| Logger | `apps/server/src/lib/analytics.ts` (`trackEvent`, stage gate, `sanitizeProperties`, `c.executionCtx.waitUntil`) |
| Tipos + allowlist + PII blocklist | `apps/server/src/lib/analytics-types.ts` |
| Emisión de eventos | `apps/server/src/routes/generate.routes.ts` |
| Tabla | `packages/db/src/schema/analytics.ts` (tabla `analytics_events`) |
| Queries | `packages/db/src/queries/analytics.ts` (`insertAnalyticsEvent`) |
| Bindings/env | `packages/infra/alchemy.run.ts` (`ANALYTICS_ENABLED` opcional), `apps/server/.env.example`, `apps/web/.env.example` |