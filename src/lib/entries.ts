export type EntryKind = "expense" | "income";

export interface Note {
  id: number;
  title: string;
  emoji: string;
  created_at: string;
  updated_at: string;
}

export interface Entry {
  id: number;
  note_id: number;
  kind: EntryKind;
  amount_cents: number;
  description: string;
  created_at: string;
}

export interface NewNote {
  title: string;
  emoji: string;
}

export interface NewEntry {
  noteId: number;
  kind: EntryKind;
  amountCents: number;
  description: string;
}

export interface EntryStore {
  listNotes(): Promise<Note[]>;
  createNote(note: NewNote): Promise<Note>;
  renameNote(id: number, title: string): Promise<void>;
  deleteNote(id: number): Promise<void>;
  listEntries(noteId: number): Promise<Entry[]>;
  addEntry(entry: NewEntry): Promise<void>;
  removeEntry(id: number): Promise<void>;
}

export const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "USD";

export const isTauri = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const DATABASE_URL = "sqlite:ledger.db";
const V2_KEY = "ledger-notes:v2";
const LEGACY_KEY = "ledger-notes:entries";
const CURRENCY_KEY = "ledger-notes:currency";

let storePromise: Promise<EntryStore> | undefined;

function sqliteStore(): Promise<EntryStore> {
  return import("@tauri-apps/plugin-sql").then(({ default: Database }) =>
    Database.load(DATABASE_URL).then((db) => ({
      listNotes: () =>
        db.select<Note[]>(
          "SELECT id, title, emoji, created_at, updated_at FROM notes ORDER BY updated_at DESC, id DESC",
        ),

      createNote: async ({ title, emoji }) => {
        const now = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";
        const result = await db.execute(
          `INSERT INTO notes (title, emoji, created_at, updated_at) VALUES ($1, $2, ${now}, ${now})`,
          [title, emoji],
        );
        const [note] = await db.select<Note[]>(
          "SELECT id, title, emoji, created_at, updated_at FROM notes WHERE id = $1",
          [Number(result.lastInsertId)],
        );
        return note;
      },

      renameNote: (id, title) =>
        db
          .execute(
            "UPDATE notes SET title = $1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = $2",
            [title, id],
          )
          .then(() => undefined),

      deleteNote: (id) =>
        db.execute("DELETE FROM notes WHERE id = $1", [id]).then(() => undefined),

      listEntries: (noteId) =>
        db.select<Entry[]>(
          "SELECT id, note_id, kind, amount_cents, description, created_at FROM entries WHERE note_id = $1 ORDER BY created_at ASC, id ASC",
          [noteId],
        ),

      addEntry: async ({ noteId, kind, amountCents, description }) => {
        await db.execute(
          `INSERT INTO entries (note_id, kind, amount_cents, description) VALUES ($1, $2, $3, $4)`,
          [noteId, kind, amountCents, description],
        );
        await db.execute(
          "UPDATE notes SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = $1",
          [noteId],
        );
      },

      removeEntry: (id) =>
        db.execute("DELETE FROM entries WHERE id = $1", [id]).then(() => undefined),
    })),
  );
}

interface BrowserData {
  notes: Note[];
  entries: Entry[];
}

function browserStore(): EntryStore {
  const read = (): BrowserData => {
    try {
      const current = localStorage.getItem(V2_KEY);
      if (current) return JSON.parse(current) as BrowserData;

      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const oldEntries = JSON.parse(legacy) as Array<
          Omit<Entry, "note_id"> & { id: number }
        >;
        const now = new Date().toISOString();
        const migrated: BrowserData = {
          notes: [{ id: 1, title: "General", emoji: "💬", created_at: now, updated_at: now }],
          entries: oldEntries.map((entry) => ({ ...entry, note_id: 1 })),
        };
        write(migrated);
        return migrated;
      }
    } catch {
      // Ignore malformed local data and start fresh.
    }
    return { notes: [], entries: [] };
  };

  const write = (data: BrowserData) =>
    localStorage.setItem(V2_KEY, JSON.stringify(data));

  return {
    listNotes: async () => read().notes,
    createNote: async ({ title, emoji }) => {
      const data = read();
      const now = new Date().toISOString();
      const note: Note = {
        id: Date.now(),
        title,
        emoji,
        created_at: now,
        updated_at: now,
      };
      data.notes.unshift(note);
      write(data);
      return note;
    },
    renameNote: async (id, title) => {
      const data = read();
      const note = data.notes.find((item) => item.id === id);
      if (note) {
        note.title = title;
        note.updated_at = new Date().toISOString();
      }
      write(data);
    },
    deleteNote: async (id) => {
      const data = read();
      write({
        notes: data.notes.filter((note) => note.id !== id),
        entries: data.entries.filter((entry) => entry.note_id !== id),
      });
    },
    listEntries: async (noteId) =>
      read()
        .entries.filter((entry) => entry.note_id === noteId)
        .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id),
    addEntry: async ({ noteId, kind, amountCents, description }) => {
      const data = read();
      const now = new Date().toISOString();
      data.entries.push({
        id: Date.now(),
        note_id: noteId,
        kind,
        amount_cents: amountCents,
        description,
        created_at: now,
      });
      const note = data.notes.find((item) => item.id === noteId);
      if (note) note.updated_at = now;
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

export function formatAmount(cents: number, currency: Currency): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(cents / 100);
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
