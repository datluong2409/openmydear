# OpenMyDear

A desktop launcher for opening multiple apps, files, and folders at once. Organize your workflow into named profiles — run a profile to launch everything in it with a single click.

## Features

- **Launch Profiles** — group apps, files, and folders into named profiles and launch them all at once
- **Item Types** — supports apps (`.exe`/`.app`), files, and folders
- **Open With** — optionally specify a custom app to open any item with
- **Platform Filtering** — mark each item as Windows-only, macOS-only, or both; items that don't match the current OS are skipped automatically
- **Drag & Drop Reordering** — reorder profiles in the sidebar and items within a profile by dragging
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
| Bundler | Vite 7 |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable |
| Styling | CSS Modules + CSS custom properties |
| Icons | lucide-react |

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust / Cargo](https://rustup.rs/)
- **Windows only**: MSVC C++ Build Tools (install via Visual Studio Installer → "Desktop development with C++")

## Getting Started

### Install dependencies

```bash
npm install
```

### Development

On Windows, `cargo` must run inside an MSVC developer environment because Git Bash's `/usr/bin/link.exe` shadows the MSVC linker. Use the provided helper script:

```bat
dev.bat
```

This sets up the MSVC environment, adds Cargo to PATH, and starts the Tauri dev server with hot-reload.

Alternatively, run directly with npm:

```bash
npm run dev:app
```

### Frontend-only dev server (no native window)

```bash
npm run dev
```

### TypeScript type check

```bash
npx tsc --noEmit
```

### Frontend-only build

```bash
npm run build
```

### Production build

```bat
npm run build:tauri
```

## NPM Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server only (port 1420, no native window) |
| `npm run dev:app` | Full Tauri dev mode — compiles Rust + opens native window with HMR |
| `npm run build` | Type-check and bundle the frontend to `dist/` |
| `npm run preview` | Preview the production frontend build in the browser |
| `npm run build:tauri` | Build the full native app installer for distribution |

## Project Structure

```
src/                          # React / TypeScript frontend
  commands/index.ts           # All Tauri IPC calls (never invoke() directly)
  components/                 # UI components (CSS Modules)
    common/                   # Shared: Button, Modal
    Sidebar/                  # Profile list with DnD reorder, new/delete/settings
    ProfileDetail/            # Profile name editor, Run All, quick-add buttons
    ItemRow/                  # Single item row with drag handle, actions
    AddItemDialog/            # Edit item modal (label, path, type, open-with)
    OpenWithPicker/           # OS app picker with icons and search
    RunResultDialog/          # Post-run success/failure summary
    Settings/                 # Autostart toggle + language selector
    EmptyState/               # Shown when no profile is selected
  context/
    ProfileContext.tsx         # Global state via useReducer + debounced auto-save
    profileReducer.ts          # Pure reducer for all profile/item CRUD and reorder actions
  hooks/
    useProfiles.ts             # Convenience hook for ProfileContext
    usePlatform.ts             # Fetches current OS platform from Rust
  i18n/                        # Custom i18n — en/vi locales, {key} substitution
  types/index.ts               # TypeScript types (mirrors Rust models exactly)

src-tauri/src/                # Rust backend
  commands.rs                 # Tauri command handlers
  models.rs                   # Serde data models
  storage.rs                  # profiles.json read/write (OS app data dir)
  lib.rs                      # Tauri builder + plugin registration
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
- Installed apps are discovered via the Windows Registry (`App Paths`) on Windows, and by scanning `/Applications` on macOS. Icons are extracted as base64-encoded PNGs via PowerShell on Windows.
- When adding new Tauri plugin permissions, declare them in `src-tauri/capabilities/default.json`.

## License

MIT
