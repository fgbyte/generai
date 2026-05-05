# Dependency Automation Checklist

Use this checklist to replicate the dependency automation setup in another repository.

## 1) Files To Copy/Adapt

- `.github/dependabot.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/dependabot-automerge.yml`
- `.github/workflows/catalog-updater.yml`
- `scripts/update-catalogs.ts`

## 2) Repository Settings (Required)

Go to `Settings -> Actions -> General` and set:

- `Workflow permissions`: `Read and write permissions`
- enable `Allow GitHub Actions to create and approve pull requests`

## 3) Create Repository Secret (Required)

Create secret:

- Name: `AUTOMATION_GH_TOKEN`
- Value: PAT token

Recommended token options:

- Classic PAT: scope `repo`
- Fine-grained PAT:
  - `Contents`: Read and write
  - `Pull requests`: Read and write
  - `Workflows`: Read and write (or read if policy requires)

## 4) Workflow Requirements

- `ci.yml` must run on `pull_request` to your default branch.
- `dependabot-automerge.yml` should auto-merge only patch/minor.
- `catalog-updater.yml` must use `AUTOMATION_GH_TOKEN` in:
  - `actions/checkout` token
  - `GH_TOKEN` env for script/`gh` commands

## 5) Expected Behavior

- Patch + minor updates:
  - PR created
  - CI checks run
  - PR auto-merged with squash if checks pass
- Major updates:
  - PR created
  - manual review required

## 6) Validation Steps

1. Trigger `Catalog Updater` manually (`workflow_dispatch`).
2. Confirm `safe` PR appears.
3. Confirm `CI` checks appear on `safe` PR.
4. Confirm `safe` PR merges automatically after CI success.
5. Confirm `major` PR is open and not auto-merged.

## 7) Common Failures

- `createPullRequest not permitted`:
  - fix Actions permissions and secret token config.
- `no checks reported`:
  - ensure PR is created via `AUTOMATION_GH_TOKEN`, not default `GITHUB_TOKEN`.
- lockfile mismatch/path errors:
  - ensure script handles your lockfile (`bun.lock` or `bun.lockb`).
