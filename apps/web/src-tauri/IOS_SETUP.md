# iOS Development Setup (Tauri)

> **Status (as of 2026-06-05)**: This setup is **NOT DONE** on this machine.
> The iOS scaffold is **macOS-only** — it cannot be generated from Windows or
> Linux. Tauri 2's iOS toolchain shells out to Apple's Xcode CLI, which is
> macOS-exclusive. Follow the steps below on a Mac to produce `gen/ios/`.
>
> **Known platform limitation, not a bug.** This document records the prereqs
> and commands for a future developer (or CI runner) running macOS.
>
> **Reference**: https://v2.tauri.app/start/prerequisites/#ios

## Why macOS-Only

Apple's iOS toolchain is **macOS-exclusive**:

- **Xcode** (the IDE + bundled iOS SDK) only ships for macOS.
- **iOS Simulator** (the device emulator) only runs on macOS.
- **Codesigning + notarization** (required for device deployment and App Store
  submission) only works on macOS.
- The **iOS DeviceSupport / SDK components** download only through Xcode,
  which is macOS-only.

Tauri 2's `tauri ios init`, `tauri ios dev`, and `tauri ios build` subcommands
all shell out to Apple's CLI tools (`xcodebuild`, `xcrun simctl`,
`xcrun --sdk iphoneos ...`, `codesign`, `altool`, etc.). None of these are
available on Windows or Linux, so the iOS workflow is **structurally
infeasible** on those platforms.

This is **not a Tauri limitation** — it is Apple's platform restriction. The
project's Tauri integration plan acknowledges this: iOS scaffold generation is
deferred to whoever has Mac access. The web/desktop workflow (T1-T13) and the
Android workflow (T14-T16) are unaffected.

## Prerequisites Checklist (all required on the Mac)

