# Multi-Environment Setup

## Stages Available

- **dev**: Development environment (default)
- **staging**: Pre-production for testing
- **production**: Production environment

## Commands

### Deploy

```bash
# Development
bun run deploy:dev

# Staging
bun run deploy:staging

# Production
bun run deploy:prod
```

### Destroy

```bash
# Development
bun run destroy:dev

# Staging
bun run destroy:staging

# Production
bun run destroy:prod
```

## File Structure

Environment files are located in each app:

```
apps/web/
├── .env.dev
├── .env.staging
└── .env.production

apps/server/
├── .env.dev
├── .env.staging
└── .env.production
```

## Variables per App

### apps/web/.env.{stage}

- `VITE_SERVER_URL`: URL of the backend server worker

### apps/server/.env.{stage}

- `DATABASE_URL`: PostgreSQL connection URL (different per stage)
- `CORS_ORIGIN`: Allowed CORS origin
- `BETTER_AUTH_SECRET`: Authentication secret
- `BETTER_AUTH_URL`: URL of the auth service
- `POSTMARK_SERVER_TOKEN`: Postmark API token
- `POSTMARK_FROM_EMAIL`: Sender email address

## Best Practices

1. Always test in staging before deploying to production
2. Each stage has its own isolated database
3. Workers are automatically named: `{app}-{stage}-{id}`
4. Never commit .env.{stage} files with real values

## Troubleshooting

### Error: Missing required env

Verify that the `.env.{stage}` file exists in the corresponding app directory.

### Workers not named with stage

Check that `stageEnv.ts` is loading correctly and the stage is being detected.
