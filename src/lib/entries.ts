export type EntryKind = "expense" | "income";

/** A dealer owns one or more ledger notes. */
export interface Dealer {
  id: number;
  name: string;
  phone: string;
  email: string;
  emoji: string;
  created_at: string;
  updated_at: string;
}

/** A ledger note is the IN-00001 thread that holds transactions. */
export interface LedgerNote {
  id: number;
  dealer_id: number;
  code: string;
  label: string | null;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: number;
  ledger_note_id: number;
  kind: EntryKind;
  amount_cents: number;
  description: string;
  created_at: string;
}

export interface NewDealer {
  name: string;
  phone?: string;
  email?: string;
  emoji?: string;
}

export interface NewLedgerNote {
  dealerId: number;
  label?: string | null;
}

export interface NewEntry {
  ledgerNoteId: number;
  kind: EntryKind;
  amountCents: number;
  description: string;
}

/** Aggregates computed in SQL so the UI never scans every entry. */
export interface NoteSummary {
  ledgerNoteId: number;
  dealerId: number;
  income: number;
  expense: number;
  count: number;
  lastCreatedAt: string | null;
}

/** One page of a thread, newest first. `nextCursor` is null at the oldest page. */
export interface EntryPage {
  entries: Entry[];
  nextCursor: string | null;
}

export interface EntryStore {
  listDealers(): Promise<Dealer[]>;
  createDealer(dealer: NewDealer): Promise<Dealer>;
  updateDealer(
    id: number,
    patch: Partial<Pick<Dealer, "name" | "phone" | "email" | "emoji">>,
  ): Promise<void>;
  deleteDealer(id: number): Promise<void>;

  listLedgerNotes(dealerId: number): Promise<LedgerNote[]>;
  createLedgerNote(note: NewLedgerNote): Promise<LedgerNote>;
  renameLedgerNote(id: number, label: string): Promise<void>;
  deleteLedgerNote(id: number): Promise<void>;

  /** All notes with their totals, in one grouped query. */
  listSummaries(): Promise<NoteSummary[]>;
  listEntries(ledgerNoteId: number): Promise<Entry[]>;
  /** Keyset-paginated thread; pages run newest → oldest. */
  listEntriesPage(ledgerNoteId: number, limit: number, cursor?: string): Promise<EntryPage>;
  addEntry(entry: NewEntry): Promise<void>;
  removeEntry(id: number): Promise<void>;
}

