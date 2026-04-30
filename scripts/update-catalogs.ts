#!/usr/bin/env bun
/**
 * Catalog Updater Script
 *
 * Updates catalog dependencies in root package.json by checking npm registry.
 * Detects patch/minor/major updates and creates a PR for changes.
 *
 * Usage:
 *   bun scripts/update-catalogs.ts [--dry-run]
 */

import { $ } from 'bun'

interface NpmPackageInfo {
  'dist-tags': {
    latest: string
  }
  versions: Record<string, any>
}

interface CatalogEntry {
  name: string
  currentVersion: string
  latestVersion: string
  updateType: 'patch' | 'minor' | 'major' | 'none'
}

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

console.log(`📦 Catalog Updater${dryRun ? ' (dry-run mode)' : ''}`)
console.log('================================\n')

// Read root package.json
const packageJsonPath = './package.json'
const packageJsonText = await Bun.file(packageJsonPath).text()
const packageJson = JSON.parse(packageJsonText) as any
const catalog = packageJson.workspaces?.catalog || {}

if (Object.keys(catalog).length === 0) {
  console.log('❌ No catalog dependencies found in package.json')
  process.exit(1)
}

console.log(`📋 Found ${Object.keys(catalog).length} catalog dependencies\n`)

// Check each dependency
const updates: CatalogEntry[] = []
const errors: string[] = []

for (const [name, version] of Object.entries(catalog)) {
  try {
    const currentVersion = version as string
    const prefix = currentVersion.match(/^[\^~>=]/)?.[0] || ''

    // Query npm registry
    const response = await fetch(`https://registry.npmjs.org/${name}`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = (await response.json()) as NpmPackageInfo
    const latestVersion = data['dist-tags'].latest

    // Parse versions
    const currentSemver = currentVersion.replace(/^[\^~>=]/, '')
    const latestSemver = latestVersion

    // Determine update type
    let updateType: 'patch' | 'minor' | 'major' | 'none' = 'none'

    if (currentSemver !== latestSemver) {
      const currentParts = currentSemver.split('.').map(Number)
      const latestParts = latestSemver.split('.').map(Number)

      if (latestParts[0] > currentParts[0]) {
        updateType = 'major'
      } else if (latestParts[1] > currentParts[1]) {
        updateType = 'minor'
      } else {
        updateType = 'patch'
      }
    }

    if (updateType !== 'none') {
      updates.push({
        name,
        currentVersion,
        latestVersion: prefix + latestVersion,
        updateType
      })
    }
  } catch (error) {
    const errorMsg = `Failed to check ${name}: ${error instanceof Error ? error.message : String(error)}`
    errors.push(errorMsg)
    console.log(`⚠️  ${errorMsg}`)
  }
}

// Report results
console.log('\n📊 Update Summary')
console.log('================')

if (updates.length === 0) {
  console.log('✅ All catalog dependencies are up to date!')
  process.exit(0)
}

// Group by update type
const patchUpdates = updates.filter(u => u.updateType === 'patch')
const minorUpdates = updates.filter(u => u.updateType === 'minor')
const majorUpdates = updates.filter(u => u.updateType === 'major')

console.log(`\n🔵 Patch updates (${patchUpdates.length}):`)
patchUpdates.forEach(u => {
  console.log(`  ${u.name}: ${u.currentVersion} → ${u.latestVersion}`)
})

console.log(`\n🟢 Minor updates (${minorUpdates.length}):`)
minorUpdates.forEach(u => {
  console.log(`  ${u.name}: ${u.currentVersion} → ${u.latestVersion}`)
})

console.log(`\n🔴 Major updates (${majorUpdates.length}):`)
majorUpdates.forEach(u => {
  console.log(`  ${u.name}: ${u.currentVersion} → ${u.latestVersion}`)
})

if (errors.length > 0) {
  console.log(`\n⚠️  Errors (${errors.length}):`)
  errors.forEach(e => console.log(`  ${e}`))
}

// Apply updates
if (!dryRun) {
  console.log('\n🔄 Applying updates...')

  // Update package.json
  for (const update of updates) {
    packageJson.workspaces.catalog[update.name] = update.latestVersion
  }

  await Bun.write(packageJsonPath, JSON.stringify(packageJson, null, 2))
  console.log('✅ Updated package.json')

  // Run bun install to update bun.lock
  console.log('📦 Running bun install...')
  const installResult = await $`bun install`.quiet()

  if (installResult.exitCode !== 0) {
    console.log('❌ bun install failed')
    process.exit(1)
  }

  console.log('✅ Updated bun.lock')

  // Create PR
  console.log('\n📝 Creating pull request...')

  const branchName = `chore/update-catalog-${Date.now()}`
  await $`git checkout -b ${branchName}`.quiet()
  await $`git add package.json bun.lockb`.quiet()
  await $`git commit -m "chore: update catalog dependencies"`.quiet()

  const prTitle = 'chore: update catalog dependencies'
  const prBody = `## Summary

Updates catalog dependencies to latest versions.

### Changes

${updates.map(u => `- ${u.name}: ${u.currentVersion} → ${u.latestVersion}`).join('\n')}

### Update Types

- Patch: ${patchUpdates.length}
- Minor: ${minorUpdates.length}
- Major: ${majorUpdates.length}

---

Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-openagent)
Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>`

  const prResult = await $`gh pr create --title ${prTitle} --body ${prBody}`.quiet()

  if (prResult.exitCode !== 0) {
    console.log('❌ Failed to create PR')
    process.exit(1)
  }

  console.log('✅ Pull request created!')
} else {
  console.log('\n🔍 Dry-run mode - no changes applied')
  console.log('Run without --dry-run to apply updates and create PR')
}

console.log('\n✨ Done!')
