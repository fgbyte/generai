# Plan: Implementar Dark Mode funcional

## Diagnóstico

La app tiene la infraestructura de dark mode **casi completa** pero rota en 3 niveles:

1. **CSS** — Los selectores `:root` / `.light` están invertidos respecto a lo que `next-themes` espera
2. **CSS** — Valores hardcodeados (`#000000`, `rgba(255,255,255,...)`) en `html`, `body` y clases de componentes que no responden al tema
3. **React** — ~80+ clases Tailwind hardcodeadas asumiendo fondo oscuro (`text-white`, `bg-black`, `border-white/15`, etc.)

## Arquitectura de tema (infraestructura existente)

El sistema de tema ya está cableado — el problema es que el CSS y los componentes no responden a él.

### Flujo completo

```
ModeToggle  ──setTheme()──►  ThemeProvider  ──class en <html>──►  CSS responde
   (UI)                     (next-themes)                      (:root / .dark)
```

### `ThemeProvider` — El accionador central

**Archivo:** `src/components/theme-provider.tsx`

Wrapper de `next-themes` que expone:

- `<ThemeProvider>` — envuelve la app en `__root.tsx`
- `useTheme()` — hook para leer/escribir el tema actual

**Configuración actual en `__root.tsx`:**

```tsx
<ThemeProvider
  attribute="class"          // ← añade/quita clase .dark en <html>
  defaultTheme="dark"       // ← dark por defecto
  disableTransitionOnChange  // ← sin flash de transición
  storageKey="vite-ui-theme" // ← persiste en localStorage
>
```

### `ModeToggle` — La UI de control

**Archivo:** `src/components/mode-toggle.tsx`

Dropdown con 3 opciones:

- **Light** → `setTheme("light")` → `<html>` sin clase `.dark`
- **Dark** → `setTheme("dark")` → `<html class="dark">`
- **System** → `setTheme("system")` → sigue `prefers-color-scheme` del OS

### Cómo responde el CSS (cuando esté arreglado)

| Acción del usuario | Clase en `<html>` | Variables activas           |
| ------------------ | ----------------- | --------------------------- |
| Light              | _(sin clase)_     | `:root` (valores light)     |
| Dark               | `.dark`           | `:root` + `.dark` override  |
| System             | depende del OS    | `:root` o `:root` + `.dark` |

### El problema actual

```css
:root           { /* valores DARK */ }   ← siempre activo, light mode nunca se aplica
.light          { /* valores LIGHT */ }  ← NUNCA se activa (next-themes no añade .light)
```

Resultado: el light mode nunca funciona, y las clases `text-white`, `bg-black`, etc. son fijas.

### Qué NO hay que tocar

- ✅ `ThemeProvider` — ya funciona correctamente
- ✅ `ModeToggle` — ya usa `useTheme()` con las 3 opciones
- ✅ Componentes shadcn (`button.tsx`, `input.tsx`, etc.) — ya usan `dark:` prefix
- ✅ `__root.tsx` — ya envuelve con `<ThemeProvider>`

### Qué SÍ hay que cambiar

- ❌ CSS `index.css` — selectores invertidos + valores hardcodeados
- ❌ 11 componentes React — clases Tailwind que asumen dark mode fijo

---

## Paso 1: Arreglar selectores CSS (`index.css`)

**Archivo:** `src/index.css`

### 1a. Invertir `:root` y `.light` → `:root` (light) y `.dark`

