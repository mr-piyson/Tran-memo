# Ledger App — Design Document (Dark UI)

> **Source:** Figma board "Dark UI theme" (11 mobile screens, 360 × 640 each).
> **Target stack:** React 18 + TypeScript + Vite · Tailwind CSS · **shadcn/ui** · lucide-react · React Router · Zustand (or TanStack Query + API) · react-hook-form + zod.
> **Companion file:** `ledger-poc.html` — a single-file interactive HTML proof of concept. It is the visual source of truth: every element carries `data-ui="ComponentName"` (the React component to build) and `data-shadcn="Primitive"` (the shadcn/ui base). Feed **both files** to an AI.

---

## 1. Product summary

A mobile-first **personal ledger / deals tracker**. A user keeps a list of **people** (contacts); for each person they record **deals** (money in/out or a named item), each with an invoice number, note and timestamp. The UI borrows from chat apps: a ledger thread with a quick-entry composer at the bottom, and a search view that shows deals as bubbles.

- Currency: **BD** (Bahraini Dinar), always **3 decimals** (`50.000 BD`). Phone numbers are Bahraini (`+973 - 36860504`).
- Dark theme only (v1). Consider RTL / Arabic as a later phase (see §12).
- Primary form factor: phone (360 px wide). On desktop, render inside a centered max-width 480 px column.

## 2. Screen inventory (11 screens)

| # | Screen (Figma) | Route | Key content | PoC key |
|---|---|---|---|---|
| 1 | Person ledger + composer | `/people/:id` | Header (avatar, name, **Total**), `DealCard` list (blue), bottom `Composer` (amount + note + send) | `person` |
| 2 | Add New Deal | `/people/:id/deals/new` | Back + title, contact summary card, date picker, Name / Phone / Email / Budget fields with validation colours, Cancel / Submit | `addDeal` |
| 3 | Orders panel | `/orders` | Search, horizontally scrolling tabs (`order-1`, `order-2`…), red negative `DealCard`s with dismiss ✕, bottom `TabBar` | `orders` |
| 4 | Person deals (item) | `/people/:id` | Same as 1 but item-type deal (title, no amount) and a **FAB** | `person` |
| 5 | History | `/history` | Hamburger, "History", search, kebab; rows: date + `+30.000`, name, avatar; FAB | `history` |
| 6 | Profile drawer | overlay on any page | Left sheet: avatar + "Ali Ateeq", nav items; dimmed scrim | `ProfileDrawer` |
| 7 | Deal detail | `/deals/:id` | Avatar + name, rows (Date, Tags, Email, phone, Description), "+" add field, buttons Excel / Export / Delete / Done | `detail` |
| 8 | Search | `/search` | Search input, filter chips **Price / Text**, date dividers, deal bubbles (negative right/red, positive left/green), composer | `search` |
| 9 | Login | `/login` | Large bolt logo, **log in** (primary pill), **Sign in** (light pill) | `login` |
| 10 | Empty state | `/` | Logo header, 3 tabs, big archive icon, "There are no Deals", FAB | `home` (empty) |
| 11 | Menu popover | overlay | "Menu": Account, About, Setting (selected), log out (destructive) | `AppMenu` |

### Navigation map

```
/login ──log in──▶ /  (Home: Deals tab)
                    ├─ tab 2 ▶ /history
                    ├─ tab 3 ▶ /orders
                    ├─ person row ▶ /people/:id ─┬─ FAB ▶ /people/:id/deals/new
                    │                            ├─ deal card ▶ /deals/:id
                    │                            └─ search icon ▶ /search
                    ├─ ⋮ menu ▶ Account (ProfileDrawer) · About · Setting · log out ▶ /login
                    └─ ☰ (History) ▶ ProfileDrawer
```

## 3. Design tokens

Values were **measured from the Figma export** (approximate; designer to confirm). Names follow shadcn/ui's CSS-variable convention so they drop into `globals.css`. The app is **dark-only**: put these in `:root` and add `class="dark"` to `<html>`.

### 3.1 Colour

