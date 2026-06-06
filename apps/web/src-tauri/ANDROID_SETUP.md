# Android Development Setup (Tauri)

> **Status (as of 2026-06-05)**: This setup is **NOT YET DONE** on this machine.
> The Tauri Android toolchain (Android SDK + NDK) is required before running
> `bun run tauri android init` or any `tauri android` subcommand. Follow the
> steps below to install the missing prereqs.
>
> **Reference**: https://v2.tauri.app/start/prerequisites/#android

## Prerequisites Checklist

- [ ] **Android SDK** installed (via Android Studio) - sets `ANDROID_HOME`
- [ ] **Android NDK** installed (via SDK Manager) - sets `ANDROID_NDK_HOME` (or located under `$ANDROID_HOME/ndk/<version>/`)
- [ ] **JDK 17+** installed (sets `JAVA_HOME` if not already)
- [ ] **Rust Android targets** installed:
  ```powershell
  rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
  ```

## Current State (from Task 15 diagnostic)

| Prereq                | Status               | Notes |
| --------------------- | -------------------- | ----- |
| `ANDROID_HOME`        | NOT SET              | `C:\Users\Admin\AppData\Local\Android\Sdk` does NOT exist |
| `ANDROID_NDK_HOME`    | NOT SET              | Depends on ANDROID_HOME |
| `JAVA_HOME`           | NOT SET              | `java -version` works (Java 24.0.1 detected). JDK 24 is the latest feature release; Tauri 2 + AGP 8.x recommend **JDK 17 (LTS)**. JDK 24 may cause Gradle/AGP compatibility issues. |
| Rust Android targets  | ALL 4 INSTALLED      | `aarch64-linux-android`, `armv7-linux-androideabi`, `i686-linux-android`, `x86_64-linux-android` are all present in `rustup target list --installed` |

**Only the Android SDK + NDK are blocking. Rust is fully ready.**

## Windows-Specific Default Paths

| Component | Default Path |
| --------- | ------------ |
| Android Studio | `C:\Program Files\Android\Android Studio` |
| Android SDK (default) | `C:\Users\<USER>\AppData\Local\Android\Sdk` (i.e. `%LOCALAPPDATA%\Android\Sdk`) |
| Android NDK | `%LOCALAPPDATA%\Android\Sdk\ndk\<version>` (installed via SDK Manager) |
| JDK 17 (recommended) | `C:\Program Files\Eclipse Adoptium\jdk-17.x.x` (Adoptium Temurin 17+ recommended) |

## Installation Steps

### Step 1: Install Android Studio

