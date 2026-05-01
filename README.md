# generai

This project is a modified version of [Better Fullstack](https://github.com/Marve10s/Better-Fullstack), a modern TypeScript stack that combines React, TanStack Router, Hono, and more.

⚠️ **Note**: This is not the original template. It has been modified and optimized, so it may differ from the original Better Fullstack template.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - CSS framework
- **shadcn/ui** - UI components
- **Hono** - Lightweight, performant server framework
- **workers** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better Auth
- **Turborepo** - Optimized monorepo build system
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **TanStack Query** - Async state management & data fetching

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

See [ENVIRONMENTS.md](./packages/infra/ENVIRONMENTS.md) for details.

## Git Hooks and Formatting

- Format and lint fix: `bun run check`

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