export const CURRENCIES = ["BHD", "USD", "EUR", "GBP", "JPY", "AUD", "CAD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Bahraini dinar is the design default, always shown with 3 decimals. */
export const DEFAULT_CURRENCY: Currency = "BHD";

export const isTauri = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const DATABASE_URL = "sqlite:ledger.db";
/** v4 stores minor units as fils (1/1000 BD) instead of cents. */
const V4_KEY = "ledger-notes:v4";
const V3_KEY = "ledger-notes:v3";
const V2_KEY = "ledger-notes:v2";
const LEGACY_KEY = "ledger-notes:entries";
const CURRENCY_KEY = "ledger-notes:currency";

let storePromise: Promise<EntryStore> | undefined;

/** One global sequence: max(existing suffix) + 1, formatted IN-00001. */
export function nextLedgerCode(codes: Iterable<string>): string {
  let max = 0;
  for (const code of codes) {
    const suffix = /^IN-(\d+)$/.exec(code)?.[1];
    if (suffix) max = Math.max(max, Number(suffix));
  }
  return `IN-${String(max + 1).padStart(5, "0")}`;
}

const encodeCursor = (entry: Entry) => `${entry.created_at}|${entry.id}`;

function decodeCursor(cursor: string): { createdAt: string; id: number } | null {
  const cut = cursor.lastIndexOf("|");
  if (cut < 1) return null;
  const id = Number(cursor.slice(cut + 1));
  return Number.isFinite(id) ? { createdAt: cursor.slice(0, cut), id } : null;
}

function sqliteStore(): Promise<EntryStore> {
  return import("@tauri-apps/plugin-sql").then(({ default: Database }) =>
    Database.load(DATABASE_URL).then(async (db) => {
      // WAL keeps writes responsive on mobile. Not every platform/config allows
      // it, so a failure is non-fatal — the default journal is still correct.
      try {
        await db.execute("PRAGMA journal_mode = WAL");
        await db.execute("PRAGMA synchronous = NORMAL");
      } catch {
        // Fall back to the default journal mode.
      }

      const now = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

      const insertLedgerNote = async (
        dealerId: number,
        label: string | null,
      ): Promise<LedgerNote> => {
        // MAX() uses the UNIQUE index on code — no full-table scan.
        const rows = await db.select<{ code: string | null }[]>(
          "SELECT MAX(code) AS code FROM ledger_notes",
        );
        const code = nextLedgerCode(rows[0]?.code ? [rows[0].code] : []);
        const result = await db.execute(
          `INSERT INTO ledger_notes (dealer_id, code, label, created_at, updated_at) VALUES ($1, $2, $3, ${now}, ${now})`,
          [dealerId, code, label],
        );
        const note = (
          await db.select<LedgerNote[]>(
            "SELECT id, dealer_id, code, label, created_at, updated_at FROM ledger_notes WHERE id = $1",
            [Number(result.lastInsertId)],
          )
        ).at(0);
        if (!note) throw new Error(`Ledger note ${result.lastInsertId} missing after insert`);
        return note;
      };

      return {
        listDealers: () =>
          db.select<Dealer[]>(
            "SELECT id, name, phone, email, emoji, created_at, updated_at FROM dealers ORDER BY updated_at DESC, id DESC",
          ),

        createDealer: async ({ name, phone = "", email = "", emoji = "💬" }) => {
          const result = await db.execute(
            `INSERT INTO dealers (name, phone, email, emoji, created_at, updated_at) VALUES ($1, $2, $3, $4, ${now}, ${now})`,
            [name, phone, email, emoji],
          );
          const id = Number(result.lastInsertId);
          await insertLedgerNote(id, null);
          const dealer = (
            await db.select<Dealer[]>(
              "SELECT id, name, phone, email, emoji, created_at, updated_at FROM dealers WHERE id = $1",
              [id],
            )
          ).at(0);
          if (!dealer) throw new Error(`Dealer ${id} missing after insert`);
          return dealer;
        },

        updateDealer: async (id, patch) => {
          const fields: string[] = [];
          const values: unknown[] = [];
          let idx = 1;
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined) continue;
            fields.push(`${key} = $${idx++}`);
            values.push(value);
          }
          if (fields.length === 0) return;
          fields.push(`updated_at = ${now}`);
          values.push(id);
          await db.execute(
            `UPDATE dealers SET ${fields.join(", ")} WHERE id = $${idx}`,
            values,
          );
        },

        deleteDealer: (id) =>
          db.execute("DELETE FROM dealers WHERE id = $1", [id]).then(() => undefined),

        listLedgerNotes: (dealerId) =>
          db.select<LedgerNote[]>(
            "SELECT id, dealer_id, code, label, created_at, updated_at FROM ledger_notes WHERE dealer_id = $1 ORDER BY id ASC",
            [dealerId],
          ),

        createLedgerNote: ({ dealerId, label = null }) =>
          insertLedgerNote(dealerId, label),

        renameLedgerNote: (id, label) =>
          db
            .execute(
              `UPDATE ledger_notes SET label = $1, updated_at = ${now} WHERE id = $2`,
              [label, id],
            )
            .then(() => undefined),

        deleteLedgerNote: (id) =>
          db
            .execute("DELETE FROM ledger_notes WHERE id = $1", [id])
            .then(() => undefined),

        listSummaries: () =>
          db
            .select<
              {
                ledger_note_id: number;
                dealer_id: number;
                income: number;
                expense: number;
                count: number;
                last_created_at: string | null;
              }[]
            >(
              `SELECT ln.id AS ledger_note_id, ln.dealer_id,
                      COALESCE(SUM(CASE WHEN e.kind = 'income' THEN e.amount_cents ELSE 0 END), 0) AS income,
                      COALESCE(SUM(CASE WHEN e.kind = 'expense' THEN e.amount_cents ELSE 0 END), 0) AS expense,
                      COUNT(e.id) AS count,
                      MAX(e.created_at) AS last_created_at
               FROM ledger_notes ln
               LEFT JOIN entries e ON e.ledger_note_id = ln.id
               GROUP BY ln.id, ln.dealer_id`,
            )
            .then((rows) =>
              rows.map((row) => ({
                ledgerNoteId: row.ledger_note_id,
                dealerId: row.dealer_id,
                income: row.income,
                expense: row.expense,
                count: row.count,
                lastCreatedAt: row.last_created_at,
              })),
            ),

        listEntries: (ledgerNoteId) =>
          db.select<Entry[]>(
            "SELECT id, ledger_note_id, kind, amount_cents, description, created_at FROM entries WHERE ledger_note_id = $1 ORDER BY created_at ASC, id ASC",
            [ledgerNoteId],
          ),

        listEntriesPage: async (ledgerNoteId, limit, cursor) => {
          const decoded = cursor ? decodeCursor(cursor) : null;
          const params: unknown[] = [ledgerNoteId];
          const olderThan = decoded
            ? "AND (created_at < $2 OR (created_at = $2 AND id < $3))"
            : "";
          if (decoded) params.push(decoded.createdAt, decoded.id);
          params.push(limit + 1);

          const rows = await db.select<Entry[]>(
            `SELECT id, ledger_note_id, kind, amount_cents, description, created_at
             FROM entries
             WHERE ledger_note_id = $1 ${olderThan}
             ORDER BY created_at DESC, id DESC
             LIMIT $${params.length}`,
            params,
          );
          const hasMore = rows.length > limit;
          const entries = hasMore ? rows.slice(0, limit) : rows;
          const oldest = entries.at(-1);
          return {
            entries,
            nextCursor: hasMore && oldest ? encodeCursor(oldest) : null,
          };
        },

        addEntry: async ({ ledgerNoteId, kind, amountCents, description }) => {
          await db.execute(
            "INSERT INTO entries (ledger_note_id, kind, amount_cents, description) VALUES ($1, $2, $3, $4)",
            [ledgerNoteId, kind, amountCents, description],
          );
          await db.execute(
            `UPDATE ledger_notes SET updated_at = ${now} WHERE id = $1`,
            [ledgerNoteId],
          );
          await db.execute(
            `UPDATE dealers SET updated_at = ${now} WHERE id = (SELECT dealer_id FROM ledger_notes WHERE id = $1)`,
            [ledgerNoteId],
          );
        },

        removeEntry: (id) =>
          db.execute("DELETE FROM entries WHERE id = $1", [id]).then(() => undefined),
      };
    }),
  );
}

