# Dependency Automation

This document explains how dependency updates work in this monorepo.

## Overview

We automate dependency updates using two complementary systems:

- **Dependabot** handles updates for all workspace packages
- **Catalog Updater Script** handles root-level catalog dependencies

This dual approach is necessary because of a limitation with Bun's catalog protocol.

## Architecture

```
+------------------+     +-------------------+
|   Dependabot     |     | Catalog Updater   |
|   (npm ecosystem)|     |    (Script)       |
+--------+---------+     +---------+---------+
         |                           |
         v                           v
+------------------+     +-------------------+
|  Workspace Apps  |     |  Root package.json|
|  and Packages    |     |  (catalog deps)   |
+--------+---------+     +---------+---------+
         |                           |
         +-------------+-------------+
                       v
              +------------------+
              |   Auto-Merge     |
              | (patch only)     |
              +--------+---------+
                       |
                       v
              +------------------+
              | Lockfile Check   |
              | (bun.lock)       |
              +------------------+
```

## Dependabot Configuration

Dependabot monitors all workspaces using the npm ecosystem. It creates PRs when updates are available.

Key settings:

- **Update frequency**: Daily at 6 AM UTC
- **Ecosystem**: npm (not bun)
- **Auto-merge**: Enabled for patch updates only
- **Version prefix**: Preserved from original

### Why npm Instead of Bun

Dependabot's bun ecosystem support is limited. It does not understand the catalog protocol used in this project. Using npm ensures Dependabot correctly parses and updates versions.

## Catalog Updater Script

The script at `scripts/update-catalogs.ts` handles root-level catalog dependencies.

### What It Does

1. Reads the `catalog` field from root `package.json`
2. Queries npm registry for each catalog package
3. Compares current version with latest available
4. Updates versions while preserving prefixes (^, ~, >=)
5. Groups updates by type (patch/minor/major)
6. Creates a PR with the changes

### Running the Script

```bash
# Dry run (no changes)
bun run scripts/update-catalogs.ts --dry-run

# Actual update (creates PR)
bun run scripts/update-catalogs.ts
```

### Bun Catalog Limitation

Dependabot cannot update Bun catalog dependencies. The catalog protocol is a Bun-specific feature that maps package names to versions in a central location. Dependabot's parser does not recognize this structure.

This is why we use a custom script instead of relying solely on Dependabot.

## Auto-Merge

Patch updates are auto-merged to keep the codebase current with minimal friction.

Conditions for auto-merge:

- Update type is PATCH (x.y.Z where Z changes)
- All status checks pass
- No conflicts with base branch

Minor and major updates require manual review.

## Lockfile Verification

Every dependency PR runs a lockfile check to ensure integrity.

The workflow:

1. Installs dependencies with `bun install`
2. Checks that `bun.lock` is unchanged
3. Fails if lockfile was modified unexpectedly

This prevents partial or corrupted updates.

## Team Workflow

### Handling Dependabot PRs

1. Review the PR description for affected packages
2. Check changelog links provided by Dependabot
3. For patch updates: Verify CI passes (auto-merge handles the rest)
4. For minor/major updates: Review breaking changes, test locally, approve or request changes

### Handling Catalog Updater PRs

1. Review the PR summary showing all available updates
2. Updates are grouped by type (patch/minor/major)
3. Test locally if needed: `bun install && bun run dev`
4. Approve and merge, or request changes

### General Guidelines

- Do not squash-merge dependency PRs (preserve history)
- Monitor for PRs weekly to stay current
- Address security updates promptly regardless of size

## Troubleshooting

### PR Fails Lockfile Check

**Symptom**: CI fails with "Lockfile mismatch" error.

**Cause**: The update did not properly regenerate the lockfile.

**Fix**: Run `bun install` locally and commit the updated `bun.lock`.

### Dependabot Misses Catalog Updates

**Symptom**: Root `package.json` catalog dependencies are not updated.

**Cause**: This is expected. Dependabot does not support the catalog protocol.

**Fix**: Run the catalog updater script manually or wait for the scheduled workflow.

### Script Fails to Create PR

**Symptom**: Script runs but no PR appears.

**Cause**: Likely not authenticated with GitHub CLI.

**Fix**: Run `gh auth login` and retry.

### npm Registry Errors

**Symptom**: Script shows "Failed to fetch" for a package.

**Cause**: Network issue or package name typo.

**Fix**: Verify package exists on npm. Check network connectivity.

### Version Prefix Lost

**Symptom**: `^1.2.3` becomes `1.2.3` after update.

**Cause**: Bug in the update logic.

**Fix**: Report issue. Manually restore prefix and merge PR.

## Summary

| System | Scope | Auto-Merge | Limitation |
|--------|-------|------------|------------|
| Dependabot | Workspace packages | Patch only | No catalog support |
| Catalog Script | Root catalog deps | None (manual) | Custom solution |

Both systems work together to keep dependencies current while respecting the monorepo structure.