# Dependency Automation

This project uses two complementary flows:

- Dependabot for regular workspace dependencies.
- A custom catalog updater for Bun `workspaces.catalog` dependencies.

This split is required because Bun catalog dependencies are not handled well by Dependabot.

## Files Involved

- `.github/dependabot.yml`
- `.github/workflows/ci.yml`
- `.github/workflows/dependabot-automerge.yml`
- `.github/workflows/catalog-updater.yml`
- `scripts/update-catalogs.ts`

## Desired Behavior

- Patch + minor updates:
  - PR is created
  - `CI` workflow runs
  - if CI passes, PR is squash-merged automatically
- Major updates:
  - PR is created
  - left open for manual review

## How The Flows Work

### 1) Dependabot flow

1. Dependabot opens PRs from `.github/dependabot.yml`.
2. `CI` runs on every PR to `main`/`master`.
3. `Dependabot Auto-Merge` enables `--auto --squash` for patch/minor Dependabot PRs.
4. Major Dependabot PRs remain manual.

### 2) Catalog updater flow

1. `Catalog Updater` workflow runs on schedule or manual dispatch.
2. It executes `scripts/update-catalogs.ts`.
3. Script checks npm latest versions for packages in `workspaces.catalog`.
4. Script creates two branches/PRs:

- `safe`: patch + minor
- `major`: major only

5. For `safe`, script waits for checks and merges with squash only after checks pass.
6. `major` PR remains open for manual review.

## Important GitHub Configuration

Without this configuration, the workflow can fail with:
`GitHub Actions is not permitted to create or approve pull requests`
or safe PRs can be created without triggering CI.

### A) Actions repository settings

Go to:
`Repo -> Settings -> Actions -> General`

Set:

- `Workflow permissions` -> `Read and write permissions`
- enable `Allow GitHub Actions to create and approve pull requests`

### B) Repository secret for automation token

Create repository secret:

- Name: `AUTOMATION_GH_TOKEN`
- Value: GitHub PAT used by `catalog-updater.yml`

Where it is used:

- `actions/checkout` token in `catalog-updater.yml`
- `GH_TOKEN` env for `gh` commands in `catalog-updater.yml`

This token is required so PRs created by the updater can trigger downstream workflows (CI).

### C) Token scopes/permissions

Option 1: Classic PAT

- Scope: `repo`

Option 2: Fine-grained PAT (recommended)

- Repository access: only this repo
- Permissions:
  - `Contents`: Read and write
  - `Pull requests`: Read and write
  - `Workflows`: Read and write (or read if your org policy requires it)

## Why `GITHUB_TOKEN` Was Not Enough

Using the default `GITHUB_TOKEN` to create PRs can prevent expected follow-up workflow triggers in some automation chains. In practice this caused:

- safe PR created
- no checks reported
- merge step timing out

Using `AUTOMATION_GH_TOKEN` resolves this by creating PRs as a normal token identity, allowing CI to run as expected.

## Operational Runbook

### Manual test

1. Trigger `Catalog Updater` from Actions UI (`workflow_dispatch`).
2. Confirm it creates:

- one `safe` PR
- one `major` PR (if major updates exist)

3. Confirm `CI` appears on `safe` PR.
4. Confirm `safe` merges automatically after CI success.
5. Confirm `major` remains open.

### Local script dry run

```bash
bun run scripts/update-catalogs.ts --dry-run
```

## Troubleshooting

### Error: `createPullRequest not permitted`

Fix:

- enable Actions setting to allow create/approve PRs
- verify `AUTOMATION_GH_TOKEN` secret exists and is used

### Error: `no checks reported on branch`

Fix:

- ensure `catalog-updater.yml` uses `AUTOMATION_GH_TOKEN`, not `GITHUB_TOKEN`
- ensure `ci.yml` runs on `pull_request` for target branch

### Error about lockfile path (`bun.lockb` not found)

Fix:

- script already supports both `bun.lock` and `bun.lockb`
- verify repository lockfile naming if you fork to another project

## Reuse In Other Projects

When copying this setup:

1. Copy the same workflow/script pattern.
2. Add `AUTOMATION_GH_TOKEN` secret in target repo.
3. Enable Actions PR create/approve permission in target repo.
4. Verify CI workflow triggers on PRs.
5. Run one manual dispatch and validate safe/major behavior.