```css
/* ANTES (roto) */
:root {
  /* Dark mode (default) */
  --bg-base: var(--color-neutral);
  --bg-surface-deep: var(--color-surface-deep);
  ...
}
.light, [data-theme="light"] {
  --bg-base: #f5f5f7;
  --bg-surface-deep: rgba(255, 255, 255, 0.9);
  ...
}

/* DESPUÉS (correcto) */
:root {
  /* Light mode (base — cuando NO hay clase .dark) */
  --bg-base: #f5f5f7;
  --bg-surface-deep: rgba(255, 255, 255, 0.9);
  --bg-surface-material: rgba(255, 255, 255, 0.7);
  --bg-surface-thick: rgba(245, 245, 247, 0.85);
  --bg-surface-form: rgba(0, 0, 0, 0.06);
  --border-glass: rgba(0, 0, 0, 0.12);
  --text-primary: #1a1a1a;
  --text-secondary: rgba(0, 0, 0, 0.55);
  --text-muted: rgba(0, 0, 0, 0.35);
  --accent-primary: var(--color-primary);
  --accent-secondary: var(--color-secondary);
}
.dark {
  /* Dark mode — activado cuando next-themes añade class="dark" */
  --bg-base: var(--color-neutral);
  --bg-surface-deep: var(--color-surface-deep);
  --bg-surface-material: var(--color-surface-material);
  --bg-surface-thick: var(--color-surface-deep);
  --bg-surface-form: var(--color-surface-form);
  --border-glass: var(--color-border-glass);
  --text-primary: var(--color-on-primary);
  --text-secondary: var(--color-text-dim);
  --text-muted: var(--color-text-muted);
  --accent-primary: var(--color-primary);
  --accent-secondary: var(--color-secondary);
}
```

### 1b. Reemplazar `#000000` hardcodeado en `html` y `body`

```css
/* ANTES */
html {
  background-color: #000000;
}
body {
  background-color: #000000;
}

/* DESPUÉS */
html {
  background-color: var(--bg-base);
}
body {
  background-color: var(--bg-base);
}
```

### 1c. Reemplazar valores hardcodeados en clases de componentes CSS

| Clase                       | Propiedad          | Antes                           | Después                      |
| --------------------------- | ------------------ | ------------------------------- | ---------------------------- |
| `.btn-glass`                | `background-color` | `rgba(255,255,255,0.1)`         | `var(--bg-surface-material)` |
| `.btn-glass:hover`          | `background-color` | `rgba(255,255,255,0.15)`        | `var(--bg-surface-deep)`     |
| `.list-item`                | `background-color` | `var(--color-surface-material)` | `var(--bg-surface-material)` |
| `.list-item`                | `border`           | `var(--color-border-glass)`     | `var(--border-glass)`        |
| `.list-item:hover`          | `background-color` | `var(--color-surface-deep)`     | `var(--bg-surface-deep)`     |
| `.list-item .trailing-icon` | `color`            | `var(--color-text-dim)`         | `var(--text-secondary)`      |

---

## Paso 2: Arreglar clases Tailwind en componentes React

### Mapa de reemplazo de clases

Todas las variables semánticas del CSS están disponibles como utilidades Tailwind vía `@theme`:

| Variable CSS            | Utilidad Tailwind        |
| ----------------------- | ------------------------ |
| `--text-primary`        | `text-text-primary`      |
| `--text-secondary`      | `text-text-secondary`    |
| `--text-muted`          | `text-text-muted`        |
| `--bg-base`             | `bg-bg-base`             |
| `--bg-surface-deep`     | `bg-bg-surface-deep`     |
| `--bg-surface-material` | `bg-bg-surface-material` |
| `--bg-surface-form`     | `bg-bg-surface-form`     |
| `--border-glass`        | `border-border-glass`    |

### Tabla de reemplazos clase por clase

