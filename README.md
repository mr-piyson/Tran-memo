# Ledger Notes

A cross-platform money-tracker note app built with Tauri 2, Solid 2, Vite, Tailwind CSS 4 and TypeScript. It uses a WhatsApp-inspired layout: a tools rail, a virtualized notes/chats panel, and a virtualized chat-style transaction timeline.

Each note is a conversation thread with its own income/expense entries (type, amount, description), stored in a local SQLite database.

## Stack

| Layer | Technology |
| --- | --- |
| Desktop / mobile shell | Tauri 2 (Rust) |
| UI | Solid 2 + Vite 8 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Language | TypeScript 7 |
| Storage | `@tauri-apps/plugin-sql` with SQLite, migrations in `src-tauri/src/lib.rs` |
| Lists | `@tanstack/virtual-core` via a small Solid 2 adapter in `src/lib/virtual.ts` |

## Features

- Desktop three-pane layout: tools rail, virtualized notes list, virtualized chat timeline
- Mobile stacked views: notes list → chat, with a back button and bottom tools rail
- Create/rename-style notes with emoji avatars, search, and delete
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

Change the currency from the Settings modal (bottom rail on desktop / bottom bar on mobile). The default is `USD`; supported currencies are listed in `CURRENCIES` in `src/lib/entries.ts`.

## Main source files

- `src/App.tsx` — app state, data loading, settings, new-note modal
- `src/components/Rail.tsx` — tools/options rail
- `src/components/NotesPanel.tsx` — virtualized notes/contact-style list
- `src/components/ChatPanel.tsx` — virtualized chat-style transaction list and composer
- `src/components/Icons.tsx`, `src/components/Modal.tsx` — small shared UI pieces
- `src/lib/entries.ts` — SQLite/browser data store and formatting helpers
- `src/lib/virtual.ts` — Solid 2 adapter for `@tanstack/virtual-core`
