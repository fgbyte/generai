# generai

<div align="center">

[![CI](https://img.shields.io/github/actions/workflow/status/fgbyte/generai/ci.yml?style=flat-square)](https://github.com/fgbyte/generai/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/types-TypeScript-3178C6?style=flat-square)](https://www.typescriptlang.org)
[![Built with Turborepo](https://img.shields.io/badge/built%20with-Turborepo-ef4444?style=flat-square)](https://turbo.build)
[![Bun](https://img.shields.io/badge/runtime-Bun-%23f9f9f9?style=flat-square)](https://bun.sh)

</div>

Generai is an AI‑powered content‑generation platform that helps users create engaging social‑media posts and captions, and schedule them to be published on specific dates across various social networks.

## Features

| Feature                            | Description                                                     |
| ---------------------------------- | --------------------------------------------------------------- |
| ⚛️ **React + TanStack Router**     | Type-safe file-based routing with full type safety              |
| 🎨 **Tailwind CSS v4 + shadcn/ui** | Modern utility-first CSS with production‑ready components       |
| ⚡ **Hono**                        | Lightweight, performant server framework for Cloudflare Workers |
| 🗄️ **Drizzle ORM + PostgreSQL**    | TypeScript-first ORM with migrations and type-safe queries      |
| 🔐 **Better Auth**                 | Full authentication (email/password, OAuth, session management) |
| 📧 **Postmark**                    | Transactional email delivery                                    |
| 📦 **Turborepo**                   | Optimized monorepo build system with smart caching              |
| 🔍 **Oxlint + Oxfmt**              | Fast linting and formatting (no ESLint/Prettier)                |
| 🔄 **TanStack Query**              | Async state management and server data synchronization          |
| ☁️ **Cloudflare Workers**          | Edge-deployed server runtime via Alchemy                        |

## Environment Variables

⚠️ **IMPORTANT**: This project requires environment variables to be configured per environment.

Create environment files for each stage:

**apps/web/.env.{stage}** - Frontend variables:

- `.env.dev` - Development
- `.env.staging` - Staging
- `.env.production` - Production

**apps/server/.env.{stage}** - Backend variables:

- `.env.dev` - Development
- `.env.staging` - Staging
- `.env.production` - Production

### Required Variables

**apps/web/.env.{stage}:**

```
VITE_SERVER_URL=https://server-{stage}.your-domain.workers.dev
```

**apps/server/.env.{stage}:**

```
DATABASE_URL=postgresql://user:pass@host/db-{stage}?sslmode=require
CORS_ORIGIN=https://web-{stage}.your-domain.workers.dev
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=https://server-{stage}.your-domain.workers.dev
POSTMARK_SERVER_TOKEN=your-token
POSTMARK_FROM_EMAIL=your-email
```

> **Note**: Each stage uses a separate database. Use different DATABASE_URL values.

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/server/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:

```bash
bun run db:push
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## Deployment (Cloudflare via Alchemy)

This project supports multi-environment deployments.

### Deploy Commands

```bash
bun run deploy:dev      # Deploy to dev
bun run deploy:staging  # Deploy to staging
bun run deploy:prod     # Deploy to production
```

### Destroy Commands

```bash
bun run destroy:dev      # Destroy dev
bun run destroy:staging  # Destroy staging
bun run destroy:prod     # Destroy production
```

Each stage creates isolated Workers:

- `generai-web-dev` / `generai-server-dev`
- `generai-web-staging` / `generai-server-staging`
- `generai-web-production` / `generai-server-production`

See [ENVIRONMENTS.md](./docs/ENVIRONMENTS.md) for details.

## Project Structure

```
generai/
├── apps/
│   ├── web/          # React + TanStack Router frontend
│   └── server/       # Hono API backend
├── packages/
│   ├── auth/         # Better-Auth configuration
│   ├── db/           # Drizzle schema, queries, migrations
│   ├── mail/         # Postmark email service
│   ├── infra/        # Alchemy deployment config
│   ├── config/       # Shared TypeScript configs
│   └── env/          # Environment validation (T3 env)
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run db:push`: Push schema changes to database
- `bun run db:studio`: Open database studio UI
- `bun run check`: Run Oxlint and Oxfmt

### Deployment

- `bun run deploy:dev`: Deploy to development
- `bun run deploy:staging`: Deploy to staging
- `bun run deploy:prod`: Deploy to production
- `bun run destroy:dev`: Destroy development
- `bun run destroy:staging`: Destroy staging
- `bun run destroy:prod`: Destroy production

## Git Hooks and Formatting

- Format and lint fix: `bun run check`

## Dependency Automation

Dependency updates are automated with Dependabot, a Bun catalog updater, CI gating, and branch protection. This is a safety-critical setup: `main` must be protected and `CI / ci` must be required before enabling dependency automerge.

See:

- [Dependency Automation](./docs/dependency-automation.md)
- [Dependency Automation Checklist](./docs/DEPENDENCY_AUTOMATION_CHECKLIST.md)

---

## Contributing

We welcome contributions from the community! Whether you're fixing a bug, adding a feature, or improving documentation, your help is appreciated.

Please read our [Contributing Guide](./docs/CONTRIBUTING.md) for:

- Development setup and workflow
- Coding conventions (TypeScript, Oxlint, Drizzle, etc.)
- Commit message guidelines (Conventional Commits)
- Pull request process and checklist

This project is governed by a [Code of Conduct](./docs/CODE_OF_CONDUCT.md). By participating, you agree to uphold its standards.

### Quick Links

- [Contributing Guide](./docs/CONTRIBUTING.md)
- [Code of Conduct](./docs/CODE_OF_CONDUCT.md)
- [Security Policy](./docs/SECURITY.md)
- [Report a Bug](.github/ISSUE_TEMPLATE/bug_report.md)
- [Request a Feature](.github/ISSUE_TEMPLATE/feature_request.md)

## License

Distributed under the **MIT License**. See [LICENSE](./LICENSE) for more information.
