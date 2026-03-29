# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

**Prerequisites**: Rust/Cargo, Node.js, MSVC C++ Build Tools (Windows).

```bash
# Development (Windows) - sets up MSVC env + cargo PATH
dev.bat

# TypeScript type check
npx tsc --noEmit

# Frontend-only build
npx vite build

# Full Tauri production build (from proper MSVC environment)
npx tauri build
```

On Windows, `cargo` commands must run inside a MSVC developer environment because Git Bash's `/usr/bin/link.exe` shadows the MSVC linker. Use `dev.bat` or manually call `vcvarsall.bat x64` first and add `%USERPROFILE%\.cargo\bin` to PATH.

## Architecture

**Tauri v2 desktop app**: Rust backend + React/TypeScript frontend.

### Data Flow
- **Frontend owns in-memory state** via `useReducer` in `ProfileContext`
- **Rust owns the disk** — reads/writes `profiles.json` in the OS app data directory
- State changes dispatch reducer actions AND trigger debounced auto-save (300ms) to Rust
- On app start: Rust reads from disk → React hydrates via `SET_PROFILES`

### IPC Layer
All Tauri commands are accessed through `src/commands/index.ts` — components never call `invoke()` directly. Tauri v2 auto-converts camelCase JS args to snake_case Rust params.

Five Rust commands in `src-tauri/src/commands.rs`:
- `load_profiles`, `save_profiles` — CRUD via JSON file
- `run_profile` — opens all platform-matching items, **accumulates errors** (never fail-fast)
- `validate_path` — `Path::exists()`
- `get_current_platform` — compile-time `cfg!` check

### Frontend State
- `ProfileContext` + `profileReducer` (8 action types including `REORDER_ITEMS` for drag-drop)
- `I18nContext` — custom i18n with 2 locales (en/vi), parameter substitution `{key}`, persisted to localStorage

### Type Parity
`src/types/index.ts` mirrors `src-tauri/src/models.rs` exactly for serde compatibility. When changing data models, update both files.

### Styling
CSS Modules (`.module.css`) with CSS custom properties in `global.css`. Dark/light mode follows OS `prefers-color-scheme`. Sidebar is fixed 260px width.

## Key Conventions

- **Platform-aware file dialogs**: On macOS, `.app` bundles are directories, so the browse dialog uses `directory: true` for app-type items on macOS but file picker with `.exe` filter on Windows (see `AddItemDialog.tsx`)
- **i18n**: Both locale files must have identical key sets. Add new keys to both `en.json` and `vi.json`
- **IDs**: Generated with `nanoid()` on the frontend — no Rust round-trip needed
- **Error accumulation**: `run_profile` opens ALL items even if some fail, then returns a `RunResult` with per-item errors
- **Auto-save skip**: `isInitialLoad` ref flag prevents saving the empty state that exists before profiles load from disk

## Tauri Capabilities

Permissions are declared in `src-tauri/capabilities/default.json`: `core:default`, `opener:default`, `dialog:default`, `dialog:allow-open`. New Tauri plugin usage requires adding permissions here.
