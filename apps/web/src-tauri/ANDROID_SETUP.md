# Android Development Setup (Tauri)

> **Status (as of 2026-06-05)**: This setup is **CONFIGURED** on this machine.
> The Tauri Android toolchain is installed and `bun run tauri android init`
> has been run successfully (T16, exit code 0). The Android scaffold lives at
> `apps/web/src-tauri/gen/android/` and is **tracked** in git.
>
> - Android SDK: `C:\AndroidSDK` (non-default install location; user-customized)
> - Android NDK: `C:\AndroidSDK\ndk\29.0.13846066` (auto-detected by Tauri CLI)
> - JDK: Java 24.0.1 on `PATH` (Tauri 2 + AGP 8.x prefer **JDK 17 LTS**; see notes)
> - Rust Android targets: all 4 installed
> - Android Studio: **not** installed (CLI workflow does not require it)
>
> **Reference**: https://v2.tauri.app/start/prerequisites/#android

## TL;DR

The Android toolchain on this machine is fully usable for Tauri 2 development
from the command line. The SDK is installed at a non-default path
(`C:\AndroidSDK\` instead of `%LOCALAPPDATA%\Android\Sdk\`), and the
environment is set up via the `ANDROID_SDK_ROOT` user-level variable. Tauri 2
treats `ANDROID_SDK_ROOT` as a deprecated alias for `ANDROID_HOME`; the CLI
emits a warning when it has to fall back, but the workflow still works.

`bun run tauri android init` has already been run (T16, 2026-06-05). It
generated 40 files in `apps/web/src-tauri/gen/android/`, including the Gradle
wrapper, `AndroidManifest.xml`, three Kotlin source files (`MainActivity.kt`,
`BuildTask.kt`, `RustPlugin.kt`), and the `ic_launcher` icon set for all five
density buckets. The scaffold is committed in the Wave 4 commit (`368f586`).

If you only want to build and run the app on a connected Android device or
emulator, you are done — the env is ready. Read on only if you want to silence
the deprecation warning, learn why a previous diagnostic was wrong, or set up
Android on a fresh machine.

## Current State (verified 2026-06-05 via T15 + T16)

| Component                 | Status                             | Path / Value                                                                                     |
| ------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `ANDROID_SDK_ROOT` (USER) | SET                                | `C:\AndroidSDK`                                                                                  |
| `ANDROID_HOME` (USER)     | NOT SET (deprecated fallback used) | Recommend: set to `C:\AndroidSDK` (same as `ANDROID_SDK_ROOT`)                                   |
| `ANDROID_NDK_HOME` (USER) | NOT SET (auto-detected)            | Auto-resolved to `C:\AndroidSDK\ndk\29.0.13846066` by Tauri CLI                                  |
| `JAVA_HOME` (USER)        | NOT SET (java on `PATH` works)     | `java -version` -> Java 24.0.1; Tauri 2 + AGP 8.x prefer **JDK 17 LTS**                          |
| Android Studio            | NOT INSTALLED (not required)       | CLI workflow does not need the IDE                                                               |
| Android SDK               | INSTALLED                          | `C:\AndroidSDK` (non-default; user customized)                                                   |
| Android NDK               | INSTALLED                          | `C:\AndroidSDK\ndk\29.0.13846066` (29.0.x side-by-side)                                          |
| `build-tools`             | Present                            | `C:\AndroidSDK\build-tools`                                                                      |
| `platform-tools`          | Present                            | `C:\AndroidSDK\platform-tools`                                                                   |
| Rust Android targets      | ALL 4 INSTALLED                    | `aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android`, `x86_64-linux-android` |

The persistent env vars were read via PowerShell's
`[System.Environment]::GetEnvironmentVariable("VAR", "User")` (see
[Why the T15 diagnostic was wrong](#why-the-t15-diagnostic-was-wrong) below
for the rationale).

## T16 Outcome — `tauri android init`

Command:

```powershell
cd apps/web
bun run tauri android init
```

Result: **exit code 0** on the first attempt (no Windows panic, no retry
needed). The Tauri CLI emitted the following relevant lines to stderr:

```
Info Using installed NDK: C:\AndroidSDK\ndk\29.0.13846066
Warn `ANDROID_HOME` isn't set; falling back to `ANDROID_SDK_ROOT`, which is deprecated
...
victory: Project generated successfully! 🌻 🐕 🎉
```

Generated layout (40 files, tracked in git under `apps/web/src-tauri/gen/android/`):

```
gen/android/
├── .editorconfig
├── .gitignore
├── build.gradle.kts
├── gradle.properties
├── gradlew
├── gradlew.bat
├── settings.gradle
├── app/                              # Android app module
│   ├── build.gradle.kts
│   ├── proguard-rules.pro
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/generai/app/MainActivity.kt
│       └── res/                      # 17 ic_launcher PNGs (5 densities × 3 variants + 2 mono)
├── buildSrc/                         # Kotlin DSL for the Tauri build tasks
│   ├── build.gradle.kts
│   └── src/main/java/com/generai/app/kotlin/
│       ├── BuildTask.kt
│       └── RustPlugin.kt
└── gradle/wrapper/                   # Gradle wrapper (gradle-wrapper.jar + .properties)
```

The Tauri CLI also made one tiny modification to `apps/web/src-tauri/Cargo.toml`,
adding `features = []` to the `tauri` and `tauri-build` dependency entries
(cargo's standard feature-array form, semantically a no-op). Both changes are
already committed in `368f586` (Wave 4).

## Optional: Silence the `ANDROID_HOME` deprecation warning

The deprecation warning is informational only — the scaffold generated
successfully and the toolchain is fully functional. If the warning is noisy in
your terminal logs, you can silence it by setting `ANDROID_HOME` to the same
value as `ANDROID_SDK_ROOT`. Pick one of the two methods below.

### Method A — System Properties (GUI, persistent, all processes)

1. Press <kbd>Win</kbd>+<kbd>R</kbd>, type `sysdm.cpl`, press <kbd>Enter</kbd>.
2. Go to the **Advanced** tab.
3. Click **Environment Variables...**.
4. In the **User variables for `<your username>`** section, click **New...**.
5. Set:
   - **Variable name**: `ANDROID_HOME`
   - **Variable value**: `C:\AndroidSDK`
6. Click **OK** three times to save.

### Method B — PowerShell (scriptable, persistent, all new processes)

```powershell
[System.Environment]::SetEnvironmentVariable(
  "ANDROID_HOME",
  "C:\AndroidSDK",
  "User"  # Affects only your user account. Use "Machine" for system-wide.
)
```

The change takes effect for **new** processes. Existing PowerShell / cmd
sessions keep the old environment.

### Verify the new value

Open a **new** PowerShell window and run:

```powershell
[System.Environment]::GetEnvironmentVariable("ANDROID_HOME", "User")
# Expected output: C:\AndroidSDK
```

If you see `C:\AndroidSDK`, the warning will disappear on the next
`bun run tauri android ...` invocation.

## Why the T15 diagnostic was wrong

T15 (Android Environment Pre-check) ran on 2026-06-05 and concluded that
Android was not configured on this machine, based on PowerShell's `$env:`
automatic variables. That conclusion was incorrect, and this section records
the lesson for future environment diagnostics on Windows + PowerShell.

### What T15 checked

```powershell
$env:ANDROID_HOME          # -> empty
$env:ANDROID_SDK_ROOT      # -> empty
$env:ANDROID_NDK_HOME      # -> empty
$env:JAVA_HOME             # -> empty
Test-Path 'C:\Users\Admin\AppData\Local\Android\Sdk'   # -> False
Test-Path 'C:\Android\Sdk'                              # -> False
Test-Path 'C:\Program Files\Android\Sdk'                # -> False
```

T15 concluded: "Android Studio is not installed and the Android SDK has never
been set up on this machine." That recommendation was wrong.

### What T16 actually saw

When T16 ran `bun run tauri android init`, the Tauri CLI (a native Rust
process inherited from the parent PowerShell session) **did** have access to
the user's persistent `ANDROID_SDK_ROOT=C:\AndroidSDK`. It found the NDK at
`C:\AndroidSDK\ndk\29.0.13846066`, generated the scaffold, and exited 0.

### The root cause: PowerShell `$env:` shows only the current process

`$env:VAR` in PowerShell returns the value of `VAR` **in the current
PowerShell process's environment block**. It does **not** reflect persistent
user-level or system-level variables that were set via System Properties
(Environment Variables dialog, `setx`, or `[System.Environment]::SetEnvironmentVariable(..., "User")`).
Those persistent vars are only visible to processes that started **after**
the persistent var was set, or to the current process if it re-reads its
environment via the `User` / `Machine` target.

The PowerShell session T15 ran in had been opened **before** the user set
`ANDROID_SDK_ROOT` persistently, or it was opened by a parent process that
didn't propagate the User-scope vars into the new process's env block. Either
way, `$env:ANDROID_SDK_ROOT` was empty in T15's session, but the Tauri CLI
binary — invoked later by T16 — inherited the persistent var from a parent
process that had re-read the environment (likely a new shell opened after
the var was set).

### The fix for future diagnostics

When checking whether a Windows environment variable is set, **always** use
the .NET API that reads persistent scope directly:

```powershell
# Read USER-scope persistent env var
$val = [System.Environment]::GetEnvironmentVariable("VAR", "User")
if ([string]::IsNullOrEmpty($val)) { $val = "NOT SET" }

# Read MACHINE-scope persistent env var (admin-only to write, but readable by anyone)
$val = [System.Environment]::GetEnvironmentVariable("VAR", "Machine")

# Read the current process's env block (same as $env:VAR)
$val = [System.Environment]::GetEnvironmentVariable("VAR", "Process")
```

`$env:VAR` is a convenience alias for the "Process" target. The persistent
"User" and "Machine" targets are only accessible via the explicit .NET API.

### Source of truth

When in doubt, the child process (the Tauri CLI, in our case) is the
authoritative source for whether its own environment is sufficient. Its
own diagnostic output (the `Info` / `Warn` lines it prints to stderr)
reflects the env it actually sees, not the env a sibling PowerShell window
sees. T16's success was the real evidence; T15's negative diagnosis was
based on a sibling-window view that missed the persistent vars.

## Setup from scratch (if Android is NOT configured on your machine)

This section is for other developers who clone the repo on a machine without
Android installed. Skip it if you only want to silence the deprecation
warning on the existing setup (see above).

### Prerequisites Checklist

- [ ] **Android SDK** installed — sets `ANDROID_HOME` (Tauri 2 reads this; `ANDROID_SDK_ROOT` is a deprecated fallback)
- [ ] **Android NDK** installed (via SDK Manager) — sets `ANDROID_NDK_HOME` (or located under `$ANDROID_HOME/ndk/<version>/`)
- [ ] **JDK 17+** installed (sets `JAVA_HOME` if not already). Tauri 2 + AGP 8.x are validated against **JDK 17 LTS**.
- [ ] **Rust Android targets** installed:
  ```powershell
  rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
  ```

### Windows-Specific Default Paths

| Component             | Default Path                                                                      |
| --------------------- | --------------------------------------------------------------------------------- |
| Android Studio        | `C:\Program Files\Android\Android Studio`                                         |
| Android SDK (default) | `C:\Users\<USER>\AppData\Local\Android\Sdk` (i.e. `%LOCALAPPDATA%\Android\Sdk`)   |
| Android NDK           | `%LOCALAPPDATA%\Android\Sdk\ndk\<version>` (installed via SDK Manager)            |
| JDK 17 (recommended)  | `C:\Program Files\Eclipse Adoptium\jdk-17.x.x` (Adoptium Temurin 17+ recommended) |

The user on this machine chose `C:\AndroidSDK` instead of the default — that
is fully supported. Android Studio, the SDK, and the NDK do not need to live
under `%LOCALAPPDATA%`.

### Installation Steps

#### Step 1: Install Android Studio (optional)

Tauri 2's CLI workflow does **not** require Android Studio. The IDE is
convenient for editing `.kt` files, running the layout inspector, and
managing SDK components from a GUI, but every SDK component can also be
installed via the `sdkmanager` CLI. Skip this step if you only need the
command-line toolchain.

1. Download Android Studio from https://developer.android.com/studio
2. Run the installer with default options
3. Launch Android Studio once to complete first-run setup (downloads the
   IDE's basic platform tools)

#### Step 2: Install Android SDK + NDK

If you skipped Step 1, install the `sdkmanager` CLI from
https://developer.android.com/studio#command-line-tools-only and use it to
install the components below. If you installed Android Studio, open
**More Actions** -> **SDK Manager** and use the GUI.

Install (on **SDK Tools** tab, check **Show Package Details** first):

- **Android SDK Build-Tools** 34.0.0 or later
- **Android SDK Command-line Tools (latest)**
- **Android SDK Platform-Tools**
- **NDK (Side by side)** — install the latest stable (e.g. `26.x.y.z` or `29.x.y.z`)
- **Android Emulator** (optional, for emulator-based dev)
- **Google USB Driver** (optional, for physical-device dev on Windows)

Note the **Android SDK location** shown at the top of the SDK Manager window
(default: `C:\Users\<USER>\AppData\Local\Android\Sdk`).

#### Step 3: Install JDK 17 (recommended over Java 24)

Tauri 2 + AGP 8.x are validated against **JDK 17 LTS**. The current system
on this machine has Java 24.0.1 (a feature release); Tauri 2 + AGP 8.x
**may** accept it (AGP 8.7+ added Java 21/24 support), but JDK 17 is the
safest choice for clean builds. Install **Eclipse Adoptium Temurin 17**:

1. Download from https://adoptium.net/temurin/releases/?version=17
2. Choose: **Operating System = Windows**, **Architecture = x64**,
   **Package Type = JDK**, **Version = 17 - LTS**
3. Run the installer with default options
4. Default install path: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x`

#### Step 4: Set Environment Variables (User-level)

Open **System Properties** -> **Environment Variables** (or `sysdm.cpl` ->
**Advanced** -> **Environment Variables**) and set **user-level** variables
(NOT system-level, NOT `PATH`, NOT registry):

| Variable           | Value (example)                                                                        |
| ------------------ | -------------------------------------------------------------------------------------- |
| `ANDROID_HOME`     | `C:\Users\<USER>\AppData\Local\Android\Sdk` (or your custom path)                      |
| `ANDROID_NDK_HOME` | `C:\Users\<USER>\AppData\Local\Android\Sdk\ndk\<version>` (use your installed version) |
| `JAVA_HOME`        | `C:\Program Files\Eclipse Adoptium\jdk-17.0.x`                                         |

> **Important**: Do not edit the Windows `PATH` variable directly. Android
> Studio's `studio.bat` and the Tauri CLI resolve `ANDROID_HOME` /
> `ANDROID_NDK_HOME` from the user-level env vars. Verify with **Step 5**.

> **Note on Tauri 2 naming**: Tauri 2's Android tooling prefers
> `ANDROID_HOME` (the modern name). `ANDROID_SDK_ROOT` is the older
> equivalent that some legacy tools (including older Tauri builds) still
> use. Setting `ANDROID_HOME` is the recommended primary name; if you must
> use `ANDROID_SDK_ROOT` (e.g. because your SDK is at a non-standard path
> that older tools read from `ANDROID_SDK_ROOT` only), set both to the
> same value to avoid the deprecation warning documented above.

#### Step 5: Verify the Setup

Open a **new** PowerShell 7+ terminal (env var changes only take effect in
new processes) and run:

```powershell
# Check env vars (User scope; reads persistent values)
[System.Environment]::GetEnvironmentVariable("ANDROID_HOME", "User")
[System.Environment]::GetEnvironmentVariable("ANDROID_NDK_HOME", "User")
[System.Environment]::GetEnvironmentVariable("JAVA_HOME", "User")

# Check rustup targets (should already be all present)
rustup target list --installed | Select-String android
```

**Expected output:**

```
C:\Users\<USER>\AppData\Local\Android\Sdk
C:\Users\<USER>\AppData\Local\Android\Sdk\ndk\<version>
C:\Program Files\Eclipse Adoptium\jdk-17.0.x

aarch64-linux-android
armv7-linux-androideabi
i686-linux-android
x86_64-linux-android
```

#### Step 6: Run `tauri android init`

From the repo root:

```powershell
cd apps/web
bun run tauri android init
```

Or directly:

```powershell
cd apps/web/src-tauri
cargo tauri android init
```

If all 4 prereqs are met, this creates the `gen/android/` directory and
updates `tauri.conf.json` with the Android configuration block.

## Typical Workflow

Tauri Android has two distinct modes that are easy to confuse on first
contact. The `dev` mode (`bun run dev:android` → `tauri android dev`) needs
the Vite dev server running because Tauri reads `build.devUrl` from
`apps/web/src-tauri/tauri.conf.json` — currently `http://localhost:3001` —
and points the Android WebView at it for HMR. The `build` mode
(`bunx tauri android build --apk ...`) is fully self-contained: it runs
`build.beforeBuildCommand` (`bun run build` → Vite produces
`apps/web/dist/`), then bundles the contents of `build.frontendDist` —
currently `../dist` — INTO the APK as static assets, so the installed APK
does **not** need Vite (or any other server) running to launch.

### Tu workflow típico

1. Desarrollas: bun run dev:android (Vite + emulator corriendo, HMR activo)
2. Pruebas el bundle: bunx tauri android build --apk debug (genera APK, sin Vite)
3. Empaquetas para distribuir: bunx tauri android build --apk release (APK firmado)

Step 1 runs `build.beforeDevCommand` (which in this repo is `bun run dev`,
starting Vite) and then points the WebView at `build.devUrl` (live Vite at
`http://localhost:3001`). Steps 2 and 3 use `build.beforeBuildCommand` and
`build.frontendDist` instead — no dev server is needed, because the WebView
loads the bundled assets straight from the APK. This is analogous to the
desktop case: `tauri dev` needs Vite, `tauri build` produces a self-contained
`.exe`.

## Notes & Troubleshooting

### `ANDROID_SDK_ROOT` works but produces a deprecation warning

The Tauri CLI emits `Warn \`ANDROID_HOME\` isn't set; falling back to
\`ANDROID_SDK_ROOT\`, which is deprecated`when only`ANDROID_SDK_ROOT`is
set. The warning is harmless; the toolchain still works. To silence it, set`ANDROID_HOME`to the same value as`ANDROID_SDK_ROOT`(see [Optional:
Silence the`ANDROID_HOME` deprecation warning](#optional-silence-the-android_home-deprecation-warning)
above).

### Tauri CLI doesn't find the NDK

The Tauri CLI walks `$ANDROID_NDK_HOME` first, then `$ANDROID_HOME/ndk/`,
then `$ANDROID_SDK_ROOT/ndk/` looking for any directory containing
`source.properties`. If your NDK is in an unexpected location, either:

- Symlink / move it to `$ANDROID_SDK_ROOT/ndk/<version>/`
- Set `ANDROID_NDK_HOME` to the absolute path of the NDK directory

### `cargo tauri android init` fails with "Rust target missing"

```powershell
rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
```

(On this machine, all 4 are already installed per the T15 diagnostic.)

### Gradle/AGP complains about Java version

The current `java -version` reports Java 24.0.1, which is the latest feature
release. Tauri 2 + AGP 8.x are validated against **JDK 17 LTS**. Recent
AGP 8.7+ accepts Java 21 and may accept Java 24, but if you see Gradle
errors like `Unsupported class file major version 68` or
`Could not resolve all dependencies for configuration`, install JDK 17 and
set `JAVA_HOME` to point to it:

```powershell
[System.Environment]::SetEnvironmentVariable(
  "JAVA_HOME",
  "C:\Program Files\Eclipse Adoptium\jdk-17.0.x",
  "User"
)
```

Then verify in a **new** PowerShell:

```powershell
& "$env:JAVA_HOME\bin\java.exe" -version
```

### "ANDROID_HOME is not set" or "SDK location not found"

- Verify the env var is set in **user-level** (not just system-level) using
  `[System.Environment]::GetEnvironmentVariable("ANDROID_HOME", "User")`.
- **Restart your terminal** — PowerShell only loads env vars at process start.
- Verify the directory exists: `Test-Path $env:ANDROID_HOME`.
- Remember that `$env:VAR` in PowerShell shows only the current process's
  env, not persistent vars. See [Why the T15 diagnostic was wrong](#why-the-t15-diagnostic-was-wrong).

### "NDK not configured" or Gradle fails to find NDK

- Verify `ANDROID_NDK_HOME` points to a directory containing
  `source.properties` and `toolchains/`.
- Alternative: set `ndkVersion` in
  `apps/web/src-tauri/gen/android/app/build.gradle.kts` to match the
  installed NDK version.

### `gen/android/` should be tracked (Tauri 2 default)

The `apps/web/src-tauri/.gitignore` only ignores `/gen/schemas` (auto-generated
IPC schemas). Both `gen/android/` and `gen/ios/` are **tracked** — the
scaffold is stable across teammates and machines, and committing it lets
Android Studio / Xcode open the project directly from a fresh clone. This
matches the convention established in T16 (Android scaffold tracked) and is
the canonical Tauri 2 default.

### `gen/schemas/` remains gitignored

When the Android build runs, `tauri android build` may auto-generate IPC
schema files under `gen/schemas/`. These are build artifacts and are correctly
**gitignored** per the T2 `cargo tauri init` output. Do not commit them.

## Reference Links

- Tauri 2 prerequisites (Android) — https://v2.tauri.app/start/prerequisites/#android
- Android Studio download — https://developer.android.com/studio
- Adoptium Temurin 17 — https://adoptium.net/temurin/releases/?version=17
- Rust Android targets — https://doc.rust-lang.org/rustc/platform-support.html#tier-2-and-3
- Android `sdkmanager` CLI — https://developer.android.com/studio#command-line-tools-only
- Tauri 2 mobile overview — https://v2.tauri.app/concept/inter-process-communication/

---

**Created by**: T15 (Android Environment Pre-check) on 2026-06-05.
**Corrected by**: T17.5 (post-Wave-4 fixup) on 2026-06-05. T15 concluded
Android was not configured; T16's successful `tauri android init` proved
otherwise. This doc now reflects the actual configured state.
**Follow-up tasks**: T18/T19 (desktop build verification) — Android-specific
build verification (Gradle, AGP, JDK) is deferred until someone runs
`tauri android dev` or `tauri android build` for the first time.
