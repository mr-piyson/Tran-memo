# Graph Report - NoteAPP  (2026-11-20)

## Corpus Check
- Corpus is ~5,859 words - fits in a single context window. You may not need a graph.

## Summary
- 335 nodes · 476 edges · 29 communities (24 shown, 5 thin omitted)
- Extraction: 89% EXTRACTED · 10% INFERRED · 1% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Core UI Components & State
- Docs: Features & Tech Stack
- Build Config & Dependencies
- Tauri App Configuration
- UI Layout & Virtualization
- TypeScript Configuration
- App State & SQLite Store
- 107px Icon Asset
- 310px Store Tile Icon
- 89px Icon Asset
- Dev Dependencies
- EntryStore Interface
- 142px Icon Asset
- 150px Icon Asset
- 284px Icon Asset
- 44px Icon Asset
- 128px @2x Icon Asset
- Main App Icon
- 71px Icon Asset
- HTML Entry Point
- Tauri Capabilities & Permissions
- 30px Icon Asset
- Store Logo Icon
- 128px Icon Asset
- 32px Icon Asset
- Rust Crate Package

## God Nodes (most connected - your core abstractions)
1. `Ledger Notes` - 23 edges
2. `App()` - 18 edges
3. `compilerOptions` - 18 edges
4. `getStore()` - 11 edges
5. `ChatPanel()` - 10 edges
6. `pnpm` - 10 edges
7. `base()` - 9 edges
8. `NotesPanel()` - 8 edges
9. `EntryStore` - 8 edges
10. `Tauri 2` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Ledger Notes (HTML title)` --same_name_as--> `Ledger Notes`  [INFERRED]
  index.html → README.md
- `#root mount element` --hosts--> `Ledger Notes`  [INFERRED]
  index.html → README.md
- `App()` --calls--> `ChatPanel()`  [EXTRACTED]
  src/App.tsx → src/components/ChatPanel.tsx
- `App()` --calls--> `Modal()`  [EXTRACTED]
  src/App.tsx → src/components/Modal.tsx
- `App()` --calls--> `NotesPanel()`  [EXTRACTED]
  src/App.tsx → src/components/NotesPanel.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Unified two-tone circular coin icon design shared by the badge, coin motif, and color palette** — src_tauri_icons_128x128_2x_app_icon, src_tauri_icons_128x128_2x_circular_badge, src_tauri_icons_128x128_2x_coin_motif, src_tauri_icons_128x128_2x_color_palette [INFERRED]
- **Branded Tauri bundle asset — the icon renders the Ledger Notes money-tracking identity for packaging** — src_tauri_icons_128x128_2x_app_icon, src_tauri_icons_128x128_2x_ledger_notes_brand, src_tauri_icons_128x128_2x_tauri_bundle_icon [INFERRED]
- **Unified two-tone circular coin mark shared by the ring, stacked coin motif, and gold/cyan palette** — src_tauri_icons_square310x310logo_image_asset, src_tauri_icons_square310x310logo_circular_logo_mark, src_tauri_icons_square310x310logo_coin_motif, src_tauri_icons_square310x310logo_amber_palette, src_tauri_icons_square310x310logo_cyan_palette [INFERRED]
- **Branded Windows Store tile asset — the icon renders the Ledger Notes money-tracking identity for app packaging** — src_tauri_icons_square310x310logo_image_asset, src_tauri_icons_square310x310logo_windows_store_tile, src_tauri_icons_square310x310logo_ledger_notes_brand [INFERRED]
- **Gold + cyan chat bubbles form the circular app mark** — src_tauri_icons_square71x71logo_app_icon_asset, src_tauri_icons_square71x71logo_interlocking_chat_bubble_mark, src_tauri_icons_square71x71logo_amber_gold_bubble, src_tauri_icons_square71x71logo_cyan_teal_bubble, src_tauri_icons_square71x71logo_transparent_background [EXTRACTED 1.00]

