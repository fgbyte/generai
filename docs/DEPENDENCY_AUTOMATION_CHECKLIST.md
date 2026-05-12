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

Go to `Settings -> Branches -> Branch protection rules` and protect the default branch:

- `Branch name pattern`: `main`
- enable `Require a pull request before merging`
- enable `Require status checks to pass before merging`
- require the CI check, usually `CI / ci` or `ci`
- enable `Require branches to be up to date before merging`
- enable `Block force pushes`

This is required as a repository-level safety rail. Without branch protection, `gh pr merge --auto` can merge without waiting for failing checks because GitHub has no required checks to enforce.

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
- `ci.yml` must include `bun install --frozen-lockfile` so lockfile drift fails CI.
- `dependabot-automerge.yml` should merge only patch/minor Dependabot PRs.
- `dependabot-automerge.yml` must explicitly wait for the `CI` workflow to pass before merging. Do not rely only on `gh pr merge --auto` unless the branch has required checks.
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
6. Open a test PR with failing CI and confirm GitHub blocks merge into `main`.
7. Confirm `Dependabot Auto-Merge` fails before merge when the `CI` workflow fails.

## 7) Common Failures

- `createPullRequest not permitted`:
  - fix Actions permissions and secret token config.
- `no checks reported`:
  - ensure PR is created via `AUTOMATION_GH_TOKEN`, not default `GITHUB_TOKEN`.
- lockfile mismatch/path errors:
  - ensure script handles your lockfile (`bun.lock` or `bun.lockb`).
- Dependabot PR merged with failing CI:
  - protect `main` and require `CI / ci`
  - ensure `dependabot-automerge.yml` waits for the `CI` workflow before running `gh pr merge`
- Bun `minimumReleaseAge` blocks installs:
  - expected for packages published too recently
  - Dependabot should use `cooldown` in `.github/dependabot.yml`
  - keep `bun install --frozen-lockfile` in CI so unsafe or incomplete updates fail closed
