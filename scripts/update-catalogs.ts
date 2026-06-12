#!/usr/bin/env bun
/**
 * Catalog Updater Script
 *
 * Updates catalog dependencies in root package.json by checking npm registry.
 * Detects patch/minor/major updates and creates separate PRs:
 *   - PR 1: patch + minor updates (auto-merge if CI passes)
 *   - PR 2: major updates (requires manual review)
 *
 * Usage:
 * bun scripts/update-catalogs.ts [--dry-run]
 */

import { $ } from "bun";
import { existsSync } from "node:fs";

interface NpmPackageInfo {
  "dist-tags": { latest: string };
  versions: Record<string, any>;
  time?: Record<string, string>;
}

interface CatalogEntry {
  name: string;
  currentVersion: string;
  latestVersion: string;
  updateType: "patch" | "minor" | "major" | "none";
}

interface SkippedEntry {
  name: string;
  currentVersion: string;
  latestVersion: string;
  reason: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

console.log(`📦 Catalog Updater${dryRun ? " (dry-run mode)" : ""}`);
console.log("================================\n");

// Read root package.json
const packageJsonPath = "./package.json";
const packageJsonText = await Bun.file(packageJsonPath).text();
const packageJson = JSON.parse(packageJsonText) as any;

const catalog = packageJson.workspaces?.catalog || {};
if (Object.keys(catalog).length === 0) {
  console.log("❌ No catalog dependencies found in package.json");
  process.exit(1);
}

console.log(`📋 Found ${Object.keys(catalog).length} catalog dependencies\n`);

// Read minimumReleaseAge from bunfig.toml (if configured) so we can skip
// brand-new releases that bun would refuse to install anyway.
let minimumReleaseAge = 0;
const bunfigPath = "./bunfig.toml";
if (existsSync(bunfigPath)) {
  const bunfigText = await Bun.file(bunfigPath).text();
  const match = bunfigText.match(/minimumReleaseAge\s*=\s*(\d+)/);
  if (match) {
    minimumReleaseAge = Number.parseInt(match[1]!, 10);
    console.log(
      `⏰ minimumReleaseAge: ${minimumReleaseAge}s (${(minimumReleaseAge / 3600).toFixed(1)}h)\n`,
    );
  }
}

// Check each dependency
const updates: CatalogEntry[] = [];
const skipped: SkippedEntry[] = [];
const errors: string[] = [];

for (const [name, version] of Object.entries(catalog)) {
  try {
    const currentVersion = version as string;
    const prefix = currentVersion.match(/^[\^~>=]/)?.[0] || "";

    // Query npm registry
    const response = await fetch(`https://registry.npmjs.org/${name}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as NpmPackageInfo;
    const latestVersion = data["dist-tags"].latest;

    // Parse versions
    const currentSemver = currentVersion.replace(/^[\^~>=]/, "");
    const latestSemver = latestVersion;

    // Determine update type
    let updateType: "patch" | "minor" | "major" | "none" = "none";
    if (currentSemver !== latestSemver) {
      const currentParts = currentSemver.split(".").map(Number);
      const latestParts = latestSemver.split(".").map(Number);
      if (latestParts[0] > currentParts[0]) {
        updateType = "major";
      } else if (latestParts[1] > currentParts[1]) {
        updateType = "minor";
      } else {
        updateType = "patch";
      }
    }

    if (updateType === "none") continue;

    // Skip if the latest version is too new and would be blocked by
    // minimum-release-age. We do not update the catalog entry for it
    // and the other eligible updates can still be installed in this run.
    if (minimumReleaseAge > 0) {
      const publishTime = data.time?.[latestVersion];
      if (publishTime) {
        const ageMs = Date.now() - new Date(publishTime).getTime();
        if (!Number.isNaN(ageMs) && ageMs / 1000 < minimumReleaseAge) {
          const ageSec = Math.round(ageMs / 1000);
          const remainingSec = Math.round(minimumReleaseAge - ageMs / 1000);
          const remainingHours = (remainingSec / 3600).toFixed(1);
          skipped.push({
            name,
            currentVersion,
            latestVersion: prefix + latestVersion,
            reason: `published ${ageSec}s ago, need ${minimumReleaseAge}s (${remainingHours}h remaining)`,
          });
          continue;
        }
      } else {
        console.log(`⚠️ ${name}: no publish time in registry, allowing update`);
      }
    }

    updates.push({
      name,
      currentVersion,
      latestVersion: prefix + latestVersion,
      updateType,
    });
  } catch (error) {
    const errorMsg = `Failed to check ${name}: ${error instanceof Error ? error.message : String(error)}`;
    errors.push(errorMsg);
    console.log(`⚠️ ${errorMsg}`);
  }
}

// Report results
console.log("\n📊 Update Summary");
console.log("================");

if (skipped.length > 0) {
  console.log(`\n⏭️  Skipped due to minimum-release-age (${skipped.length}):`);
  for (const s of skipped) {
    console.log(`  ${s.name}: ${s.currentVersion} → ${s.latestVersion}`);
    console.log(`      ${s.reason}`);
  }
}

if (updates.length === 0) {
  if (skipped.length > 0) {
    console.log("\n✅ No updates applied (blocked by minimum-release-age; will retry next run)");
  } else {
    console.log("\n✅ All catalog dependencies are up to date!");
  }
  process.exit(0);
}

// Group by update type
const patchUpdates = updates.filter((u) => u.updateType === "patch");
const minorUpdates = updates.filter((u) => u.updateType === "minor");
const majorUpdates = updates.filter((u) => u.updateType === "major");
const safeUpdates = [...patchUpdates, ...minorUpdates];

console.log(`\n🔵 Patch updates (${patchUpdates.length}):`);
patchUpdates.forEach((u) => {
  console.log(`  ${u.name}: ${u.currentVersion} → ${u.latestVersion}`);
});

console.log(`\n🟢 Minor updates (${minorUpdates.length}):`);
minorUpdates.forEach((u) => {
  console.log(`  ${u.name}: ${u.currentVersion} → ${u.latestVersion}`);
});

console.log(`\n🔴 Major updates (${majorUpdates.length}):`);
majorUpdates.forEach((u) => {
  console.log(`  ${u.name}: ${u.currentVersion} → ${u.latestVersion}`);
});

if (errors.length > 0) {
  console.log(`\n⚠️ Errors (${errors.length}):`);
  errors.forEach((e) => console.log(`  ${e}`));
}

// Helper: create a PR for a set of updates
async function createPR(
  prUpdates: CatalogEntry[],
  label: "safe" | "major",
): Promise<string | null> {
  if (prUpdates.length === 0) return null;

  console.log(`\n📝 Creating PR for ${label}...`);

  // Re-read package.json to start fresh
  const freshPkg = JSON.parse(await Bun.file(packageJsonPath).text()) as any;

  // Apply only this set of updates
  for (const update of prUpdates) {
    freshPkg.workspaces.catalog[update.name] = update.latestVersion;
  }

  await Bun.write(packageJsonPath, JSON.stringify(freshPkg, null, 2));

  // Run bun install to update bun.lock
  console.log("📦 Running bun install...");
  const installResult = await $`bun install`.quiet();
  if (installResult.exitCode !== 0) {
    console.log("❌ bun install failed");
    process.exit(1);
  }
  console.log("✅ Updated bun.lock");

  // Create branch and PR
  const branchName = `chore/update-catalog-${label}-${Date.now()}`;
  await $`git checkout -b ${branchName}`.quiet();
  await $`git add package.json`.quiet();
  if (existsSync("bun.lock")) {
    await $`git add bun.lock`.quiet();
  } else if (existsSync("bun.lockb")) {
    await $`git add bun.lockb`.quiet();
  } else {
    console.log("❌ No Bun lockfile found after bun install");
    process.exit(1);
  }
  await $`git commit -m "chore: update catalog dependencies (${label})"`.quiet();
  await $`git push -u origin ${branchName}`.quiet();

  const prTitle = `chore: update catalog dependencies (${label})`;
  const prBody = `## Summary
Updates catalog dependencies (${label}) to latest versions.

### Changes
${prUpdates.map((u) => `- ${u.name}: ${u.currentVersion} → ${u.latestVersion}`).join("\n")}

### Update Types
${label === "safe" ? `- Patch: ${patchUpdates.length}\n- Minor: ${minorUpdates.length}` : `- Major: ${majorUpdates.length}`}

---
Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)
Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>`;

  const prResult = await $`gh pr create --title ${prTitle} --body ${prBody}`.quiet();
  if (prResult.exitCode !== 0) {
    console.log("❌ Failed to create PR");
    process.exit(1);
  }
  const prUrl = prResult.text().trim().split("\n").at(-1)?.trim() ?? "";
  if (!prUrl.startsWith("http")) {
    console.log("❌ Could not parse PR URL from gh output");
    process.exit(1);
  }
  console.log(`✅ Pull request created for ${label}: ${prUrl}`);

  if (label === "safe") {
    console.log("⏳ Waiting for PR checks before merging safe updates...");
    let checksDetected = false;
    for (let attempt = 1; attempt <= 20; attempt++) {
      const rollupResult =
        await $`gh pr view ${prUrl} --json statusCheckRollup --jq '.statusCheckRollup | length'`.quiet();
      const count = Number.parseInt(rollupResult.text().trim(), 10);
      if (Number.isFinite(count) && count > 0) {
        checksDetected = true;
        break;
      }
      console.log(`   waiting for checks to appear (${attempt}/20)...`);
      await sleep(15000);
    }
    if (!checksDetected) {
      console.log("❌ Timed out waiting for checks to be reported on safe PR");
      process.exit(1);
    }

    const checksResult = await $`gh pr checks --watch ${prUrl}`.quiet();
    if (checksResult.exitCode !== 0) {
      console.log("❌ Required checks did not pass for safe PR");
      process.exit(1);
    }
    console.log("✅ Checks passed for safe PR");

    console.log("🔀 Merging safe PR with squash...");
    const mergeResult = await $`gh pr merge --squash ${prUrl}`.quiet();
    if (mergeResult.exitCode !== 0) {
      console.log("❌ Failed to merge safe PR");
      process.exit(1);
    }
    console.log("✅ Safe PR merged with squash");
  }

  // Switch back to main for next PR
  await $`git checkout main`.quiet();
  return prUrl;
}

// Apply updates
if (!dryRun) {
  // Create PR for safe updates (patch + minor)
  if (safeUpdates.length > 0) {
    await createPR(safeUpdates, "safe");
  }

  // Create PR for major updates
  if (majorUpdates.length > 0) {
    await createPR(majorUpdates, "major");
  }
} else {
  console.log("\n🔍 Dry-run mode - no changes applied");
  console.log("Run without --dry-run to apply updates and create PRs");
}

console.log("\n✨ Done!");
