# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Does

**OpenMyDear** is a Tauri v2 desktop launcher app. Users create named "profiles," each containing a list of apps/files/folders, then launch all items in a profile with one click. Key features: drag-and-drop reordering, platform filtering (Windows/macOS/both), custom "open with" app, autostart, and English/Vietnamese localization.

## Commands

```bash
npm run dev          # Vite dev server only (browser at port 1420, no native window)
npm run dev:app      # Full Tauri dev mode with native window + HMR (requires Rust + MSVC)
npm run build        # TypeScript check + Vite bundle to dist/
npm run build:tauri  # Full production build + installer
npx tsc --noEmit     # Type check only
```

On Windows, run `dev.bat` first to set up the MSVC environment before `npm run dev:app`.

There is no linting or test framework configured.

## Architecture

The app has two layers that communicate exclusively via Tauri IPC:

**Frontend (React/TypeScript)**
- All Tauri `invoke()` calls are centralized in `src/commands/index.ts` — this is the only place that talks to Rust.
- Global state lives in `src/context/ProfileContext.tsx` using `useReducer`. Actions are defined in `src/context/profileReducer.ts`. State changes trigger a debounced 300ms auto-save via the `save_profiles` command.
- On startup, Rust reads `profiles.json` from disk and React hydrates state via the `SET_PROFILES` action.
- TypeScript interfaces in `src/types/index.ts` mirror the Rust models in `src-tauri/src/models.rs` — keep these in sync when changing data shapes.
- Localization is handled by `src/i18n/I18nContext.tsx`; translations live in `src/i18n/locales/en.json` and `vi.json`.
- Styling uses CSS Modules per component with CSS Custom Properties for theming (dark/light follows OS `prefers-color-scheme`).

**Backend (Rust)**
- `src-tauri/src/commands.rs` — all Tauri command handlers (`load_profiles`, `save_profiles`, `run_profile`, `validate_path`, `get_installed_apps`, autostart commands).
- `src-tauri/src/storage.rs` — reads/writes `profiles.json` in the OS app data directory (`%APPDATA%\com.openmydear.app\` on Windows).
- `src-tauri/src/models.rs` — Serde data models.
- New Tauri commands must be registered in `src-tauri/src/lib.rs` and declared in `src-tauri/capabilities/default.json`.

## Data Model

```
LaunchProfile { id, name, items: LaunchItem[] }
LaunchItem { id, label, path, itemType, platform, openWith?, openWithName?, openWithIcon? }
```

`platform` is `"windows"`, `"macos"`, or `"both"`. `run_profile` filters items by current platform before launching.