1. Download Android Studio from https://developer.android.com/studio
2. Run the installer with default options
3. Launch Android Studio once to complete first-run setup (downloads the IDE's basic platform tools)

### Step 2: Install Android SDK + NDK via SDK Manager

1. Open Android Studio
2. Go to **More Actions** → **SDK Manager** (or **File → Settings → Languages & Frameworks → Android SDK**)
3. On the **SDK Platforms** tab, install:
   - Android 14 (API 34) or Android 13 (API 33) - check both **SDK Platform** boxes
4. On the **SDK Tools** tab, install (check **Show Package Details** first):
   - **Android SDK Build-Tools** 34.0.0 or later
   - **Android SDK Command-line Tools (latest)**
   - **Android SDK Platform-Tools**
   - **NDK (Side by side)** - install the latest stable (e.g. `26.x.y.z`)
   - **Android Emulator** (optional, for emulator-based dev)
   - **Google USB Driver** (optional, for physical-device dev)
5. Click **Apply** → **OK** to install
6. Note the **Android SDK location** shown at the top of the SDK Manager window (default: `C:\Users\Admin\AppData\Local\Android\Sdk`)

### Step 3: Install JDK 17 (recommended over Java 24)

Tauri 2 + AGP 8.x are validated against JDK 17 LTS. The current system has Java 24.0.1 (a feature release), which may cause Gradle/AGP compatibility issues.

Recommended: install **Eclipse Adoptium Temurin 17**:
1. Download from https://adoptium.net/temurin/releases/?version=17
2. Choose: **Operating System = Windows**, **Architecture = x64**, **Package Type = JDK**, **Version = 17 - LTS**
3. Run the installer with default options
4. Default install path: `C:\Program Files\Eclipse Adoptium\jdk-17.x.x`

### Step 4: Set Environment Variables (User-level, read-only-safe)

Open **System Properties → Environment Variables** (or `sysdm.cpl` → Advanced → Environment Variables) and set **user-level** variables (NOT system-level, NOT PATH, NOT registry):

| Variable | Value (example) |
| -------- | --------------- |
| `ANDROID_HOME` | `C:\Users\Admin\AppData\Local\Android\Sdk` |
| `ANDROID_NDK_HOME` | `C:\Users\Admin\AppData\Local\Android\Sdk\ndk\26.x.y.z` (use your installed version) |
| `JAVA_HOME` | `C:\Program Files\Eclipse Adoptium\jdk-17.0.x` |

> **Important**: Do not edit the Windows `PATH` variable directly. Android Studio's `studio.bat` and the Tauri CLI resolve `ANDROID_HOME`/`ANDROID_NDK_HOME` from the user-level env vars. Verify with **Step 5**.

### Step 5: Verify the Setup

Open a **new** PowerShell 7+ terminal (env var changes only take effect in new processes) and run:

```powershell
# Check env vars
echo "ANDROID_HOME=$env:ANDROID_HOME"
echo "ANDROID_NDK_HOME=$env:ANDROID_NDK_HOME"
echo "JAVA_HOME=$env:JAVA_HOME"

# Check rustup targets (should already be all present)
rustup target list --installed | Select-String android
```

**Expected output:**

```
ANDROID_HOME=C:\Users\Admin\AppData\Local\Android\Sdk
ANDROID_NDK_HOME=C:\Users\Admin\AppData\Local\Android\Sdk\ndk\26.x.y.z
JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.x

aarch64-linux-android
armv7-linux-androideabi
i686-linux-android
x86_64-linux-android
```

### Step 6: Verify `tauri android init` Works

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

If all 4 prereqs are met, this will create the `gen/android` directory and update `tauri.conf.json` with the Android configuration block.

## Troubleshooting

### "ANDROID_HOME is not set" or "SDK location not found"
- Verify the env var is set in **user-level** (not just system-level).
- **Restart your terminal** - PowerShell only loads env vars at process start.
- Verify the directory exists: `Test-Path $env:ANDROID_HOME`

### "NDK not configured" or Gradle fails to find NDK
- Verify `ANDROID_NDK_HOME` points to a directory containing `source.properties` and `toolchains/`.
- Alternative: set `ndkVersion` in `apps/web/src-tauri/gen/android/app/build.gradle` (after T16 runs).

### Gradle/AGP complains about Java version
- The current `java -version` reports Java 24.0.1, which is too new for AGP 8.x.
- Install JDK 17 (Step 3) and set `JAVA_HOME` to point to it.
- Verify: `& "$env:JAVA_HOME\bin\java.exe" -version`

### `cargo tauri android init` fails with "Rust target missing"
- Run: `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`
- (This is already done on this machine per Task 15 diagnostic.)

## Reference Links

- Tauri 2 Prerequisites (Android): https://v2.tauri.app/start/prerequisites/#android
- Android Studio download: https://developer.android.com/studio
- Adoptium Temurin 17: https://adoptium.net/temurin/releases/?version=17
- Rust Android targets: https://doc.rust-lang.org/rustc/platform-support.html

---

**Created by**: T15 (Android Environment Pre-check) on 2026-06-05
**Follow-up task**: T16 (`bun run tauri android init`) - blocked until all 4 prereqs are met
