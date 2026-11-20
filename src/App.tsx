import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import AppSidebar from "./components/AppSidebar";
import EmojiPicker from "./components/EmojiPicker";
import {
  DealersPanel,
  LedgerNotesPanel,
  LedgerThread,
} from "./components/LedgerPanels";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  CURRENCIES,
  getCurrency,
  getStore,
  isTauri,
  setCurrency,
  type Currency,
  type Dealer,
  type Entry,
  type EntryKind,
  type LedgerNote,
} from "./lib/entries";

const DEFAULT_EMOJI = "💬";
const currencyItems = CURRENCIES.map((code) => ({ label: code, value: code }));
type MobilePane = "dealers" | "notes" | "thread";

export default function App() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [ledgerNotes, setLedgerNotes] = useState<LedgerNote[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState<number | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [mobilePane, setMobilePane] = useState<MobilePane>("dealers");
  const [currency, setCurrencyState] = useState<Currency>(getCurrency);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showNewDealer, setShowNewDealer] = useState(false);
  const [showNewNote, setShowNewNote] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmoji, setNewEmoji] = useState(DEFAULT_EMOJI);
  const [newNoteLabel, setNewNoteLabel] = useState("");
  const [saving, setSaving] = useState(false);

  // The reload callback has no dependencies; read the latest selection from a
  // ref so it never triggers an effect loop.
  const selectionRef = useRef<{ dealerId: number | null; noteId: number | null }>({
    dealerId: null,
    noteId: null,
  });
  selectionRef.current = { dealerId: selectedDealerId, noteId: selectedNoteId };

  const selectedDealer = useMemo(
    () => dealers.find((dealer) => dealer.id === selectedDealerId) ?? null,
    [dealers, selectedDealerId],
  );
  const dealerNotes = useMemo(
    () => ledgerNotes.filter((note) => note.dealer_id === selectedDealerId),
    [ledgerNotes, selectedDealerId],
  );
  const selectedNote = useMemo(
    () => ledgerNotes.find((note) => note.id === selectedNoteId) ?? null,
    [ledgerNotes, selectedNoteId],
  );
  const threadEntries = useMemo(
    () =>
      selectedNote === null
        ? []
        : entries.filter((entry) => entry.ledger_note_id === selectedNote.id),
    [entries, selectedNote],
  );

  const reload = useCallback(async () => {
    const store = await getStore();
    const allDealers = await store.listDealers();
    const noteLists = await Promise.all(
      allDealers.map((dealer) => store.listLedgerNotes(dealer.id)),
    );
    const allNotes = noteLists.flat();
    const entryLists = await Promise.all(
      allNotes.map((note) => store.listEntries(note.id)),
    );
    setDealers(allDealers);
    setLedgerNotes(allNotes);
    setEntries(entryLists.flat());

    const { dealerId, noteId } = selectionRef.current;
    const nextDealerId =
      dealerId !== null && allDealers.some((dealer) => dealer.id === dealerId)
        ? dealerId
        : (allDealers[0]?.id ?? null);
    const notesForDealer = allNotes.filter((note) => note.dealer_id === nextDealerId);
    const nextNoteId =
      noteId !== null && notesForDealer.some((note) => note.id === noteId)
        ? noteId
        : (notesForDealer[0]?.id ?? null);
    setSelectedDealerId(nextDealerId);
    setSelectedNoteId(nextNoteId);
  }, []);

  useEffect(() => {
    reload()
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [reload]);

  function selectDealer(id: number) {
    setSelectedDealerId(id);
    setSelectedNoteId(ledgerNotes.find((note) => note.dealer_id === id)?.id ?? null);
    setMobilePane("notes");
  }

  function selectNote(id: number) {
    setSelectedNoteId(id);
    setMobilePane("thread");
  }

  async function addEntry(kind: EntryKind, amount: number, description: string) {
    if (selectedNoteId === null) return;
    const store = await getStore();
    await store.addEntry({
      ledgerNoteId: selectedNoteId,
      kind,
      amountCents: amount,
      description,
    });
    await reload();
  }

  async function removeEntry(id: number) {
    const store = await getStore();
    await store.removeEntry(id);
    await reload();
  }

  async function deleteDealer() {
    if (!selectedDealer || !window.confirm(`Delete "${selectedDealer.name}" and all its ledger notes?`)) return;
    try {
      const store = await getStore();
      await store.deleteDealer(selectedDealer.id);
      setMobilePane("dealers");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function deleteNote() {
    if (!selectedNote || !window.confirm(`Delete ${selectedNote.code} and its transactions?`)) return;
    try {
      const store = await getStore();
      await store.deleteLedgerNote(selectedNote.id);
      setMobilePane("notes");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function createDealer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    setError("");
    try {
      const store = await getStore();
      const dealer = await store.createDealer({ name, phone: newPhone.trim(), emoji: newEmoji });
      selectionRef.current = { dealerId: dealer.id, noteId: null };
      await reload();
      setMobilePane("notes");
      setNewName("");
      setNewPhone("");
      setNewEmoji(DEFAULT_EMOJI);
      setShowNewDealer(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function createNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedDealerId === null || saving) return;
    setSaving(true);
    setError("");
    try {
      const store = await getStore();
      const note = await store.createLedgerNote({
        dealerId: selectedDealerId,
        label: newNoteLabel.trim() || null,
      });
      selectionRef.current = { dealerId: selectedDealerId, noteId: note.id };
      await reload();
      setMobilePane("thread");
      setNewNoteLabel("");
      setShowNewNote(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function changeCurrency(next: Currency) {
    setCurrencyState(next);
    setCurrency(next);
  }

  function clearBrowserData() {
    if (!window.confirm("Clear all browser-preview dealers, ledger notes and transactions?")) return;
    localStorage.removeItem("ledger-notes:v4");
    localStorage.removeItem("ledger-notes:v3");
    localStorage.removeItem("ledger-notes:v2");
    localStorage.removeItem("ledger-notes:entries");
    selectionRef.current = { dealerId: null, noteId: null };
    setSelectedDealerId(null);
    setSelectedNoteId(null);
    setMobilePane("dealers");
    reload().catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={false}>
        <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
          <AppSidebar
            onDealers={() => setMobilePane("dealers")}
            onNewDealer={() => setShowNewDealer(true)}
            onNewNote={() => setShowNewNote(true)}
            onSettings={() => setShowSettings(true)}
          />

          <SidebarInset className="min-w-0">
            <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
              <DealersPanel
                dealers={dealers}
                ledgerNotes={ledgerNotes}
                entries={entries}
                selectedId={selectedDealerId}
                currency={currency}
                active={mobilePane === "dealers"}
                desktopActive={mobilePane === "dealers"}
                onSelect={selectDealer}
                onNewDealer={() => setShowNewDealer(true)}
              />
              <LedgerNotesPanel
                dealer={selectedDealer}
                notes={dealerNotes}
                entries={entries.filter((entry) =>
                  dealerNotes.some((note) => note.id === entry.ledger_note_id),
                )}
                selectedId={selectedNoteId}
                currency={currency}
                active={mobilePane === "notes"}
                desktopActive={mobilePane !== "dealers"}
                onBack={() => setMobilePane("dealers")}
                onSelect={selectNote}
                onNewNote={() => setShowNewNote(true)}
                onDeleteDealer={deleteDealer}
              />
              <LedgerThread
                dealer={selectedDealer}
                note={selectedNote}
                entries={threadEntries}
                currency={currency}
                active={mobilePane === "thread"}
                loading={loading}
                onBack={() => setMobilePane("notes")}
                onDeleteNote={deleteNote}
                onAddEntry={addEntry}
                onRemoveEntry={removeEntry}
              />
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
                        ? "Dealers and transactions are saved in a local SQLite database. Amounts are stored in BHD fils (3 decimals)."
                        : "Browser preview mode uses localStorage. Amounts are stored in BHD fils (3 decimals)."}
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

            <Dialog open={showNewDealer} onOpenChange={setShowNewDealer}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New dealer</DialogTitle>
                  <DialogDescription>
                    Each dealer starts with ledger note IN-00001 for income and expenses.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createDealer} className="flex flex-col gap-4">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="dealer-name">Dealer name</FieldLabel>
                      <Input
                        id="dealer-name"
                        type="text"
                        required
                        maxLength={60}
                        autoFocus
                        placeholder="e.g. Muntadher"
                        value={newName}
                        onChange={(event) => setNewName(event.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="dealer-phone">Phone (optional)</FieldLabel>
                      <Input
                        id="dealer-phone"
                        type="tel"
                        maxLength={30}
                        placeholder="+973 36860504"
                        value={newPhone}
                        onChange={(event) => setNewPhone(event.target.value)}
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
                    <Button type="submit" disabled={saving}>
                      Create dealer
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={showNewNote} onOpenChange={setShowNewNote}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New ledger note</DialogTitle>
                  <DialogDescription>
                    Adds the next global code (for example IN-00002) to {selectedDealer?.name ?? "this dealer"}.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={createNote} className="flex flex-col gap-4">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="note-label">Label (optional)</FieldLabel>
                      <Input
                        id="note-label"
                        type="text"
                        maxLength={60}
                        autoFocus
                        placeholder="e.g. July 2026"
                        value={newNoteLabel}
                        onChange={(event) => setNewNoteLabel(event.target.value)}
                      />
                    </Field>
                  </FieldGroup>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" type="button" />}>
                      Cancel
                    </DialogClose>
                    <Button type="submit" disabled={saving || selectedDealerId === null}>
                      Create ledger note
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