- [ ] **macOS 13 Ventura or later** (Tauri 2 requires a recent Xcode; macOS 13+ is the safest baseline; macOS 14 Sonoma is recommended for Xcode 15+)
- [ ] **Xcode 15+** (install from the Mac App Store, or via `xcode-select` after downloading the `.xip` from https://developer.apple.com/xcode/)
- [ ] **Xcode Command Line Tools** — if not bundled with Xcode:
  ```bash
  xcode-select --install
  ```
- [ ] **CocoaPods 1.13+** (iOS dependency manager; required for the Tauri project's native iOS Pods):
  ```bash
  # Recommended (Homebrew)
  brew install cocoapods

  # Alternative (RubyGems, slower but works without Homebrew)
  sudo gem install cocoapods
  ```
- [ ] **Rust iOS targets** (run once on the Mac):
  ```bash
  rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
  ```
  - `aarch64-apple-ios` — physical iPhone / iPad (arm64)
  - `aarch64-apple-ios-sim` — Apple Silicon Mac simulator (arm64)
  - `x86_64-apple-ios` — Intel Mac simulator (x86_64)
- [ ] **Node.js / Bun** (for the JS CLI installed in T5; required to run `bun run tauri ios ...`):
  ```bash
  # Bun is recommended (matches the rest of the monorepo)
  curl -fsSL https://bun.sh/install | bash

  # Node.js (LTS) is an acceptable alternative
  brew install node@20
  ```
- [ ] **Apple Developer account** ($99/year) — only required for **device deployment** and **App Store submission**. Simulator builds work without one. Sign up at https://developer.apple.com/programs/.

## Commands to Run on macOS

From the **project root** (after cloning the repo on a Mac):

```bash
# 1. Install JS deps (if not already)
bun install

# 2. Generate the iOS scaffold (creates apps/web/src-tauri/gen/ios/)
cd apps/web
bun run tauri ios init

# 3. Run on iOS simulator (hot-reload dev mode)
bun run tauri ios dev

# 4. Build for App Store / physical device (release)
bun run tauri ios build
```

### Command Reference (subcommands of `tauri ios`)

| Subcommand    | What it does                                                            |
| ------------- | ----------------------------------------------------------------------- |
| `tauri ios init`        | Generates `gen/ios/` — Xcode project, Podfile, Info.plist, asset catalog |
| `tauri ios dev`         | Boots the iOS simulator, runs the app, attaches the dev webview to the local Vite dev server |
| `tauri ios build`       | Produces a release `.app` bundle and (optionally) a signed `.ipa` archive for App Store Connect |
| `tauri ios list`        | Lists available iOS simulators and connected physical devices           |
| `tauri ios run`         | Boots a specific simulator and installs the freshly-built `.app`        |

For the full surface, run `bun run tauri ios --help` (or `npx tauri ios --help`) from `apps/web/`.

## Output Structure

`bun run tauri ios init` creates the following layout (parallel to `gen/android/`):

```
apps/web/src-tauri/gen/ios/
├── XcodeProj.xcodeproj/      # Xcode project metadata
│   └── project.pbxproj
├── App/                       # Swift source + iOS app entry point
│   ├── App.swift
│   ├── ContentView.swift
│   ├── Info.plist
│   └── Assets.xcassets/       # iOS app icons + accent color
├── Podfile                    # CocoaPods manifest (auto-generated)
├── Podfile.lock               # CocoaPods lockfile (generated on first `pod install`)
└── gen/                       # (gitignored) build outputs
```

The Tauri 2 iOS scaffold uses the **XcodeGen-free** form (no `project.yml` is
required). The generated `.xcodeproj` is hand-crafted by Tauri's iOS init and
is regenerated on every `ios init` — do not edit it manually.

## Notes & Troubleshooting

### First `ios init` may download SDK components

The first invocation may trigger Xcode to download the iOS SDK or simulator
runtimes. A dialog will appear; click "Install" and wait (5-30 minutes
depending on network speed and Xcode version). Subsequent `ios init` runs are
fast.

### Codesigning requires an Apple Developer account

- **Simulator builds**: no signing required. `bun run tauri ios dev` works out
  of the box on any Mac.
- **Device builds** (install on a physical iPhone): requires a signing
  identity in your Keychain. The first time, Xcode will walk you through
  signing setup. A paid Apple Developer account is required.
- **App Store builds**: requires the full App Store Connect workflow
  (certificates, provisioning profiles, archive, upload via Xcode Organizer
  or `xcrun altool`).

### iOS simulator vs physical device

The Tauri CLI's `tauri ios dev` will **default to the iOS Simulator**. To
target a connected physical iPhone, use the device picker that appears in the
terminal menu, or specify it explicitly:

```bash
# List available targets
bun run tauri ios list

# Run on a specific device by name or UDID
bun run tauri ios dev --device "iPhone 15 Pro"
```

### Cargo.toml / Rust target triple for iOS

`tauri ios init` does **not** modify `Cargo.toml` — it generates the Xcode
project alongside the existing Rust crate. When you build for iOS, `cargo`
automatically compiles for the iOS targets (aarch64-apple-ios for device,
aarch64-apple-ios-sim / x86_64-apple-ios for simulator) using the targets you
installed via `rustup target add` above.

If you forget the `rustup target add` step, you'll see errors like
`error: linking with `cc` failed: exit status: 1` with the target triple in
the message. Run the `rustup target add` line from the prerequisites list and
retry.

### `gen/ios/` should be tracked (Tauri 2 default)

The `apps/web/src-tauri/.gitignore` only ignores `/gen/schemas` (auto-generated
IPC schemas). Both `gen/android/` and `gen/ios/` are **tracked** — the
scaffold is stable across teammates and machines, and committing it lets
Android Studio / Xcode open the project directly from a fresh clone. This
matches the convention established in T16 (Android scaffold tracked) and is
the canonical Tauri 2 default.

### `gen/schemas/` remains gitignored

When the iOS build runs, `tauri ios build` may auto-generate IPC schema files
under `gen/schemas/`. These are build artifacts and are correctly
**gitignored** per the T2 `cargo tauri init` output. Do not commit them.

## Why This Document Exists

The project's Tauri integration plan (T1-T20) was authored with the
assumption that the iOS scaffold would be generated on a Mac at a later
date. This file is the **"how to do that when someone has a Mac"** guide.
It is intentionally:

- **Comprehensive enough to run from a clean Mac** (covers Xcode,
  Command Line Tools, CocoaPods, Rust targets, signing).
- **Non-blocking for the rest of the project** (web/desktop/Android are all
  platform-independent and ship on this repo without iOS).
- **Cross-referenced with the Tauri 2 official docs** (the "Reference Links"
  section below is authoritative for anything this doc gets out of date on).

## Reference Links

- Tauri 2 iOS prerequisites — https://v2.tauri.app/start/prerequisites/#ios
- Tauri 2 iOS distribution guide — https://v2.tauri.app/distribute/ios/
- Tauri 2 mobile overview — https://v2.tauri.app/concept/inter-process-communication/
- Xcode download — https://developer.apple.com/xcode/
- CocoaPods install — https://guides.cocoapods.org/using/getting-started.html
- Apple Developer Program — https://developer.apple.com/programs/
- Rust platform support (Apple iOS) — https://doc.rust-lang.org/rustc/platform-support.html#tier-2-and-3

---

**Created by**: T17 (iOS Documentation + Wave 4 Commit) on 2026-06-05
**Follow-up task**: T18/T19 (build verification on Windows desktop) — iOS-specific verification happens on a Mac and is **out of scope** for the current Windows-only verification chain.
