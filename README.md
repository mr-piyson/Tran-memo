# Ledger Notes

A cross-platform money-tracker note app built with Tauri 2, React 19, Vite 8, Tailwind CSS 4, shadcn/ui (Base UI primitives) and TypeScript. It uses a WhatsApp-inspired layout: a tools rail, a dealer list, a ledger-note list, and a chat-style transaction timeline. All list views are ag-grid lists with one custom cell per row.

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
| Lists | `ag-grid-community` + `ag-grid-react` (one custom cell per row) |

## Features

- Desktop three-pane layout: tools rail, dealer list, ledger-note list, chat timeline
- Mobile stacked views: dealers → notes → chat, with back buttons and tools rail
- Create/delete dealers and ledger notes with emoji avatars, search, and phone numbers
- Add income/expense "messages" with amount + description, per-note totals, delete entries
- Currency selector in Settings; per-note and overall summaries
- SQLite in Tauri; `localStorage` fallback for browser UI development

## Prerequisites

- Node.js 22+ and pnpm
- Rust 1.90+ (Tauri SQL plugin requirement) and the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS

## Run

```bash
pnpm install
pnpm tauri dev
```

`pnpm dev` runs the frontend in a browser with a `localStorage` fallback, which is handy for quick UI work. Data in that mode is separate from the desktop app's SQLite database.

## Build

```bash
pnpm tauri build
```

## Mobile

```bash
pnpm tauri android init
pnpm tauri android dev

pnpm tauri ios init
pnpm tauri ios dev
```

## Useful commands

```bash
pnpm typecheck   # TypeScript check
pnpm build       # Frontend production build
cargo check      # Rust check (run inside src-tauri)
```

The SQLite file (`ledger.db`) lives in the platform app-data directory. The schema is created automatically by the migration in `src-tauri/src/lib.rs`.

Change the currency from the Settings modal (sidebar on desktop / tools rail on mobile). The default is `BHD`, displayed with 3 decimals; supported currencies are listed in `CURRENCIES` in `src/lib/entries.ts`.

## Main source files

- `src/App.tsx` — app state, data loading, settings, new-dealer/new-note dialogs
- `src/components/AppSidebar.tsx` — tools rail
- `src/components/ListGrid.tsx` — shared ag-grid single-row list
- `src/components/LedgerPanels.tsx` — dealer list, ledger-note list, transaction thread and composer
- `src/components/EmojiPicker.tsx` — emoji avatar picker in a shadcn Popover
- `src/components/ui/` — generated shadcn/Base UI components
- `src/lib/entries.ts` — SQLite/browser data store and formatting helpers
- `src/lib/utils.ts` — shadcn `cn` helper
