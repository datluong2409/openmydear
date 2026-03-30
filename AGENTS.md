# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Overview

**OpenMyDear** is a Tauri v2 desktop launcher (React 19 + Rust). Users create "profiles" containing lists of apps/files/folders, then launch all items at once (parallel or sequential with configurable delay). Single-screen app, no router.

## Build & Run Commands

```bash
npm run dev          # Vite dev server only (browser, port 1420)
npm run dev:app      # Full Tauri dev mode (native window + HMR, needs Rust + MSVC)
npm run build        # TypeScript check + Vite bundle
npm run build:app    # Full production build + installer
npx tsc --noEmit     # Type-check only (run this to verify TS changes)
cargo check          # Check Rust compilation (run from src-tauri/)
```

On Windows, run `dev.bat` first to set up the MSVC environment before `npm run dev:app`.

**No linter, formatter, or test framework is configured.** The only automated check is `tsc --noEmit`.

## Architecture & Data Flow

```
Rust (profiles.json) → load_profiles → ProfileContext (useReducer)
  → Components read via useProfiles() → dispatch actions → reducer
  → useEffect (300ms debounce) → save_profiles → Rust writes to disk
```

- All Tauri `invoke()` calls are centralized in `src/commands/index.ts` — components never call `invoke()` directly.
- TypeScript types in `src/types/index.ts` mirror Rust models in `src-tauri/src/models.rs` — **keep these in sync**.
- New Tauri commands must be registered in `src-tauri/src/lib.rs` and declared in `src-tauri/capabilities/default.json`.

## Frontend Code Style (React/TypeScript)

### Imports — strict ordering

1. React core (`react`, `react-dom`)
2. Third-party libraries (`nanoid`, `lucide-react`, `@dnd-kit/*`, `@tauri-apps/*`)
3. Internal hooks (`../../hooks/useProfiles`)
4. Internal commands (`../../commands`)
5. Internal components (`../common/Button`)
6. Types — always last, using `import type` syntax

### Components

- **Function declarations**, not arrow functions: `export function Sidebar() { ... }`
- **Named exports** for all components. Only `App.tsx` uses `default export`.
- **No `React.FC`** — type props via destructuring: `function Foo({ bar }: FooProps) { ... }`
- Props interface named `{ComponentName}Props`, declared in the same file above the component.
- Internal sub-components are non-exported functions in the same file.

### File & Naming Conventions

- Components: PascalCase directory + PascalCase file (`components/Sidebar/Sidebar.tsx`)
- Shared components: `components/common/` without subdirectories
- Hooks: `use` prefix, camelCase file (`hooks/useProfiles.ts`)
- Context files: PascalCase because they export Provider components
- No path aliases — all imports use relative paths (`../../hooks/...`)
- No barrel/re-export files (only `types/index.ts` and `commands/index.ts` use index files)

### TypeScript

- `interface` for object shapes, `type` for unions/aliases
- `import type { ... }` for type-only imports
- `| null` (not `| undefined`) for absent state values
- Optional fields use `?:` syntax in interfaces
- `tsconfig.json`: `strict: true`, `noUnusedLocals`, `noUnusedParameters`

### State Management

- Global state: `useReducer` + React Context (no Redux/Zustand)
- Action types: `SCREAMING_SNAKE_CASE` discriminated union
- Context initialized with `createContext<T>(null!)`, accessed via dedicated hook
- Local state: `useState` for UI state, `useRef` for mutable non-rendering values
- Hooks return plain objects (not arrays)

### Styling

- **Tailwind utility classes** (CDN, not PostCSS) with arbitrary values: `px-[10px]`, `text-[13px]`
- **CSS Custom Properties** for theming, applied via inline `style` attributes: `style={{ color: "var(--color-text)" }}`
- **`onMouseEnter`/`onMouseLeave`** handlers for hover effects (not CSS `:hover`) because colors come from CSS vars
- CSS variables follow `--color-{category}`, `--radius-{size}`, `--shadow-{size}` naming
- Dark mode via `@media (prefers-color-scheme: dark)` in `global.css`
- CSS Module files exist but are **not used** — they are legacy artifacts

### Error Handling

- Promise chains: `.catch((err) => console.error("Description:", err))`
- Async functions: `try { await ... } catch (err) { console.error(...) }`
- No user-facing error toasts — errors go to console only

### Localization

- Flat key-value JSON (`en.json`, `vi.json`), dot-separated keys: `"profile.deleteConfirm"`
- Template params: `{paramName}` syntax — `t("run.success", { succeeded: 5, total: 10 })`
- English is fallback locale
- **Always add keys to both `en.json` and `vi.json`** when adding new user-facing text

## Backend Code Style (Rust)

### Module Structure

Flat modules in `src-tauri/src/`: `lib.rs`, `commands.rs`, `models.rs`, `storage.rs`. Cross-module refs use `crate::` paths.

### Commands

- All commands are `pub fn` in `commands.rs` with `#[tauri::command]`
- All return `Result<T, String>` — no custom error types
- Rust `snake_case` params auto-map from frontend `camelCase`
- Commands are synchronous (not async)
- Register new commands in `lib.rs` `generate_handler![]`

### Models & Serde

- Enums: `#[serde(rename_all = "lowercase")]`
- Struct fields: `snake_case` internally, `#[serde(rename = "camelCase")]` for JSON
- Optional fields: `Option<T>` with `#[serde(default, skip_serializing_if = "Option::is_none")]`
- Derive order: `Debug, Clone, Serialize, Deserialize` then others (`PartialEq`)
- Default values: implement `Default` trait or use `#[serde(default = "fn_name")]`

### Error Handling

- `map_err(|e| format!("Failed to {action}: {}", e))?` — universal pattern
- Error messages: `"Failed to {verb}: {error}"` or `"{Thing} not found: {id}"`
- No `thiserror`/`anyhow` — plain `String` errors throughout

### Platform-Specific Code

```rust
#[cfg(target_os = "windows")]
fn list_installed_apps() -> Vec<AppInfo> { ... }
#[cfg(target_os = "macos")]
fn list_installed_apps() -> Vec<AppInfo> { ... }
#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn list_installed_apps() -> Vec<AppInfo> { Vec::new() }
```

## Formatting

- **2-space indentation** in TypeScript, JSON, CSS, HTML
- **4-space indentation** in Rust (standard rustfmt)
- **Double quotes** for all strings in TypeScript/JSX
- **Semicolons** at end of every statement
- **Trailing commas** in multi-line constructs

## Key Reminders

- No test suite exists — verify changes with `npx tsc --noEmit` and `cargo check`
- Keep `src/types/index.ts` and `src-tauri/src/models.rs` in sync when changing data shapes
- Add new Tauri commands to **three places**: `commands.rs`, `lib.rs` handler list, `capabilities/default.json`
- Add all user-facing strings to **both** `en.json` and `vi.json`
- The window is configured as always-on-top in `tauri.conf.json`