interface LegacyEntry {
  id: number;
  kind: EntryKind;
  amount_cents: number;
  description: string;
  created_at: string;
}

interface BrowserDataV2 {
  notes: Array<{
    id: number;
    title: string;
    emoji: string;
    created_at: string;
    updated_at: string;
  }>;
  entries: Array<LegacyEntry & { note_id: number }>;
}

interface BrowserData {
  dealers: Dealer[];
  ledgerNotes: LedgerNote[];
  entries: Entry[];
}

/** Notes become dealers; each one's entries move into its IN-00001 note. */
function migrateV2(v2: BrowserDataV2): BrowserData {
  const dealers: Dealer[] = v2.notes.map((note) => ({
    id: note.id,
    name: note.title,
    phone: "",
    email: "",
    emoji: note.emoji,
    created_at: note.created_at,
    updated_at: note.updated_at,
  }));
  const ledgerNotes: LedgerNote[] = dealers.map((dealer, index) => ({
    id: dealer.id,
    dealer_id: dealer.id,
    code: `IN-${String(index + 1).padStart(5, "0")}`,
    label: null,
    created_at: dealer.created_at,
    updated_at: dealer.updated_at,
  }));
  const noteIdToLedgerId = new Map(ledgerNotes.map((note) => [note.dealer_id, note.id]));
  return {
    dealers,
    ledgerNotes,
    entries: v2.entries.flatMap(({ note_id, ...entry }) => {
      const ledgerNoteId = noteIdToLedgerId.get(note_id);
      return ledgerNoteId === undefined
        ? []
        : [{ ...entry, ledger_note_id: ledgerNoteId }];
    }),
  };
}