| Clase hardcodeada        | Reemplazar por                 | Nota               |
| ------------------------ | ------------------------------ | ------------------ |
| `text-white`             | `text-text-primary`            | Texto principal    |
| `text-white/90`          | `text-text-primary/90`         |                    |
| `text-white/80`          | `text-text-primary/80`         |                    |
| `text-white/75`          | `text-text-primary/75`         |                    |
| `text-white/70`          | `text-text-primary/70`         |                    |
| `text-white/60`          | `text-text-primary/60`         |                    |
| `text-white/58`          | `text-text-primary/58`         |                    |
| `text-white/55`          | `text-text-secondary`          | ≈ rgba(0,0,0,0.55) |
| `text-white/50`          | `text-text-muted`              | ≈ muted            |
| `text-white/46`          | `text-text-secondary/75`       |                    |
| `text-white/42`          | `text-text-secondary/70`       |                    |
| `text-white/40`          | `text-text-secondary/70`       |                    |
| `text-white/35`          | `text-text-muted`              |                    |
| `text-white/30`          | `text-text-muted`              |                    |
| `text-white/26`          | `text-text-muted`              | Chevron dim        |
| `bg-black`               | `bg-bg-base`                   | Fondo de página    |
| `bg-black/35`            | `bg-bg-base/65`                | Panel glass        |
| `bg-[#0b0d13]`           | `bg-bg-base`                   | Auth pages         |
| `bg-white/10`            | `bg-bg-surface-material`       | Superficie glass   |
| `bg-white/14`            | `bg-bg-surface-material`       | Toggle off         |
| `bg-white/20`            | `bg-bg-surface-deep`           | Hover glass        |
| `bg-white/5`             | `bg-bg-surface-form/50`        | Hover sutil        |
| `bg-white/[0.025]`       | `bg-bg-surface-form/40`        | Hover muy sutil    |
| `bg-white/2.5`           | `bg-bg-surface-form/40`        | Active sutil       |
| `border-white/18`        | `border-border-glass`          |                    |
| `border-white/15`        | `border-border-glass`          |                    |
| `border-white/30`        | `border-border-glass`          |                    |
| `border-white/20`        | `border-border-glass`          |                    |
| `border-white/10`        | `border-border-glass/60`       |                    |
| `bg-white/9` (Separator) | `border-border-glass/50`       |                    |
| `hover:bg-white/10`      | `hover:bg-bg-surface-material` |                    |
| `hover:bg-white/5`       | `hover:bg-bg-surface-form/50`  |                    |
| `hover:bg-white/20`      | `hover:bg-bg-surface-deep`     |                    |
| `hover:text-white/80`    | `hover:text-text-primary/80`   |                    |
| `hover:text-white`       | `hover:text-text-primary`      |                    |
| `active:bg-white/2.5`    | `active:bg-bg-surface-form/40` |                    |

### Archivos a modificar

| #   | Archivo                                        | Clases a reemplazar                                                                                                                                                                                                                                                                           | Cantidad aprox. |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 1   | `src/components/app/settings-page.tsx`         | `text-white`, `text-white/42`, `text-white/46`, `text-white/58`, `text-white/60`, `text-white/90`, `bg-black`, `border-white/10`, `border-white/18`, `bg-white/14`, `bg-white/[0.025]`, `active:bg-white/2.5`, `bg-white/9`, `hover:bg-white/[0.025]`, `hover:text-white/42`, `text-white/26` | ~35             |
| 2   | `src/components/app/history-page.tsx`          | `text-white`, `bg-black`                                                                                                                                                                                                                                                                      | ~5              |
| 3   | `src/components/app/studio-page.tsx`           | `text-white`, `bg-black`, `border-white/20`, `text-white/60`, `hover:bg-white/5`, `hover:text-white`                                                                                                                                                                                          | ~7              |
| 4   | `src/components/app/points-balance-card.tsx`   | `text-white`, `bg-white/10`, `hover:bg-white/20`                                                                                                                                                                                                                                              | ~4              |
| 5   | `src/components/app/pro-tip-banner.tsx`        | `text-white/80`, `text-white` (highlight)                                                                                                                                                                                                                                                     | ~2              |
| 6   | `src/components/app/activity-history-link.tsx` | `text-white`, `text-white/40`, `hover:bg-white/10`                                                                                                                                                                                                                                            | ~3              |
| 7   | `src/components/custom-select.tsx`             | `text-white`, `text-white/40`, `hover:bg-white/10`, `bg-white/10`                                                                                                                                                                                                                             | ~5              |
| 8   | `src/components/bottom-nav-bar.tsx`            | `hover:text-white/80`                                                                                                                                                                                                                                                                         | ~1              |
| 9   | `src/components/top-app-bar.tsx`               | `text-white`                                                                                                                                                                                                                                                                                  | ~1              |
| 10  | `src/routes/index.tsx`                         | `text-white`, `text-white/75`, `text-white/80`, `text-white/55`, `text-white/50`, `text-white/30`, `bg-[#0b0d13]`, `bg-black/35`, `border-white/15`, `border-white/30`, `bg-white/10`, `hover:bg-white/10`                                                                                    | ~20             |
| 11  | `src/routes/verify-email.tsx`                  | `text-white`, `text-white/70`, `text-white/50`, `text-white/30`, `bg-[#0b0d13]`, `bg-black/35`, `border-white/15`, `border-white/30`, `hover:bg-white/10`                                                                                                                                     | ~12             |

