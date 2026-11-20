import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import AppSidebar from "./components/AppSidebar";
import ChatPanel from "./components/ChatPanel";
import EmojiPicker from "./components/EmojiPicker";
import NotesPanel from "./components/NotesPanel";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
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

const DEFAULT_EMOJI = "💬";
const currencyItems = CURRENCIES.map((code) => ({ label: code, value: code }));

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [currency, setCurrencyState] = useState<Currency>(getCurrency);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [showSettings, setShowSettings] = useState(false);
  const [showNewNote, setShowNewNote] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState(DEFAULT_EMOJI);
  const [savingNote, setSavingNote] = useState(false);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const selectedEntries = useMemo(
    () => (selectedId === null ? [] : entries.filter((entry) => entry.note_id === selectedId)),
    [entries, selectedId],
  );

  const reload = useCallback(async () => {
    const store = await getStore();
    const allNotes = await store.listNotes();
    const lists = await Promise.all(allNotes.map((note) => store.listEntries(note.id)));
    setNotes(allNotes);
    setEntries(lists.flat());
    setSelectedId((current) =>
      current !== null && allNotes.some((note) => note.id === current)
        ? current
        : (allNotes[0]?.id ?? null),
    );
  }, []);

  useEffect(() => {
    reload()
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [reload]);

  // shadcn ships class-based dark mode; keep it in sync with the OS setting.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  function selectNote(id: number) {
    setSelectedId(id);
    setMobileView("chat");
  }

  async function addEntry(kind: EntryKind, amountCents: number, description: string) {
    const noteId = selectedId;
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
    if (!selectedNote || !window.confirm(`Delete "${selectedNote.title}" and all its transactions?`)) return;
    try {
      const store = await getStore();
      await store.deleteNote(selectedNote.id);
      setMobileView("list");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function createNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title || savingNote) return;
    setSavingNote(true);
    setError("");
    try {
      const store = await getStore();
      const note = await store.createNote({ title, emoji: newEmoji });
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
    setCurrencyState(next);
    setCurrency(next);
  }

  function clearBrowserData() {
    if (!window.confirm("Clear all browser-preview notes and transactions?")) return;
    localStorage.removeItem("ledger-notes:v2");
    localStorage.removeItem("ledger-notes:entries");
    setSelectedId(null);
    setMobileView("list");
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={false}>
        <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
          <AppSidebar
            onNotes={() => setMobileView("list")}
            onNewNote={() => setShowNewNote(true)}
            onSettings={() => setShowSettings(true)}
          />

          <SidebarInset className="min-w-0">
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
                <NotesPanel
                  notes={notes}
                  entries={entries}
                  selectedId={selectedId}
                  currency={currency}
                  hiddenOnMobile={mobileView === "chat"}
                  onSelect={selectNote}
                  onNewNote={() => setShowNewNote(true)}
                />
                <ChatPanel
                  note={selectedNote}
                  entries={selectedEntries}
                  currency={currency}
                  loading={loading}
                  hiddenOnMobile={mobileView === "list"}
                  onBack={() => setMobileView("list")}
                  onDeleteNote={deleteNote}
                  onAddEntry={addEntry}
                  onRemoveEntry={removeEntry}
                />
              </div>
            </div>

            {error && (
              <Alert
                variant="destructive"
                className="fixed bottom-20 left-1/2 z-50 w-auto -translate-x-1/2 shadow-lg md:bottom-6"
              >
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Settings</DialogTitle>
                  <DialogDescription>
                    Choose how amounts are displayed and where your data lives.
                  </DialogDescription>
                </DialogHeader>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="currency">Currency</FieldLabel>
                    <Select
                      items={currencyItems}
                      value={currency}
                      onValueChange={(value) => changeCurrency(value as Currency)}
                    >
                      <SelectTrigger id="currency" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent align="start">
                        <SelectGroup>
                          {CURRENCIES.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </FieldGroup>
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>Storage</CardTitle>
                    <CardDescription>
                      {isTauri()
                        ? "Transactions are saved in a local SQLite database."
                        : "Browser preview mode uses localStorage."}
                    </CardDescription>
                  </CardHeader>
                </Card>
                {!isTauri() && (
                  <Button variant="destructive" onClick={clearBrowserData}>
                    Clear browser preview data
                  </Button>
                )}
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>Done</DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showNewNote} onOpenChange={setShowNewNote}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New note</DialogTitle>
                  <DialogDescription>
                    Start a conversation to track its income and expenses.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createNote} className="flex flex-col gap-4">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="note-title">Note title</FieldLabel>
                      <Input
                        id="note-title"
                        type="text"
                        required
                        maxLength={60}
                        autoFocus
                        placeholder="e.g. Groceries"
                        value={newTitle}
                        onChange={(event) => setNewTitle(event.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Avatar</FieldLabel>
                      <EmojiPicker value={newEmoji} onChange={setNewEmoji} />
                    </Field>
                  </FieldGroup>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" type="button" />}>
                      Cancel
                    </DialogClose>
                    <Button type="submit" disabled={savingNote}>
                      Create note
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
