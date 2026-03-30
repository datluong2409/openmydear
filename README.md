<div align="center">

# OpenMyDear

**One click. Everything opens.**

A lightweight desktop launcher that lets you group apps, files, and folders into profiles — then launch them all at once.

Built with [Tauri v2](https://tauri.app/) + React + Rust.

![OpenMyDear Screenshot](omdimage.png)

</div>

---

## Features

- **Launch Profiles** — group apps, files, and folders into named profiles and launch them all at once
- **Parallel & Sequential Modes** — launch all items simultaneously, or one by one with a configurable delay (0–60s)
- **Custom "Open With"** — optionally specify which app opens each item (e.g. open a folder in VS Code)
- **Platform Filtering** — mark items as Windows-only, macOS-only, or both; non-matching items are skipped automatically
- **Drag & Drop** — reorder profiles and items by dragging
- **Run Results** — see a summary of what launched and what failed after each run
- **Auto-save** — changes are persisted automatically (300ms debounce)
- **Auto-update** — checks for updates on startup and installs them with one click
- **Always-on-top** — window stays above other windows (toggleable in Settings)
- **Launch on Startup** — optionally start OpenMyDear when the OS boots
- **Configurable Storage** — choose where your profiles are saved on disk
- **Dark / Light Mode** — follows the OS theme via CSS custom properties
- **Bilingual UI** — English and Vietnamese

## Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop Shell | [Tauri v2](https://tauri.app/) |
| Backend | Rust (edition 2021) |
| Frontend | React 19 + TypeScript |
| Bundler | Vite 7 |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Styling | Tailwind CSS (CDN) + CSS Custom Properties |
| Icons | lucide-react |
| Auto-update | @tauri-apps/plugin-updater |

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Rust / Cargo](https://rustup.rs/)
- **Windows only** — MSVC C++ Build Tools (Visual Studio Installer > "Desktop development with C++")

## Getting Started

```bash
# Install dependencies
npm install

# Development (full native window + HMR)
# On Windows, run dev.bat first to set up the MSVC environment
npm run dev:app

# Frontend-only dev server (no native window, port 1420)
npm run dev

# Type check
npx tsc --noEmit

# Production build
npm run build:app
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Vite dev server only (port 1420, no native window) |
| `npm run dev:app` | Full Tauri dev — compiles Rust + native window with HMR |
| `npm run build` | Type-check + bundle frontend to `dist/` |
| `npm run preview` | Preview production frontend build in browser |
| `npm run build:app` | Build the full native app installer |

## Project Structure

```
src/                            # React / TypeScript frontend
  commands/index.ts             #   All Tauri IPC calls (13 commands)
  components/                   #   UI components
    common/                     #     Shared: Button, Modal
    Sidebar/                    #     Profile list, DnD reorder, new/delete
    ProfileDetail/              #     Profile editor, launch mode, quick-add, Run All
    ItemRow/                    #     Single item with drag handle & actions
    AddItemDialog/              #     Edit item modal (type, label, path, open-with)
    OpenWithPicker/             #     OS app picker with icons & search
    Settings/                   #     Autostart, always-on-top, storage dir, language
    BuyMeACoffee/               #     Donation support modal (MoMo & PayPal)
    EmptyState/                 #     Shown when no profile selected
  context/
    ProfileContext.tsx           #   Global state (useReducer + auto-save)
    profileReducer.ts           #   Pure reducer for CRUD & reorder (9 actions)
  hooks/
    useProfiles.ts              #   Convenience hook for ProfileContext
    usePlatform.ts              #   Current OS platform from Rust
    useUpdateChecker.ts         #   Auto-update check on startup
  i18n/                         #   en/vi locales, {key} substitution
  types/index.ts                #   TypeScript types (mirrors Rust models)

src-tauri/src/                  # Rust backend
  commands.rs                   #   Tauri command handlers
  models.rs                     #   Serde data models
  storage.rs                    #   profiles.json + config.json read/write
  lib.rs                        #   Tauri builder + plugin registration
```

## Data Storage

Two files are managed by the Rust backend:

| File | Purpose |
| --- | --- |
| `config.json` | App settings (custom storage directory, always-on-top). Always in the default data dir. |
| `profiles.json` | User profiles & items. Stored in the default dir or a user-configured custom directory. |

Default data directory:

| OS | Path |
| --- | --- |
| Windows | `%APPDATA%\com.openmydear.app\` |
| macOS | `~/Library/Application Support/com.openmydear.app/` |

## Architecture

- **Frontend** owns in-memory state via `useReducer`; **Rust** owns the disk.
- State changes dispatch reducer actions and trigger a debounced auto-save (300ms) to Rust.
- On startup: Rust reads from disk, React hydrates via `SET_PROFILES`.
- **Parallel mode**: `run_profile` opens all platform-matching items at once via Rust and returns a `RunResult` summary.
- **Sequential mode**: the frontend opens items one by one with a configurable delay, allowing the user to stop mid-run.
- IDs are generated with `nanoid()` on the frontend.
- Installed apps are discovered via the Windows Registry (`App Paths` + Start Menu shortcuts) or by scanning `/Applications` on macOS. Icons are extracted as base64 PNGs via PowerShell on Windows.
- Auto-update checks GitHub releases 3 seconds after startup; downloads, installs, and relaunches if the user accepts.

## License

MIT