---

## Paso 3: Shadows y gradientes con rgba hardcoded

Los `shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]` y gradientes como `bg-linear-to-b from-[rgba(24,24,26,0.96)]` en `settings-page.tsx` también asumen dark mode. Estos son más complejos porque Tailwind no permite usar variables CSS dentro de arbritary values fácilmente.

### Estrategia para shadows/gradientes

**Opción A (recomendada):** Declarar los shadows como variables CSS en `@theme` y usarlas:

```css
/* En @theme añadir: */
--shadow-glass-card-light: 0 0 0 0.5px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(0, 0, 0, 0.03);
--shadow-glass-card-dark:
  0 0 0 0.5px rgba(255, 255, 255, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.05);
```

Luego en `:root` y `.dark` definir:

```css
:root {
  --shadow-glass-card: var(--shadow-glass-card-light);
}
.dark {
  --shadow-glass-card: var(--shadow-glass-card-dark);
}
```

Y en React: `shadow-glass-card` como utilidad Tailwind.

**Opción B (más simple):** Usar `dark:` prefix de Tailwind para duplicar:

```tsx
className =
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]";
```

Pero esto es redundante. Mejor Opción A.

### Gradientes de card backgrounds

Los gradientes como `bg-linear-to-b from-[rgba(24,24,26,0.96)] to-[rgba(16,16,18,0.98)]` necesitan un par light/dark. Estrategia similar: variables CSS semánticas.

| Variable               | Dark                                   | Light                            |
| ---------------------- | -------------------------------------- | -------------------------------- |
| `--gradient-card-from` | `rgba(24,24,26,0.96)`                  | `rgba(255,255,255,0.96)`         |
| `--gradient-card-to`   | `rgba(16,16,18,0.98)`                  | `rgba(245,245,247,0.98)`         |
| `--shadow-inset-1`     | `inset 0 1px 0 rgba(255,255,255,0.06)` | `inset 0 1px 0 rgba(0,0,0,0.04)` |

Esto se puede abordar en una segunda fase si la prioridad es tener el dark mode funcional primero.

---

## Paso 4: Verificar que el toggle funciona

1. Abrir la app → debe verse en dark mode (default)
2. Click en `ModeToggle` → cambiar a "Light" → fondo debe cambiar a `#f5f5f7`, textos a oscuro
3. Click en "System" → debe seguir la preferencia del OS
4. Recargar página → debe persistir la elección (localStorage `vite-ui-theme`)

---

## Orden de ejecución

1. **Paso 1** — CSS (`index.css`) → es la base, sin esto nada funciona
2. **Paso 2** — Componentes React → reemplazar clases hardcodeadas
3. **Paso 3** — Shadows/gradientes → refinamiento, puede ser fase 2
4. **Paso 4** — Testing visual manual

### Estimación

| Paso | Archivos     | Cambios        | Tiempo est. |
| ---- | ------------ | -------------- | ----------- |
| 1    | 1 archivo    | ~8 edits       | 5 min       |
| 2    | 11 archivos  | ~95 reemplazos | 20 min      |
| 3    | 2-3 archivos | ~10 reemplazos | 10 min      |
| 4    | —            | —              | 5 min       |

---

## Notas

- Los componentes shadcn (`button.tsx`, `input.tsx`, `badge.tsx`, etc.) ya usan `dark:` prefix correctamente → **no necesitan cambios**
- El `ModeToggle` y `ThemeProvider` ya funcionan → **no necesitan cambios**, son el accionador del tema
- El directorio `old/` es código legacy → **no tocar**
- `defaultTheme="dark"` en `ThemeProvider` mantiene el comportamiento actual (dark por defecto)
- Las 3 opciones del toggle (Light / Dark / System) ya están implementadas — al arreglar el CSS y las clases React, todas funcionarán automáticamente
- `disableTransitionOnChange` evita flash de color al cambiar de tema — mantenerlo