| Token | Hex | Used for |
|---|---|---|
| `--background` | `#1a1a1a` | App background |
| `--card` / `--popover` | `#2b2b2b` | Headers, deal cards, composer, menu |
| `--panel` (custom) | `#1c1c1c` | Form panel wells, field groups, menu list |
| `--foreground` | `#f2f2f2` | Primary text |
| `--muted-foreground` | `#8a8a8a` | Placeholders, secondary text, dates |
| `--secondary` / `--input` | `#292929` | Inputs, outline buttons |
| `--accent` | `#3a3a3a` | Selected / hover menu row |
| `--border` | `#3a3a3a` | Dividers |
| `--primary` | `#0072a5` | FAB, active tab icon, active chip, dividers |
| `--primary-hover` / `--ring` | `#1a80ae` | Submit button, focus ring, date field border, tab underline |
| `--amount-blue` (custom) | `#387cf8` | Neutral deal amount / "Sign in" text |
| `--bar-blue` (custom) | `#356bce` | Card underline gradient (blue) |
| `--success` (custom) | `#00a859` | Positive amount, valid field border, Total `+` |
| `--bar-green` (custom) | `#1a5a3b` | Underline gradient (green) |
| `--danger` (custom) | `#c2074f` | Negative amount, invalid field border, log out |
| `--bar-red` (custom) | `#980542` | Underline gradient (red) |
| `--destructive` | `#b0063f` | Destructive actions |
| Delete button | bg `#3d1618` / border `#6b2124` | |
| Done button | bg `#1b3a5c` / border `#26527f` | |
| Excel button | bg `#193c29` / border `#1f5a3a` | |
| Tag chips | `#4f7a3a` (green), `#7a3f57` (pink) | |

**Semantic rule (important):** amount colour encodes meaning — **blue** = neutral/open deal, **green** = positive, **red** = negative. Field border colour encodes validation — **neutral** (untouched), **green** valid, **red** invalid, **blue** focus.

### 3.2 Typography — Roboto

| Role | Size / weight |
|---|---|
| Screen title ("Add New Deal") | 17 / 700 |
| Header name | 16 / 400 |
| Header sub ("Total : +30.000") | 12 / 400 |
| Deal amount | 18 / 400 |
| Field text | 17 / 400 · deal-detail rows 12 |
| Empty-state text | 26 / 300 |
| Note text | 10 · invoice 11 · date/time 8 (muted) |
| Button label | 16–19 |

### 3.3 Shape, spacing, elevation

- Radius: card **12**, field/button **10**, form panel **14**, FAB **16**, pill **999**, avatar **50 %**.
- Spacing: 12 px screen gutter; 10 px between deal cards; header height **60**; tab bar height **44**.
- Shadow: `0 2px 6px rgba(0,0,0,.45)` on cards; menu `0 8px 24px rgba(0,0,0,.65)`.
- Card underline: **3 px** `linear-gradient(90deg, <tone>, transparent 92%)` between amount row and note row.

## 4. shadcn/ui component mapping

Install: `npx shadcn@latest add button input textarea card badge avatar tabs sheet dropdown-menu popover calendar select form label toggle-group sonner separator scroll-area`

| App component | Built on | Notes |
|---|---|---|
| `AppHeader` | plain `<header>` + `Avatar` + `Button variant="ghost" size="icon"` | Props: `back`, `person`, `title`, `onSearch`, `menu`, `logo` |
| `DealCard` | `Card` | Prop `tone: "blue" \| "green" \| "red"`; optional `dismissible`; gradient bar is a `div` |
| `Composer` | `Input` ×2 + `Button variant="ghost" size="icon"` | Amount input right-aligned, green; send turns `--primary-hover` when amount present |
| `Fab` | `Button size="icon"` with `rounded-2xl w-[54px] h-[54px]` | `fixed` bottom-left (LTR) |
| `TabBar` | `Tabs` / `TabsList` / `TabsTrigger` | 3 icon tabs: Deals (inbox-arrow), History (clock), Orders (wallet); active = filled primary square + underline glow |
| `OrderTabs` | `Tabs` in a horizontal `ScrollArea` | Text tabs, active underline `--primary-hover` |
| `DealForm` | `Form` (react-hook-form) + `Input` + `Popover` + `Calendar` | Field icons: `Calendar`, `Users`, `Phone`, `MessageSquare`, `CircleDollarSign` |
| `ValidatedField` | `FormField` + `Input` | Border colour from state (see §3.1) via `data-state="valid\|invalid"` |
| `DetailRow` | custom (label cell + value cell) | Label cell `#262626`, value cell `#2b2b2b` |
| `TagBadge` | `Badge` + remove `button` | Two colour variants cycling green/pink |
| `ProfileDrawer` | `Sheet side="left"` | 78 % width |
| `AppMenu` | `DropdownMenu` | Items: Account, About, Setting, separator, log out (`text-danger`) |
| `SearchBar` | `Input` with leading `Search` icon | Focus border `#0b5f88` |
| `FilterChips` | `ToggleGroup type="single"` | Price / Text |
| `DateDivider` | custom | 1 px primary line with centred 8 px pill |
| `DealBubble` | `DealCard` wrapped, aligned left/right | Negative → right & red; positive → left & green |
| `EmptyState` | custom | `ArchiveX`/`Inbox` icon 160 px `#555` + text `#4b4b4b` |
| `ActionButton` | `Button` variants `excel`, `export`, `delete`, `done` | Add as cva variants (tinted bg + 2 px tinted border) |
| `Toaster` | `sonner` | Replaces PoC toast |

