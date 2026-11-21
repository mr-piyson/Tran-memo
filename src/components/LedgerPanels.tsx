import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  ArchiveXIcon,
  ArrowLeftIcon,
  PencilIcon,
  ReceiptTextIcon,
  SearchIcon,
  SendIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import Logo from "@/assets/Logo";
import ListGrid from "@/components/ListGrid";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  formatAmount,
  formatListDate,
  formatSigned,
  formatTime,
  type Currency,
  type Dealer,
  type Entry,
  type EntryKind,
  type LedgerNote,
} from "@/lib/entries";

interface Summary {
  total: number;
  count: number;
  last?: Entry;
}

type ThreadRow =
  | { kind: "divider"; id: string; label: string }
  | { kind: "entry"; id: string; entry: Entry };

function summarize(entries: Entry[]): Map<number, Summary> {
  const result = new Map<number, Summary>();
  for (const entry of entries) {
    const key = "ledger_note_id" in entry ? entry.ledger_note_id : -1;
    const summary = result.get(key) ?? { total: 0, count: 0 };
    summary.total += entry.kind === "income" ? entry.amount_cents : -entry.amount_cents;
    summary.count += 1;
    if (!summary.last || entry.created_at > summary.last.created_at) {
      summary.last = entry;
    }
    result.set(key, summary);
  }
  return result;
}

export function isDefaultAvatar(emoji: string | null | undefined): boolean {
  return !emoji || emoji === "💬";
}