## Communities (29 total, 5 thin omitted)

### Community 0 - "Core UI Components & State"
Cohesion: 0.10
Nodes (41): app state, composer, data loading, formatting helpers, small shared UI pieces, solid-js, EMOJIS, ChatPanel() (+33 more)

### Community 1 - "Docs: Features & Tech Stack"
Cohesion: 0.06
Nodes (39): add income/expense messages, platform app-data directory, browser, cargo check, SQLite/browser data store, delete entries, delete notes, emoji avatars (+31 more)

### Community 2 - "Build Config & Dependencies"
Cohesion: 0.07
Nodes (28): dependencies, solid-js, @solidjs/web, @tanstack/virtual-core, @tauri-apps/api, @tauri-apps/plugin-sql, description, license (+20 more)

### Community 3 - "Tauri App Configuration"
Cohesion: 0.10
Nodes (20): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+12 more)

### Community 4 - "UI Layout & Virtualization"
Cohesion: 0.13
Nodes (19): back button, bottom bar on mobile, bottom tools rail, CURRENCIES, currency selector in Settings, desktop three-pane layout, mobile stacked views (notes list → chat), settings (+11 more)

### Community 5 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, jsxImportSource, lib, module, moduleResolution (+11 more)

### Community 6 - "App State & SQLite Store"
Cohesion: 0.27
Nodes (13): @tauri-apps/plugin-sql, App(), addEntry(), changeCurrency(), clearBrowserData(), createNote(), deleteNote(), reload() (+5 more)

### Community 7 - "107px Icon Asset"
Cohesion: 0.28
Nodes (9): Square107x107Logo.png — 107×107 square PNG icon asset, Overlapping chat-bubble conversation motif, Cyan lower-left rounded C-shaped outline with inner vertical bar, Gold upper-right rounded C-shaped outline with inner vertical bar, Ledger Notes app/brand identity, Wordless interlocking two-color symbol, Cyan #24C8DB and gold #FFC131 palette, Square 107×107 logo variant (+1 more)

### Community 8 - "310px Store Tile Icon"
Cohesion: 0.31
Nodes (9): Gold/amber brand color #FFC131 (RGB 255,193,49), Uncertain reading of the inner stacked discs as coins/currency, chat bubbles, or an abstract monogram, Circular two-tone logo mark: a bold ring split gold (upper/right) and cyan (left/lower), tapering to a small speech-bubble tail at the bottom, Stacked dual-disc motif inside the ring: a filled gold disc above and a filled cyan disc below, read as two coins, Cyan/teal brand color #24C8DB (RGB 36,200,219), Square310x310Logo.png — 310×310 8-bit colormap PNG app icon asset in src-tauri/icons, Ledger Notes app/brand identity (Tauri project product name), a money-tracker note app, Transparent alpha background (~77% of pixels fully transparent), no opaque backdrop behind the mark (+1 more)

