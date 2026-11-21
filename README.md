# Ledger Notes

A cross-platform money-tracker note app built with Tauri 2, React 19, Vite 8, Tailwind CSS 4, shadcn/ui (Base UI primitives) and TypeScript. It uses a WhatsApp-inspired layout: a tools rail, a dealer list, a ledger-note list, and a chat-style transaction timeline. All list views are virtualized with one custom row renderer.

Each dealer has ledger notes (`IN-00001`, `IN-00002`, …); each note is a conversation thread with its own income/expense entries (type, amount, description), stored in a local SQLite database.

## Stack

| Layer | Technology |
| --- | --- |
| Desktop / mobile shell | Tauri 2 (Rust) |
| UI | React 19 + Vite 8 |
| Components | shadcn/ui with Base UI primitives (`base-nova` style) |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Language | TypeScript 7 |
| Storage | `@tauri-apps/plugin-sql` with SQLite, migrations in `src-tauri/src/lib.rs` |
| Async data | TanStack Query — scoped queries, keyed invalidation, optimistic writes |
| UI state | Zustand — dialogs, currency, confirmations, last selection |
| Navigation | TanStack Router with memory history (route depth = mobile back stack) |
| Lists | `@tanstack/react-virtual` (virtualized single-column rows) |
| Tests | Vitest (`pnpm test`) |

## Features

- Desktop three-pane layout: tools rail, dealer list, ledger-note list, chat timeline
- Mobile stacked views: dealers → notes → chat, with back buttons, tools rail, and Android hardware-back support
- Create/delete dealers and ledger notes with emoji avatars, search, and phone numbers
- Add income/expense "messages" with amount + description, per-note totals, delete entries
- Currency selector in Settings; per-note and overall summaries
- SQLite in Tauri (WAL mode); `localStorage` fallback for browser UI development
- Summaries aggregated in SQL, threads loaded in pages of 100 with optimistic add/delete

## Prerequisites

- Node.js 22+ and pnpm
- Rust 1.90+ (Tauri SQL plugin requirement) and the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS

## Run

```bash
pnpm install
pnpm tauri dev
```

`pnpm dev` runs the frontend in a browser with a `localStorage` fallback, which is handy for quick UI work. Data in that mode is separate from the desktop app's SQLite database.

## Release artifacts

Finished installers are collected in `.releases/` at the repository root. That
folder is git-ignored, so local builds never pollute version control:

- `Ledger Notes_0.1.0_aarch64.dmg` — macOS (Apple Silicon)
- `Ledger Notes_0.1.0_x64-setup.exe` — Windows NSIS installer (x64)
- `Ledger-Notes_0.1.0_arm64.apk` — Android (arm64-v8a, debug-signed)
- `Ledger-Notes_0.1.0_unsigned.ipa` — iOS device (arm64, unsigned)

Rebuild one artifact or all of them with:

```bash
pnpm release:macos
pnpm release:windows
pnpm release:android
pnpm release:ios
pnpm release:all
```

Each script builds the target, copies the installer into `.releases/`, and signs
the Android APK when a debug keystore is available. The scripts live in
`scripts/release.sh`.

## Build

```bash
pnpm tauri build
```

macOS outputs land in `src-tauri/target/release/bundle/` (`Ledger Notes.app` and a `.dmg`).

On macOS, a Windows NSIS installer can be cross-compiled with mingw-w64 and a
native `makensis`:

```bash
brew install mingw-w64 makensis
rustup target add x86_64-pc-windows-gnu
pnpm tauri build --target x86_64-pc-windows-gnu -b nsis --ci
```

`.cargo/config.toml` points the Windows GNU target at the Homebrew mingw linker.
Tauri calls `makensis.exe`; a small `makensis.exe` shim that execs Homebrew's
`makensis` on `PATH` is needed because the bundler assumes a Windows host. The
installer is written to `src-tauri/target/x86_64-pc-windows-gnu/release/bundle/nsis/`.

`src-tauri/Cargo.toml` keeps `strip = false` for host build artifacts via
`[profile.release.build-override]`. Without it, `sqlx-macros` produces a corrupt
proc-macro dylib on macOS and release builds fail with a `LINKEDIT` load error.