export function DealerAvatar({
  emoji,
  size = "md",
  className,
}: {
  emoji: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const isDefault = isDefaultAvatar(emoji);
  const avatarSize = size === "md" ? "default" : size;
  return (
    <Avatar
      size={avatarSize}
      className={cn("ledger-avatar", isDefault ? "ledger-avatar--default" : "ledger-avatar--emoji", className)}
      data-size={size}
    >
      {isDefault && <span aria-hidden="true" className="ledger-avatar-mark" />}
      <AvatarFallback
        className={cn(
          "bg-transparent text-inherit",
          isDefault ? "text-transparent" : "leading-none",
        )}
      >
        {isDefault ? "" : emoji}
      </AvatarFallback>
    </Avatar>
  );
}

function LedgerAvatar({
  dealer,
  size = "md",
}: {
  dealer: Dealer;
  size?: "sm" | "md" | "lg";
}) {
  return <DealerAvatar emoji={dealer.emoji} size={size} />;
}

function EmptyLedger({ text }: { text: string }) {
  return (
    <div className="ledger-empty">
      <ArchiveXIcon strokeWidth={1} />
      <span>{text}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pane 1 — dealers                                                    */
/* ------------------------------------------------------------------ */

export function DealersPanel({
  dealers,
  ledgerNotes,
  entries,
  selectedId,
  currency,
  active,
  desktopActive,
  onSelect,
  onNewDealer,
  onEditDealer,
  onDeleteDealer,
}: {
  dealers: Dealer[];
  ledgerNotes: LedgerNote[];
  entries: Entry[];
  selectedId: number | null;
  currency: Currency;
  active: boolean;
  desktopActive: boolean;
  onSelect: (id: number) => void;
  onNewDealer: () => void;
  onEditDealer: (dealer: Dealer) => void;
  onDeleteDealer: (dealer: Dealer) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? dealers.filter((dealer) => dealer.name.toLowerCase().includes(query))
      : dealers;
  }, [dealers, search]);

  const summaries = useMemo(() => {
    const dealerByNote = new Map(ledgerNotes.map((note) => [note.id, note.dealer_id]));
    const result = new Map<number, Summary>();
    for (const [noteId, noteSummary] of summarize(entries)) {
      const dealerId = dealerByNote.get(noteId);
      if (dealerId === undefined) continue;
      const current = result.get(dealerId) ?? { total: 0, count: 0 };
      current.total += noteSummary.total;
      current.count += noteSummary.count;
      if (
        noteSummary.last &&
        (!current.last || noteSummary.last.created_at > current.last.created_at)
      ) {
        current.last = noteSummary.last;
      }
      result.set(dealerId, current);
    }
    return result;
  }, [entries, ledgerNotes]);

  return (
    <section
      className={cn(
        "relative flex min-h-0 w-full shrink-0 flex-col border-r lg:w-80",
        !active && "max-lg:hidden",
        !desktopActive && "lg:hidden",
      )}
    >
      <div className="ledger-header">
        <SidebarTrigger className="-ml-1" />
        <Logo width="26" height="30" primaryColor="#9a9a9a" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="ledger-header-title">Ledger</div>
          <div className="ledger-header-sub">Dealers</div>
        </div>
        <Button size="icon" variant="ghost" aria-label="New dealer" onClick={onNewDealer}>
          <span className="text-xl leading-none">+</span>
        </Button>
      </div>

      <div className="shrink-0 px-3 py-3">
        <div className="ledger-search">
          <SearchIcon className="size-5 shrink-0" />
          <Input
            type="search"
            aria-label="Search dealers"
            placeholder="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <EmptyLedger text={search ? "No matches" : "There are no dealers"} />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 pb-24">
          <ListGrid
            rows={filtered}
            getRowId={(dealer) => String(dealer.id)}
            rowHeight={72}
            renderRow={(dealer) => {
              const summary = summaries.get(dealer.id);
              return (
                <ContextMenu>
                  <ContextMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        className="ledger-row"
                        data-selected={selectedId === dealer.id}
                        aria-label={`Open ${dealer.name}`}
                        onClick={() => onSelect(dealer.id)}
                      />
                    }
                  >
                    <LedgerAvatar dealer={dealer} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="ledger-row-name truncate" title={dealer.name}>
                          {dealer.name}
                        </span>
                        {summary?.last && (
                          <span className="ledger-row-meta shrink-0">
                            {formatListDate(summary.last.created_at)}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-2">
                        <span
                          className="ledger-row-meta truncate"
                          title={`${dealer.phone || "—"}${summary ? ` · ${summary.count} tx` : " · no transactions"}`}
                        >
                          {dealer.phone || "—"}
                          {summary ? ` · ${summary.count} tx` : " · no transactions"}
                        </span>
                        {summary && summary.count > 0 && (
                          <span
                            className={cn(
                              "ledger-row-total shrink-0 tabular-nums",
                              summary.total >= 0 ? "text-success" : "text-danger",
                            )}
                          >
                            {formatSigned(summary.total, currency)}
                          </span>
                        )}
                      </span>
                    </span>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => onEditDealer(dealer)}>
                      <PencilIcon />
                      Edit dealer
                    </ContextMenuItem>
                    <ContextMenuItem variant="destructive" onClick={() => onDeleteDealer(dealer)}>
                      <Trash2Icon />
                      Delete dealer
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            }}
          />
        </div>
      )}

      <Button className="ledger-fab" aria-label="New dealer" onClick={onNewDealer}>
        <span className="text-2xl leading-none">+</span>
      </Button>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Pane 2 — ledger notes of the selected dealer                        */
/* ------------------------------------------------------------------ */

export function LedgerNotesPanel({
  dealer,
  notes,
  entries,
  selectedId,
  currency,
  active,
  desktopActive,
  onBack,
  onSelect,
  onNewNote,
  onDeleteDealer,
}: {
  dealer: Dealer | null;
  notes: LedgerNote[];
  entries: Entry[];
  selectedId: number | null;
  currency: Currency;
  active: boolean;
  desktopActive: boolean;
  onBack: () => void;
  onSelect: (id: number) => void;
  onNewNote: () => void;
  onDeleteDealer: () => void;
}) {
  const summaries = useMemo(() => summarize(entries), [entries]);
  const total = dealer
    ? entries.reduce(
        (sum, entry) => sum + (entry.kind === "income" ? entry.amount_cents : -entry.amount_cents),
        0,
      )
    : 0;

  return (
    <section
      className={cn(
        "relative flex min-h-0 w-full shrink-0 flex-col border-r lg:w-80",
        !active && "max-lg:hidden",
        !desktopActive && "lg:hidden",
      )}
    >
      <div className="ledger-header">
        <Button variant="ghost" size="icon" aria-label="Back to dealers" onClick={onBack}>
          <ArrowLeftIcon />
        </Button>
        {dealer && <LedgerAvatar dealer={dealer} />}
        <div className="min-w-0 flex-1">
          <div className="ledger-header-title truncate">{dealer?.name ?? "Dealer"}</div>
          <div className="ledger-header-sub">
            Total :{" "}
            <span className={total >= 0 ? "text-success" : "text-danger"}>
              {formatSigned(total, currency)}
            </span>
          </div>
        </div>
        {dealer && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete dealer"
            title="Delete dealer"
            onClick={onDeleteDealer}
          >
            <Trash2Icon className="text-danger" />
          </Button>
        )}
      </div>

      {!dealer || notes.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <EmptyLedger text="No ledger notes yet" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 pb-24">
          <ListGrid
            rows={notes}
            getRowId={(note) => String(note.id)}
            rowHeight={88}
            renderRow={(note) => {
              const summary = summaries.get(note.id);
              const noteTotal = summary?.total ?? 0;
              const tone = noteTotal >= 0 ? "var(--bar-green)" : "var(--bar-red)";
              return (
                <div
                  className="ledger-code-card"
                  data-selected={selectedId === note.id}
                  style={{ "--tone": tone } as CSSProperties}
                >
                  <Button
                    variant="ghost"
                    className="h-auto w-full justify-start rounded-none p-3 text-left"
                    aria-label={`Open ${note.code}`}
                    onClick={() => onSelect(note.id)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="ledger-code">{note.code}</span>
                        {summary?.last && (
                          <span className="ledger-row-meta shrink-0">
                            {formatListDate(summary.last.created_at)}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-2">
                        <span
                          className="ledger-row-meta truncate"
                          title={`${note.label || "Ledger note"} · ${summary?.count ?? 0} tx`}
                        >
                          {note.label || "Ledger note"}
                          {` · ${summary?.count ?? 0} tx`}
                        </span>
                        {summary && summary.count > 0 && (
                          <span
                            className={cn(
                              "ledger-row-total shrink-0 tabular-nums",
                              noteTotal >= 0 ? "text-success" : "text-danger",
                            )}
                          >
                            {formatSigned(noteTotal, currency)}
                          </span>
                        )}
                      </span>
                    </span>
                  </Button>
                  <div className="ledger-code-card-bar" />
                </div>
              );
            }}
          />
        </div>
      )}

      {dealer && (
        <Button className="ledger-fab" aria-label="New ledger note" onClick={onNewNote}>
          <span className="text-2xl leading-none">+</span>
        </Button>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Pane 3 — transactions in the active ledger note                     */
/* ------------------------------------------------------------------ */

export function LedgerThread({
  dealer,
  note,
  entries,
  currency,
  active,
  loading,
  onBack,
  onDeleteNote,
  onAddEntry,
  onRemoveEntry,
}: {
  dealer: Dealer | null;
  note: LedgerNote | null;
  entries: Entry[];
  currency: Currency;
  active: boolean;
  loading: boolean;
  onBack: () => void;
  onDeleteNote: () => void;
  onAddEntry: (kind: EntryKind, amount: number, description: string) => Promise<void>;
  onRemoveEntry: (id: number) => Promise<void>;
}) {
  const [kind, setKind] = useState<EntryKind>("income");
  const [amount, setAmount] = useState("");
  const [noteText, setNoteText] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const entry of entries) {
      if (entry.kind === "income") income += entry.amount_cents;
      else expense += entry.amount_cents;
    }
    return { income, expense, balance: income - expense };
  }, [entries]);

  const groups = useMemo(() => {
    const result: Array<{ date: string; entries: Entry[] }> = [];
    for (const entry of entries) {
      const date = entry.created_at.slice(0, 10);
      let group = result.at(-1);
      if (!group || group.date !== date) {
        group = { date, entries: [] };
        result.push(group);
      }
      group.entries.push(entry);
    }
    return result;
  }, [entries]);

  // ag-grid needs one row per item: date dividers become compact rows and
  // every transaction gets exactly one bubble row.
  const rows = useMemo<ThreadRow[]>(
    () =>
      groups.flatMap((group, index) => {
        const [y, m, d] = group.date.split("-");
        const weekday = new Date(`${group.date}T00:00`).toLocaleDateString("en", {
          weekday: "short",
        });
        return [
          {
            kind: "divider" as const,
            id: `divider-${group.date}-${index}`,
            label: `${d}/${m}/${y} ${weekday}`,
          },
          ...group.entries.map(
            (entry): ThreadRow => ({ kind: "entry", id: `entry-${entry.id}`, entry }),
          ),
        ];
      }),
    [groups],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setSending(true);
    setError("");
    try {
      await onAddEntry(
        kind,
        Math.round(value * 1000),
        noteText.trim() || (kind === "income" ? "Income" : "Expense"),
      );
      setAmount("");
      setNoteText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  const tone = kind === "income" ? "var(--success)" : "var(--danger)";
  const bar = kind === "income" ? "var(--bar-green)" : "var(--bar-red)";

  return (
    <section
      className={cn("flex min-h-0 min-w-0 flex-1 flex-col bg-background", !active && "max-lg:hidden")}
    >
      <div className="ledger-header">
        <Button variant="ghost" size="icon" aria-label="Back to ledger notes" onClick={onBack}>
          <ArrowLeftIcon />
        </Button>
        {dealer && <LedgerAvatar dealer={dealer} />}
        <div className="min-w-0 flex-1">
          <div className="ledger-header-title truncate">
            {dealer?.name ?? "Dealer"}
            {note && (
              <Badge variant="secondary" className="ml-2 align-middle font-normal">
                {note.code}
              </Badge>
            )}
          </div>
          <div className="ledger-header-sub">
            Total :{" "}
            <span className={totals.balance >= 0 ? "text-success" : "text-danger"}>
              {formatSigned(totals.balance, currency)}
            </span>
          </div>
        </div>
        {note && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete ledger note"
            title="Delete ledger note"
            onClick={onDeleteNote}
          >
            <Trash2Icon className="text-danger" />
          </Button>
        )}
      </div>

      <div className="flex shrink-0 gap-2 border-b px-3 py-2 text-xs">
        <span className="text-muted-foreground">
          In <span className="font-medium text-success">{formatAmount(totals.income, currency)}</span>
        </span>
        <span className="text-muted-foreground">
          Out <span className="font-medium text-danger">{formatAmount(totals.expense, currency)}</span>
        </span>
      </div>

      {!loading && entries.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="ledger-empty">
            <ReceiptTextIcon strokeWidth={1} />
            <span className="text-lg">No transactions yet</span>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 py-2">
          <ListGrid
            rows={rows}
            getRowId={(row) => row.id}
            rowHeight={(row) => (row.kind === "divider" ? 28 : 76)}
            autoScrollToBottom
            scrollKey={note?.id ?? "none"}
            renderRow={(row) => {
              if (row.kind === "divider") {
                return (
                  <div className="ledger-divider">
                    <span>{row.label}</span>
                  </div>
                );
              }
              const entry = row.entry;
              const isIncome = entry.kind === "income";
              const entryTone = isIncome ? "var(--bar-green)" : "var(--bar-red)";
              const entryColor = isIncome ? "var(--success)" : "var(--danger)";
              return (
                <div
                  className={cn(
                    "group flex w-full items-center gap-2 px-3 py-1",
                    isIncome ? "justify-start" : "justify-end",
                  )}
                >
                  <div
                    className="ledger-bubble"
                    data-kind={entry.kind}
                    style={{ "--tone": entryTone } as CSSProperties}
                  >
                    <div className="flex items-baseline justify-between gap-6">
                      <span
                        className="ledger-bubble-amount tabular-nums"
                        style={{ color: entryColor }}
                      >
                        {isIncome ? "+" : "−"}
                        {formatAmount(entry.amount_cents, currency)}
                      </span>
                      <span className="ledger-bubble-time">{formatTime(entry.created_at)}</span>
                    </div>
                    <div className="ledger-bubble-bar" />
                    <div className="ledger-bubble-note break-words" title={entry.description}>
                      {entry.description}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label="Delete transaction"
                    title="Delete transaction"
                    onClick={() => onRemoveEntry(entry.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              );
            }}
          />
        </div>
      )}

      {note && (
        <form onSubmit={submit} className="shrink-0">
          <div className="ledger-composer" style={{ "--tone": tone, "--bar": bar } as CSSProperties}>
            <div className="ledger-composer-kind">
              <ToggleGroup
                value={[kind]}
                onValueChange={(values) => {
                  const next = values[0];
                  if (next === "income" || next === "expense") setKind(next);
                }}
                variant="outline"
                size="sm"
                aria-label="Transaction type"
              >
                <ToggleGroupItem value="income">Income</ToggleGroupItem>
                <ToggleGroupItem value="expense">Expense</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="ledger-composer-row1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Clear"
                title="Clear"
                onClick={() => {
                  setAmount("");
                  setNoteText("");
                  setError("");
                }}
              >
                <XIcon />
              </Button>
              <Input
                className="ledger-composer-amount"
                type="number"
                min="0.001"
                step="0.001"
                inputMode="decimal"
                aria-label="Amount in BD"
                placeholder="0.000"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="ledger-composer-bar" style={{ background: `linear-gradient(90deg, transparent, ${bar})` }} />
            <div className="ledger-composer-row2">
              <Input
                className="ledger-composer-note"
                type="text"
                maxLength={120}
                aria-label="Note"
                placeholder="Input text here"
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
              />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                aria-label="Send transaction"
                title="Send"
                disabled={sending}
              >
                <SendIcon style={{ color: tone }} />
              </Button>
            </div>
          </div>
          {error && <p className="px-4 pb-2 text-xs text-danger">{error}</p>}
        </form>
      )}
    </section>
  );
}