### Community 9 - "89px Icon Asset"
Cohesion: 0.22
Nodes (9): Square89x89Logo.png — 89×89 PNG app icon asset with transparent background, Interlocking central gold and cyan comma / pin-like forms creating an S-shaped division inside the circle, Circular two-tone emblem / roundel logo mark, split into a gold upper half and cyan lower half, Cyan / teal (#24C8DB) lower arc of the circular mark, Gold / amber (#FFC131) upper arc of the circular mark, NoteAPP application brand identity represented by the logo, Tauri desktop application icon family (src-tauri/icons), Transparent (empty alpha) background around the emblem (+1 more)

### Community 10 - "Dev Dependencies"
Cohesion: 0.25
Nodes (8): devDependencies, @solidjs/vite-plugin, tailwindcss, @tailwindcss/vite, @tauri-apps/cli, @types/node, typescript, vite

### Community 12 - "142px Icon Asset"
Cohesion: 0.25
Nodes (8): Amber/gold brand color #FFC131 (RGB 255,193,49), Uncertain interpretation of inner mark as ledger lines, stacked pages, bookmark, or abstract monogram, Circular two-tone logo mark: open ring split amber (top/right) and cyan (left/bottom) with stacked central bars, Cyan brand color #24C8DB (RGB 36,200,219), Square142x142Logo.png — 142×142 8-bit colormap PNG icon asset, Ledger Notes app/brand identity (Tauri project product name), Transparent alpha background (roughly 76% of pixels fully transparent), Square tile icon size variant in the Tauri icon set (Windows-style SquareNNxNNameLogo naming)

### Community 13 - "150px Icon Asset"
Cohesion: 0.25
Nodes (8): Square150x150Logo.png — 150×150 PNG app-icon asset located in the Tauri icons directory, Circular visual mark: two interlocking crescent/petal shapes forming a broken ring (golden upper-right arc, teal lower-left arc, each with an inward-pointing petal), Gold/amber accent color #FFC131 — dominant warm tone forming the upper-right arc and inner petal of the mark, Brand/app identity mark for 'Ledger Notes' — a cross-platform money-tracker note app built with Tauri 2 and Solid 2, Ambiguous symbolic reading: the dual-colour interlocking petals resemble a yin-yang balance, two coins, or a leaf/flame harmony motif (exact intent uncertain), Teal/cyan accent color #24C8DB — dominant cool tone forming the lower-left arc and inner petal of the mark, Transparent background (alpha channel) — the emblem is an isolated mark with no solid fill or backdrop, 150×150 Windows tile / Store logo variant from Tauri's generated icon set (Square150x150Logo naming convention)

### Community 14 - "284px Icon Asset"
Cohesion: 0.25
Nodes (8): Square284x284Logo.png — 284×284 PNG app-icon/tile asset in the src-tauri/icons icon set, Two-tone circular emblem brand mark: interlocking gold and cyan curved crescent/swoosh shapes forming a rough ring or circle, Possible interlocking speech-bubble/conversation motif (uncertain visual interpretation), Cyan/teal accent color #24C8DB (RGB 36,200,219) — lower/left crescent and inner blob of the mark, Gold/amber accent color #FFC131 (RGB 255,193,49) — upper/right crescent of the mark, Ledger Notes — brand/app identity of this money-tracker note app (Tauri 2 + Solid 2), Tauri icon-set variant — Square*Logo.png family used for Windows store/tile and app icons, Transparent background (alpha 0) — majority of the 284×284 canvas is fully transparent

### Community 15 - "44px Icon Asset"
Cohesion: 0.25
Nodes (8): Square44x44Logo.png — 44×44 PNG app-icon asset located in the Tauri icons directory, Circular visual mark: two interlocking crescent/petal shapes forming a broken ring, golden upper-right arc and teal lower-left arc, each with an inward-pointing petal, Gold/amber accent color #FFC131 — dominant warm tone forming the upper-right arc and inner petal of the mark, Brand/app identity mark for 'Ledger Notes' — a cross-platform money-tracker note app built with Tauri 2 and Solid 2, Ambiguous symbolic reading: the dual-colour interlocking petals resemble a yin-yang balance, two coins, or a leaf/flame harmony motif (exact intent uncertain), Teal/cyan accent color #24C8DB — dominant cool tone forming the lower-left arc and inner petal of the mark, Transparent background (alpha channel) — the emblem is an isolated mark with no solid fill or backdrop, 44×44 Windows small tile / app-list logo variant from Tauri's generated icon set (Square44x44Logo naming convention)

### Community 16 - "128px @2x Icon Asset"
Cohesion: 0.52
Nodes (7): Ledger Notes @2x app icon — 128x128@2x.png raster icon asset (256x256 PNG), Circular badge silhouette — round ring with golden-yellow upper arc and cyan lower arc, Overlapping dual-disc motif — a golden disc above-right and a cyan disc below-left, read as two coins, Two-tone flat color palette — golden yellow (#FFC131) and cyan/teal (#24C8DB), Ledger Notes brand identity — money-tracker note app whose coin motif echoes income/expense tracking, Tauri bundle icon asset — high-density @2x PNG variant used for desktop/mobile app packaging, Fully transparent background (alpha channel) — no opaque backdrop behind the mark

### Community 17 - "Main App Icon"
Cohesion: 0.38
Nodes (7): Main Tauri desktop application icon asset (icon.png, 512x512), Cyan/teal secondary color #24C8DB (RGB 36,200,219), Gold/amber primary color #FFC131 (RGB 255,193,49), AMBIGUOUS: mark may depict overlapping note sheets or an abstract interlock, NoteAPP brand identity / product icon (inferred from repository name), Transparent background (roughly 78% fully transparent pixels), Two-tone interlocking geometric mark: gold arched bracket over a cyan bowl/bracket

### Community 18 - "71px Icon Asset"
Cohesion: 0.33
Nodes (7): Amber/gold (#FFC131) upper-right bubble and tail, Square71x71Logo.png — 71×71 raster app icon asset, Chat/conversation metaphor for chat-style notes and transactions, Cyan/teal (#24C8DB) lower-left bubble and tail, Circular two-tone interlocking chat-bubble mark, Square 71×71 size variant of the Tauri icon set, Transparent background (RGBA, no backdrop plate)

### Community 19 - "HTML Entry Point"
Cohesion: 0.40
Nodes (5): Ledger Notes (HTML title), noscript fallback message, #root mount element, /src/index.tsx, theme-color #0f172a

### Community 20 - "Tauri Capabilities & Permissions"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 21 - "30px Icon Asset"
Cohesion: 0.33
Nodes (6): Amber/gold brand color #FFC131 (rgb 255,193,49) used in the mark, Small-size Windows/UWP Square 30×30 app-logo variant for the Ledger Notes Tauri app, Cyan/teal brand color #24C8DB (rgb 36,200,219) used in the mark, Square30x30Logo.png — 30×30 RGBA PNG logo icon asset in src-tauri/icons, Fully transparent background (alpha 0) — mark has no filled backdrop, Abstract two-tone logo mark: two interlocking rounded ribbon loops (amber upper/right, cyan lower/left) forming a compact symbol

### Community 22 - "Store Logo Icon"
Cohesion: 0.40
Nodes (6): StoreLogo.png — 50x50 Microsoft Store app-logo PNG asset in src-tauri/icons, Cyan/turquoise palette of the mark (~#24C8DB, RGB 36,200,219), Gold/yellow palette of the mark (~#FFC131, RGB 255,193,49), Purpose: Microsoft Store listing logo / app icon for the Ledger Notes Tauri desktop app (default Tauri branding, not custom artwork), Central visual mark: stylized 'T' formed by two interlocking circular arcs (yellow upper arc, cyan lower arc) — the Tauri framework logo, Transparent background with the mark centered and padded (indexed-color PNG, 8-bit colormap)

### Community 23 - "128px Icon Asset"
Cohesion: 0.40
Nodes (5): 128x128.png — square 128px transparent PNG app icon asset in src-tauri/icons, Stock Tauri scaffold icon (unmodified starter logo, not custom Ledger Notes artwork) — inference from exact Tauri brand colors and shape, Stylized Tauri brand mark: interlocking gold arc and cyan chevron/ribbon forming a T-like geometric emblem with a hollow center, Two-tone flat palette of cyan #24C8DB and gold/yellow #FFC131 on a fully transparent background with anti-aliased edges, Application identity artwork intended for desktop/window/taskbar branding of the Tauri app rather than a photograph or screenshot

### Community 24 - "32px Icon Asset"
Cohesion: 0.40
Nodes (5): 32x32.png — square 32px transparent PNG app icon asset in src-tauri/icons, Stock Tauri scaffold icon (unmodified starter logo, not custom Ledger Notes artwork) — inference from exact Tauri brand colors and shape, Stylized Tauri brand mark: interlocking gold arc and cyan chevron/ribbon forming a T-like geometric emblem with a hollow center, Two-tone flat palette of cyan #24C8DB and gold/yellow #FFC131 on a fully transparent background with anti-aliased edges, Small-size application identity artwork intended for window/taskbar/tray branding of the Tauri app rather than a photograph or screenshot

## Ambiguous Edges - Review These
- `Circular two-tone logo mark: open ring split amber (top/right) and cyan (left/bottom) with stacked central bars` → `Uncertain interpretation of inner mark as ledger lines, stacked pages, bookmark, or abstract monogram`  [AMBIGUOUS]
  src-tauri/icons/Square142x142Logo.png · relation: references
- `Circular visual mark: two interlocking crescent/petal shapes forming a broken ring (golden upper-right arc, teal lower-left arc, each with an inward-pointing petal)` → `Ambiguous symbolic reading: the dual-colour interlocking petals resemble a yin-yang balance, two coins, or a leaf/flame harmony motif (exact intent uncertain)`  [AMBIGUOUS]
  src-tauri/icons/Square150x150Logo.png · relation: references
- `Two-tone circular emblem brand mark: interlocking gold and cyan curved crescent/swoosh shapes forming a rough ring or circle` → `Possible interlocking speech-bubble/conversation motif (uncertain visual interpretation)`  [AMBIGUOUS]
  src-tauri/icons/Square284x284Logo.png · relation: references
- `Circular two-tone logo mark: a bold ring split gold (upper/right) and cyan (left/lower), tapering to a small speech-bubble tail at the bottom` → `Uncertain reading of the inner stacked discs as coins/currency, chat bubbles, or an abstract monogram`  [AMBIGUOUS]
  src-tauri/icons/Square310x310Logo.png · relation: references
- `Circular visual mark: two interlocking crescent/petal shapes forming a broken ring, golden upper-right arc and teal lower-left arc, each with an inward-pointing petal` → `Ambiguous symbolic reading: the dual-colour interlocking petals resemble a yin-yang balance, two coins, or a leaf/flame harmony motif (exact intent uncertain)`  [AMBIGUOUS]
  src-tauri/icons/Square44x44Logo.png · relation: references
- `Two-tone interlocking geometric mark: gold arched bracket over a cyan bowl/bracket` → `AMBIGUOUS: mark may depict overlapping note sheets or an abstract interlock`  [AMBIGUOUS]
  src-tauri/icons/icon.png · relation: references

## Knowledge Gaps
- **81 isolated node(s):** `@tauri-apps/api`, `@tauri-apps/cli`, `@types/node`, `tailwindcss`, `typescript` (+76 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 170 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Ledger Notes` connect `Docs: Features & Tech Stack` to `HTML Entry Point`, `UI Layout & Virtualization`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Ledger Notes` (e.g. with `Ledger Notes (HTML title)` and `#root mount element`) actually correct?**
  _`Ledger Notes` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `@tauri-apps/api`, `@tauri-apps/cli`, `@types/node` to the rest of the system?**
  _81 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core UI Components & State` be split into smaller, more focused modules?**
  _Cohesion score 0.10119047619047619 - nodes in this community are weakly interconnected._
- **Why does `solid-js` connect `Core UI Components & State` to `Build Config & Dependencies`, `UI Layout & Virtualization`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Circular two-tone logo mark: open ring split amber (top/right) and cyan (left/bottom) with stacked central bars` and `Uncertain interpretation of inner mark as ledger lines, stacked pages, bookmark, or abstract monogram`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `Circular visual mark: two interlocking crescent/petal shapes forming a broken ring (golden upper-right arc, teal lower-left arc, each with an inward-pointing petal)` and `Ambiguous symbolic reading: the dual-colour interlocking petals resemble a yin-yang balance, two coins, or a leaf/flame harmony motif (exact intent uncertain)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._