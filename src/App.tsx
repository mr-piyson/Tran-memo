import { createMemo, createSignal, For, onSettled, Show, type Accessor } from "solid-js";
import ChatPanel from "./components/ChatPanel";
import EmojiPicker from "./components/EmojiPicker";
import Modal from "./components/Modal";
import NotesPanel from "./components/NotesPanel";
import Rail from "./components/Rail";
import {
  CURRENCIES,
  getCurrency,
  getStore,
  isTauri,
  setCurrency,
  type Currency,
  type Entry,
  type EntryKind,
  type Note,
} from "./lib/entries";
import "./index.css";

const DEFAULT_EMOJI = "💬";

export default function App() {
  const [notes, setNotes] = createSignal<Note[]>([]);
  const [entries, setEntries] = createSignal<Entry[]>([]);
  const [selectedId, setSelectedId] = createSignal<number | null>(null);
  const [currency, setCurrencySignal] = createSignal<Currency>(getCurrency());
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");
  const [mobileView, setMobileView] = createSignal<"list" | "chat">("list");
  const [showSettings, setShowSettings] = createSignal(false);
  const [showNewNote, setShowNewNote] = createSignal(false);
  const [newTitle, setNewTitle] = createSignal("");
  const [newEmoji, setNewEmoji] = createSignal(DEFAULT_EMOJI);
  const [savingNote, setSavingNote] = createSignal(false);

  const selectedNote = createMemo(
    () => notes().find((note) => note.id === selectedId()) ?? null,
  );

  const selectedEntries = createMemo(() => {
    const id = selectedId();
    return id === null ? [] : entries().filter((entry) => entry.note_id === id);
  });

  async function reload() {
    const store = await getStore();
    const allNotes = await store.listNotes();
    const lists = await Promise.all(
      allNotes.map((note) => store.listEntries(note.id)),
    );
    setNotes(allNotes);
    setEntries(lists.flat());
    setSelectedId((current) =>
      current !== null && allNotes.some((note) => note.id === current)
        ? current
        : (allNotes[0]?.id ?? null),
    );
  }

  onSettled(() => {
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  });

  function selectNote(id: number) {
    setSelectedId(id);
    setMobileView("chat");
  }

  async function addEntry(
    kind: EntryKind,
    amountCents: number,
    description: string,
  ) {
    const noteId = selectedId();
    if (noteId === null) return;
    const store = await getStore();
    await store.addEntry({ noteId, kind, amountCents, description });
    await reload();
  }

  async function removeEntry(id: number) {
    const store = await getStore();
    await store.removeEntry(id);
    await reload();
  }

  async function deleteNote() {
    const note = selectedNote();
    if (!note || !confirm(`Delete "${note.title}" and all its transactions?`)) return;
    try {
      const store = await getStore();
      await store.deleteNote(note.id);
      setMobileView("list");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function createNote(event: SubmitEvent) {
    event.preventDefault();
    const title = newTitle().trim();
    if (!title || savingNote()) return;
    setSavingNote(true);
    setError("");
    try {
      const store = await getStore();
      const note = await store.createNote({ title, emoji: newEmoji() });
      await reload();
      setSelectedId(note.id);
      setMobileView("chat");
      setNewTitle("");
      setNewEmoji(DEFAULT_EMOJI);
      setShowNewNote(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingNote(false);
    }
  }

  function changeCurrency(next: Currency) {
    setCurrencySignal(next);
    setCurrency(next);
  }

  function clearBrowserData() {
    if (!confirm("Clear all browser-preview notes and transactions?")) return;
    localStorage.removeItem("ledger-notes:v2");
    localStorage.removeItem("ledger-notes:entries");
    setSelectedId(null);
    setMobileView("list");
    reload().catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }

  return (
    <div class="flex h-dvh flex-col overflow-hidden bg-slate-100 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div class="flex min-h-0 flex-1 flex-col md:flex-row">
        <div class="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <NotesPanel
            notes={notes as Accessor<Note[]>}
            entries={entries as Accessor<Entry[]>}
            selectedId={selectedId as Accessor<number | null>}
            currency={currency as Accessor<Currency>}
            hiddenOnMobile={mobileView() === "chat"}
            onSelect={selectNote}
            onNewNote={() => setShowNewNote(true)}
          />
          <ChatPanel
            note={selectedNote}
            entries={selectedEntries}
            currency={currency}
            loading={loading()}
            hiddenOnMobile={mobileView() === "list"}
            onBack={() => setMobileView("list")}
            onDeleteNote={deleteNote}
            onAddEntry={addEntry}
            onRemoveEntry={removeEntry}
          />
        </div>

        <Rail
          onNewNote={() => setShowNewNote(true)}
          onSettings={() => setShowSettings(true)}
        />
      </div>

      <Show when={error()}>
        {(message) => (
          <div
            role="alert"
            class="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-lg md:bottom-6"
          >
            {message()}
          </div>
        )}
      </Show>

      <Show when={showSettings()}>
        <Modal title="Settings" onClose={() => setShowSettings(false)}>
          <div class="space-y-5">
            <label class="block">
              <span class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Currency
              </span>
              <select
                value={currency()}
                onChange={(event) => changeCurrency(event.currentTarget.value as Currency)}
                class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800"
              >
                <For each={CURRENCIES}>
                  {(option) => <option value={option}>{option}</option>}
                </For>
              </select>
            </label>

            <div class="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
              <p class="font-medium">Storage</p>
              <p class="mt-1 text-slate-500 dark:text-slate-400">
                {isTauri()
                  ? "Transactions are saved in a local SQLite database."
                  : "Browser preview mode uses localStorage."}
              </p>
            </div>

            <Show when={!isTauri()}>
              <button
                type="button"
                onClick={clearBrowserData}
                class="w-full rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
              >
                Clear browser preview data
              </button>
            </Show>
          </div>
        </Modal>
      </Show>

      <Show when={showNewNote()}>
        <Modal title="New note" onClose={() => setShowNewNote(false)}>
          <form onSubmit={createNote} class="space-y-5">
            <label class="block">
              <span class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Note title
              </span>
              <input
                type="text"
                required
                maxlength="60"
                autofocus
                placeholder="e.g. Groceries"
                value={newTitle()}
                onInput={(event) => setNewTitle(event.currentTarget.value)}
                class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800"
              />
            </label>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Avatar
              </p>
              <div class="mt-2">
                <EmojiPicker value={newEmoji()} onChange={setNewEmoji} />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingNote()}
              class="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              Create note
            </button>
          </form>
        </Modal>
      </Show>
    </div>
  );
}