## 5. Component behaviour specs

- **Header Total** = sum of that person's deal amounts; `+` prefix & green when ≥ 0, red when < 0. Format `±0.000`.
- **DealCard** — top row: amount (`money(n) + " BD"`) *or* item title when `amount === null`; right: `# INV-000001`. Bottom: note (left), `DD / MM / YYYY` + `hh:mm AM` (right, muted). Tap → deal detail.
- **Composer** — ✕ clears both inputs; send disabled until amount parses as a number; on send, prepend a deal for the current person (today's date/time, next invoice number).
- **Add New Deal form** (zod):
  - `date` required, default today
  - `name` ≥ 2 chars · `phone` `^\+?[\d\s-]{8,15}$` · `email` valid email · `budget` > 0
  - Validate **on change after first touch**; Submit marks all touched; invalid → toast "Please fix the highlighted fields". Success → create deal, pop route, toast "Deal added".
- **Deal detail** — Tags removable (✕), Description editable (autosave on blur), "+" reserved for custom fields (stub). **Delete** removes the deal (add confirm `AlertDialog` in production); **Done** = back; **Excel** / **Export** export the person's deals (`.xlsx` via SheetJS / CSV).
- **Search** — `Price` filters by amount substring, `Text` by note/name substring; results grouped by date with `DateDivider`; sorted newest first.
- **Orders** — tab per order group; each negative card has ✕ to dismiss.
- **Empty state** — shown when the user has zero people/deals.
- **Menu** — closes on outside click / Esc; `log out` clears session → `/login`.
- **Login** — two pills: `log in`, `Sign in` (copy in Figma reads "Sing in" — typo, use **Sign in**). Auth is out of scope for v1 UI; wire to your provider later.

## 6. Data model (TypeScript)

```ts
export interface User { name: string; phone: string }

export interface Deal {
  id: string;
  invoice: string;            // "INV-000001"
  amount: number | null;      // BD; negative = outgoing; null → item deal using `title`
  title: string | null;       // e.g. "Air Conditioner"
  note: string;
  date: string;               // ISO "2025-07-12"
  time: string;               // "10:26 AM" (or store a single ISO datetime)
}

export interface Person {
  id: string;
  name: string;
  phone: string;              // local number, UI prefixes +973
  email: string;
  date: string;               // created/first-deal date
  tags: string[];
  description: string;
  deals: Deal[];
}

export interface OrderItem { id: string; amount: number; note: string }
export type Orders = Record<string, OrderItem[]>;   // "order-1" → items
```

Utilities: `money(n)` → `n.toFixed(3)`; `signed(n)`; `total(person)`; `formatDate(iso)` → `DD / MM / YYYY`.

## 7. Suggested project structure

```
src/
  main.tsx  App.tsx  routes.tsx
  styles/globals.css            # tokens from §3 (dark-only)
  components/
    ui/                         # shadcn generated
    app/ AppHeader.tsx DealCard.tsx Composer.tsx Fab.tsx TabBar.tsx
         DealForm.tsx ValidatedField.tsx DetailRow.tsx TagBadge.tsx
         ProfileDrawer.tsx AppMenu.tsx SearchBar.tsx FilterChips.tsx
         DateDivider.tsx DealBubble.tsx EmptyState.tsx ActionButton.tsx
  pages/ Login.tsx Home.tsx History.tsx PersonLedger.tsx AddDeal.tsx
         DealDetail.tsx Search.tsx Orders.tsx
  store/ useLedger.ts           # Zustand + persist (localStorage) for v1
  lib/ format.ts validation.ts export.ts utils.ts
  types.ts
```

## 8. Tailwind / CSS setup

```css
/* globals.css */
@layer base {
  :root {
    --background: 0 0% 10%;         /* #1a1a1a */
    --foreground: 0 0% 95%;
    --card: 0 0% 17%;               /* #2b2b2b */
    --card-foreground: 0 0% 95%;
    --popover: 0 0% 17%;
    --primary: 199 100% 32%;        /* #0072a5 */
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 16%;          /* #292929 */
    --muted-foreground: 0 0% 54%;
    --accent: 0 0% 23%;
    --destructive: 338 93% 36%;     /* #b0063f */
    --border: 0 0% 23%;
    --input: 0 0% 16%;
    --ring: 199 79% 39%;            /* #1a80ae */
    --radius: 0.75rem;
    --success: 152 100% 33%;        /* #00a859 */
    --danger: 337 93% 39%;          /* #c2074f */
    --amount-blue: 220 93% 59%;     /* #387cf8 */
    --panel: 0 0% 11%;              /* #1c1c1c */
  }
}
```
Extend `tailwind.config` `colors` with `success`, `danger`, `amount-blue`, `panel` (`hsl(var(--…))`). Load Roboto (`@fontsource/roboto` 300/400/500/700) and set as `font-sans`.

## 9. Accessibility

- All icon-only buttons need `aria-label` (Back, Search, More, Add, Send, Clear, Remove tag).
- Do not rely on colour alone: invalid fields also show an inline `FormMessage`; negative amounts carry a `-` sign.
- Text contrast: muted `#8a8a8a` on `#2b2b2b` ≈ 3.9:1 — fine for large text, **raise to `#9a9a9a` for 8–10 px note/date text** in production.
- Touch targets ≥ 40 px (icon buttons 36 px in PoC → use 40 in production).
- Focus ring: 2 px `--ring`. Menu/drawer trap focus (Radix does this).

## 10. Implementation plan for an AI / developer

1. Scaffold Vite + React + TS, Tailwind, `shadcn init` (dark, CSS variables), add components from §4.
2. Paste tokens (§8), set Roboto, add `class="dark"`.
3. Build `types.ts`, `format.ts`, Zustand store seeded with the PoC `DATA` object.
4. Build leaf components (`DealCard`, `Composer`, `Fab`, `AppHeader`, `TabBar`, `EmptyState`) and compare against `ledger-poc.html` at 360 px.
5. Build pages in order: Login → Home → PersonLedger → AddDeal → DealDetail → Search → History → Orders; then `ProfileDrawer` and `AppMenu`.
6. Add react-hook-form + zod to `DealForm` (rules in §5).
7. Add export (CSV/XLSX), `AlertDialog` for delete, toasts.
8. Visual QA: each of the 11 screens vs the Figma export and the PoC "All 11 screens" view.

### Ready-to-paste prompt

```
Build a React + TypeScript + Vite + Tailwind + shadcn/ui app from the attached
LEDGER_DESIGN.md and ledger-poc.html. Treat the PoC as the pixel reference: each
data-ui="X" is a React component, data-shadcn="Y" is the shadcn primitive to use.
Use the tokens in §3/§8, the data model in §6, the routes in §2, and the behaviour
in §5. Dark theme only, 360px mobile-first, Roboto. Use react-router, zustand
(persist), react-hook-form + zod. Implement all 11 screens. Do not add features
not in the document.
```

## 11. Known gaps / assumptions

- Figma shows static mock values: header "Total : +30.000" does not equal the sum of the three displayed cards. The PoC computes totals from deals (fixture chosen so Muntadher's total is `+30.000`).
- Colours are sampled from a raster export; confirm exact values with the Figma source.
- Tab icons (Deals / History / Orders) and the meaning of "Orders" are inferred from the layout; confirm product intent.
- Screen 3 (Orders) is drawn as a side panel over a patterned chat background; the PoC implements it as a full page. A `Sheet` over the ledger is a valid alternative.
- Logo is a hand-drawn polygon approximation of the bolt; replace with the exported SVG from Figma.
- No backend/auth spec in the design; v1 persists to localStorage.

## 12. Future (not in design)

RTL + Arabic localisation (mirror FAB, header, row alignment; use logical CSS properties from the start: `ms-`, `me-`, `start-`, `end-`), light theme, multi-currency, real auth, sync, PDF invoices.
