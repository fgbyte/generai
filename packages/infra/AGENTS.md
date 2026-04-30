# packages/infra

**Scope**: Infrastructure as Code - Alchemy + Cloudflare

## Overview

Deployment configuration using Alchemy framework for Cloudflare Workers, D1, KV, and other resources.

## Structure

```
packages/infra/
├── src/
│   └── index.ts         # Alchemy stack definition
├── .alchemy/            # Alchemy outputs (generated)
└── package.json
```

## Where to Look

| Task | Location |
|------|----------|
| Cloudflare resources | `src/index.ts` - Workers, D1, KV definitions |
| Deploy script | `bun run deploy` (from root) |
| Local dev | `bun run dev` - runs with miniflare |

## Conventions

- **Alchemy**: TypeScript IaC framework for Cloudflare
- **Resources**: Define Workers, D1 database, KV namespaces in `src/index.ts`
- **Dev**: `alchemy dev` for local emulation
- **Deploy**: `alchemy deploy` to Cloudflare

## Anti-Patterns

- **NEVER edit** `.alchemy/` directory - auto-generated
- **No hardcoded secrets** - use env vars
- **No direct CF API calls** - use Alchemy resources

## Multi-Environment Setup (NEW)

The project now supports multiple environments (dev/staging/prod) using Alchemy's native stage system.

### Environment Files
- `apps/web/.env.{dev,staging,production}` - Frontend variables (VITE_SERVER_URL)
- `apps/server/.env.{dev,staging,production}` - Backend variables (DATABASE_URL, CORS_ORIGIN, etc.)

### Deploy Commands
```bash
bun run deploy:dev      # Deploy to dev environment
bun run deploy:staging  # Deploy to staging environment
bun run deploy:prod     # Deploy to production environment
```

### Destroy Commands
```bash
bun run destroy:dev      # Destroy dev resources
bun run destroy:staging  # Destroy staging resources
bun run destroy:prod     # Destroy production resources
```

### Important: adopt: true
When creating Workers, always set `adopt: true` to allow redeployment without conflicts:

```typescript
export const web = await Vite("web", {
  cwd: "../../apps/web",
  assets: "dist",
  adopt: true,  // ← Key setting for redeployment
  bindings: { ... },
});

export const server = await Worker("server", {
  cwd: "../../apps/server",
  entrypoint: "src/index.ts",
  adopt: true,  // ← Key setting for redeployment
  bindings: { ... },
});
```

This allows the same stage to be deployed multiple times (redeploy) without "Worker already exists" errors.

### Documentation
See [ENVIRONMENTS.md](/docs/ENVIRONMENTS.md) for detailed usage guide.

## Commands

```bash
# From root:
bun run dev      # Runs infra + db in dev mode
bun run deploy   # Deploy to Cloudflare
bun run destroy  # Destroy Alchemy resources
```

## Notes

- Requires `.env` and `.env.local` in this directory
- See `.env.example` for required variables
- Alchemy outputs to `.alchemy/` (gitignored)
- Stateful resources (DB) preserved on destroy/redeploy