function browserStore(): EntryStore {
  const toFils = (data: BrowserData): BrowserData => ({
    ...data,
    entries: data.entries.map((entry) => ({
      ...entry,
      amount_cents: entry.amount_cents * 10,
    })),
  });

  const read = (): BrowserData => {
    try {
      const current = localStorage.getItem(V4_KEY);
      if (current) return JSON.parse(current) as BrowserData;

      const storedV3 = localStorage.getItem(V3_KEY);
      if (storedV3) {
        const converted = toFils(JSON.parse(storedV3) as BrowserData);
        write(converted);
        return converted;
      }

      let v2: BrowserDataV2 | null = null;
      const storedV2 = localStorage.getItem(V2_KEY);
      if (storedV2) {
        v2 = JSON.parse(storedV2) as BrowserDataV2;
      } else {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          const now = new Date().toISOString();
          v2 = {
            notes: [
              { id: 1, title: "General", emoji: "💬", created_at: now, updated_at: now },
            ],
            entries: (JSON.parse(legacy) as LegacyEntry[]).map((entry) => ({
              ...entry,
              note_id: 1,
            })),
          };
        }
      }
      if (v2) {
        const converted = toFils(migrateV2(v2));
        write(converted);
        return converted;
      }
    } catch {
      // Ignore malformed local data and start fresh.
    }
    return { dealers: [], ledgerNotes: [], entries: [] };
  };

  const write = (data: BrowserData) =>
    localStorage.setItem(V4_KEY, JSON.stringify(data));

  const insertLedgerNote = (data: BrowserData, dealerId: number, label: string | null) => {
    const now = new Date().toISOString();
    const note: LedgerNote = {
      id: Date.now(),
      dealer_id: dealerId,
      code: nextLedgerCode(data.ledgerNotes.map((item) => item.code)),
      label,
      created_at: now,
      updated_at: now,
    };
    data.ledgerNotes.push(note);
    return note;
  };

  return {
    listDealers: async () =>
      read().dealers.slice().sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.id - a.id),

    createDealer: async ({ name, phone = "", email = "", emoji = "💬" }) => {
      const data = read();
      const now = new Date().toISOString();
      const dealer: Dealer = {
        id: Date.now(),
        name,
        phone,
        email,
        emoji,
        created_at: now,
        updated_at: now,
      };
      data.dealers.push(dealer);
      insertLedgerNote(data, dealer.id, null);
      write(data);
      return dealer;
    },

    updateDealer: async (id, patch) => {
      const data = read();
      const dealer = data.dealers.find((item) => item.id === id);
      if (dealer) {
        Object.assign(dealer, patch);
        dealer.updated_at = new Date().toISOString();
      }
      write(data);
    },

    deleteDealer: async (id) => {
      const data = read();
      const noteIds = new Set(
        data.ledgerNotes.filter((note) => note.dealer_id === id).map((note) => note.id),
      );
      write({
        dealers: data.dealers.filter((dealer) => dealer.id !== id),
        ledgerNotes: data.ledgerNotes.filter((note) => note.dealer_id !== id),
        entries: data.entries.filter((entry) => !noteIds.has(entry.ledger_note_id)),
      });
    },

    listLedgerNotes: async (dealerId) =>
      read()
        .ledgerNotes.filter((note) => note.dealer_id === dealerId)
        .sort((a, b) => a.id - b.id),

    createLedgerNote: async ({ dealerId, label = null }) => {
      const data = read();
      const note = insertLedgerNote(data, dealerId, label);
      write(data);
      return note;
    },

    renameLedgerNote: async (id, label) => {
      const data = read();
      const note = data.ledgerNotes.find((item) => item.id === id);
      if (note) {
        note.label = label;
        note.updated_at = new Date().toISOString();
      }
      write(data);
    },

    deleteLedgerNote: async (id) => {
      const data = read();
      write({
        ...data,
        ledgerNotes: data.ledgerNotes.filter((note) => note.id !== id),
        entries: data.entries.filter((entry) => entry.ledger_note_id !== id),
      });
    },

    listSummaries: async () => {
      const data = read();
      const byNote = new Map<number, NoteSummary>();
      for (const note of data.ledgerNotes) {
        byNote.set(note.id, {
          ledgerNoteId: note.id,
          dealerId: note.dealer_id,
          income: 0,
          expense: 0,
          count: 0,
          lastCreatedAt: null,
        });
      }
      for (const entry of data.entries) {
        const summary = byNote.get(entry.ledger_note_id);
        if (!summary) continue;
        if (entry.kind === "income") summary.income += entry.amount_cents;
        else summary.expense += entry.amount_cents;
        summary.count += 1;
        if (!summary.lastCreatedAt || entry.created_at > summary.lastCreatedAt) {
          summary.lastCreatedAt = entry.created_at;
        }
      }
      return [...byNote.values()];
    },

    listEntries: async (ledgerNoteId) =>
      read()
        .entries.filter((entry) => entry.ledger_note_id === ledgerNoteId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id),

    listEntriesPage: async (ledgerNoteId, limit, cursor) => {
      const decoded = cursor ? decodeCursor(cursor) : null;
      const all = read()
        .entries.filter((entry) => entry.ledger_note_id === ledgerNoteId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
      const start = decoded
        ? all.findIndex(
            (entry) =>
              entry.created_at < decoded.createdAt ||
              (entry.created_at === decoded.createdAt && entry.id < decoded.id),
          )
        : 0;
      const window = start < 0 ? [] : all.slice(start, start + limit + 1);
      const hasMore = window.length > limit;
      const entries = hasMore ? window.slice(0, limit) : window;
      const oldest = entries.at(-1);
      return {
        entries,
        nextCursor: hasMore && oldest ? encodeCursor(oldest) : null,
      };
    },

    addEntry: async ({ ledgerNoteId, kind, amountCents, description }) => {
      const data = read();
      const now = new Date().toISOString();
      data.entries.push({
        id: Date.now(),
        ledger_note_id: ledgerNoteId,
        kind,
        amount_cents: amountCents,
        description,
        created_at: now,
      });
      const note = data.ledgerNotes.find((item) => item.id === ledgerNoteId);
      if (note) {
        note.updated_at = now;
        const dealer = data.dealers.find((item) => item.id === note.dealer_id);
        if (dealer) dealer.updated_at = now;
      }
      write(data);
    },

    removeEntry: async (id) => {
      const data = read();
      write({ ...data, entries: data.entries.filter((entry) => entry.id !== id) });
    },
  };
}

export function getStore(): Promise<EntryStore> {
  storePromise ??= (isTauri()
    ? sqliteStore()
    : Promise.resolve(browserStore())
  ).catch((err) => {
    storePromise = undefined;
    throw err;
  });
  return storePromise;
}

export function getCurrency(): Currency {
  try {
    const saved = localStorage.getItem(CURRENCY_KEY) as Currency | null;
    return saved && CURRENCIES.includes(saved) ? saved : DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

export function setCurrency(currency: Currency) {
  localStorage.setItem(CURRENCY_KEY, currency);
}

/** Minor units are fils for BHD; `cents` keeps its historic column name. */
export function formatAmount(cents: number, currency: Currency): string {
  if (currency === "BHD") {
    const value = cents / 1000;
    return `${value < 0 ? "-" : ""}${Math.abs(value).toFixed(3)} BD`;
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/** Signed form for totals: +50.000 BD / -12.300 BD. */
export function formatSigned(cents: number, currency: Currency): string {
  return `${cents < 0 ? "-" : "+"}${formatAmount(Math.abs(cents), currency)}`;
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatListDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return formatTime(iso);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}