## Mobile

Android requires JDK 17, the Android SDK platform/NDK expected by the installed
Tauri CLI, and `ANDROID_HOME` / `NDK_HOME` environment variables. For a CI-style
setup on macOS with Homebrew:

```bash
brew install openjdk@17 android-commandlinetools

export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export NDK_HOME="$ANDROID_HOME/ndk/<installed-ndk-version>"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

sdkmanager --sdk_root="$ANDROID_HOME" --licenses
pnpm tauri android init --ci
pnpm tauri android build --ci --apk -t aarch64
```

If `sdkmanager` only offers a dotted platform revision (e.g. `platforms;android-37.0`),
install it and create an `android-37` symlink in `$ANDROID_HOME/platforms` so the
generated Gradle project can find it. APKs are written to
`src-tauri/gen/android/app/build/outputs/apk/`.

iOS requires full Xcode, CocoaPods, and an Apple signing certificate for a
standard `pnpm tauri ios build`. On this machine the iOS simulator runtime and
signing certificate are unavailable, so the IPA in `.releases` was produced by
building the Rust static library for `aarch64-apple-ios` and linking the `main.mm`
entry point directly against the iPhoneOS SDK, then packaging the `.app` as a
zip. It is unsigned and can only be installed with a sideloading tool. A
production iOS build needs `APPLE_DEVELOPMENT_TEAM` (or a configured signing
certificate) and the iOS platform installed via
`xcodebuild -downloadPlatform iOS`.

For development:

```bash
pnpm tauri android dev

pnpm tauri ios init
pnpm tauri ios dev
```

## Useful commands

```bash
pnpm typecheck   # TypeScript check
pnpm lint        # Biome lint (first-party code)
pnpm knip        # Unused files / deps / exports
pnpm sg:check    # Structural lint rules (e.g. no ag-grid imports)
pnpm test        # Vitest unit / store-contract tests
pnpm build       # Frontend production build
pnpm size        # Bundle size budget (250 kB brotli)
pnpm check       # All of the above in one command
cargo check      # Rust check (run inside src-tauri)
```

The SQLite file (`ledger.db`) lives in the platform app-data directory. The schema is created automatically by the migration in `src-tauri/src/lib.rs`.

Change the currency from the Settings modal (sidebar on desktop / tools rail on mobile). The default is `BHD`, displayed with 3 decimals; supported currencies are listed in `CURRENCIES` in `src/lib/entries.ts`.

## Architecture

`src/lib/entries.ts` is the only data boundary (`EntryStore`). SQLite implements it in Tauri; a browser implementation backs local development and tests. TanStack Query owns all async data with keys in `src/lib/query-keys.ts`, so a mutation invalidates only the affected dealer/note/thread queries instead of reloading the database. Zustand holds only ephemeral UI state — SQLite remains the single source of truth for data.

Routes (`/`, `/dealers/$dealerId`, `/dealers/$dealerId/notes/$noteId`, `/dealers/$dealerId/detail`) drive pane selection and the mobile back stack; `App.tsx` stays mounted and renders all panes. Note summaries come from one indexed `GROUP BY` query; threads are keyset-paginated newest-first and rendered oldest-first.

## Main source files

- `src/App.tsx` — composition, route-driven selection, mutation handlers
- `src/lib/router.ts` — route tree, memory history, typed navigation
- `src/hooks/use-ledger.ts` — query and mutation hooks (invalidation, optimistic updates)
- `src/store/ui.ts` — Zustand UI state (dialogs, currency, confirmations, last selection)
- `src/components/dialogs/` — dealer, note, settings, and confirm dialogs
- `src/components/AppSidebar.tsx` — tools rail
- `src/components/ListGrid.tsx` — shared virtualized list (TanStack Virtual)
- `src/components/LedgerPanels.tsx` — dealer list, ledger-note list, transaction thread and composer
- `src/components/EmojiPicker.tsx` — emoji avatar picker (emoji-mart, loaded on demand)
- `src/components/ui/` — generated shadcn/Base UI components
- `src/lib/entries.ts` — SQLite/browser data store and formatting helpers
- `src/lib/utils.ts` — shadcn `cn` helper
