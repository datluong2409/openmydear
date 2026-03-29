# OpenMyDear

A desktop launcher for opening multiple apps, files, and folders at once. Organize your workflow into named profiles — run a profile to launch everything in it with a single click.

## Features

- **Launch Profiles** — group apps, files, and folders into named profiles and launch them all at once
- **Item Types** — supports apps (`.exe`/`.app`), files, and folders
- **Open With** — optionally specify a custom app to open any item with
- **Platform Filtering** — mark each item as Windows-only, macOS-only, or both; items that don't match the current OS are skipped automatically
- **Drag & Drop Reordering** — reorder items within a profile by dragging
- **Run Results** — after running a profile, see a summary of what launched and what failed
- **Auto-save** — changes are persisted automatically with a 300ms debounce
- **Launch on Startup** — optionally start OpenMyDear when the OS boots
- **Dark / Light Mode** — follows the OS `prefers-color-scheme` setting
- **Localization** — English and Vietnamese UI (persisted to localStorage)

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri v2](https://tauri.app/) |
| Backend | Rust |
| Frontend | React 19 + TypeScript |
| Bundler | Vite |
| Drag & drop | @dnd-kit |
| Styling | CSS Modules + CSS custom properties |

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust / Cargo](https://rustup.rs/)
- **Windows only**: MSVC C++ Build Tools (install via Visual Studio Installer → "Desktop development with C++")

## Getting Started

### Development

On Windows, `cargo` must run inside an MSVC developer environment because Git Bash's `/usr/bin/link.exe` shadows the MSVC linker. Use the provided helper script:

```bat
dev.bat
```

This sets up the MSVC environment, adds Cargo to PATH, and starts the Tauri dev server with hot-reload.

### TypeScript type check

```bash
npx tsc --noEmit
```

### Frontend-only build

```bash
npx vite build
```

### Production build

```bat
npx tauri build
```

## Project Structure

```
src/                        # React / TypeScript frontend
  commands/index.ts         # All Tauri IPC calls (never invoke() directly)
  components/               # UI components (CSS Modules)
  context/
    ProfileContext.tsx       # Global state via useReducer
    profileReducer.ts        # 8 action types including REORDER_ITEMS
  i18n/                      # Custom i18n — en/vi locales, {key} substitution
  types/index.ts             # TypeScript types (mirrors Rust models exactly)

src-tauri/src/              # Rust backend
  commands.rs               # Tauri command handlers
  models.rs                 # Serde data models
  storage.rs                # profiles.json read/write (OS app data dir)
  lib.rs                    # Tauri builder + plugin registration
```

## Data Storage

Profiles are stored as JSON in the OS app data directory:

- **Windows**: `%APPDATA%\com.openmydear.app\profiles.json`
- **macOS**: `~/Library/Application Support/com.openmydear.app/profiles.json`

## Architecture Notes

- **Frontend owns in-memory state** via `useReducer`; Rust owns the disk.
- State changes dispatch reducer actions **and** trigger a debounced auto-save (300ms) to Rust.
- On startup: Rust reads from disk → React hydrates via `SET_PROFILES`.
- `run_profile` opens **all** platform-matching items and accumulates errors instead of stopping on the first failure.
- IDs are generated with `nanoid()` on the frontend — no Rust round-trip needed.
- When adding new Tauri plugin permissions, declare them in `src-tauri/capabilities/default.json`.

## License

MIT
