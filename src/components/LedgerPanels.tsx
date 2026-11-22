import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArchiveXIcon,
  ArrowLeftIcon,
  EllipsisVerticalIcon,
  InfoIcon,
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
  ContextMenuList,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuList,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  type EntryPage,
  type LedgerNote,
  type NoteSummary,
} from "@/lib/entries";

type ThreadRow =
  | { kind: "divider"; id: string; label: string }
  | { kind: "entry"; id: string; entry: Entry };

interface DealerSummary {
  total: number;
  count: number;
  lastCreatedAt: string | null;
}

/** Roll note-level SQL aggregates up to dealers without touching raw entries. */
function summarizeByDealer(summaries: NoteSummary[]): Map<number, DealerSummary> {
  const result = new Map<number, DealerSummary>();
  for (const note of summaries) {
    const current = result.get(note.dealerId) ?? { total: 0, count: 0, lastCreatedAt: null };
    current.total += note.income - note.expense;
    current.count += note.count;
    if (note.lastCreatedAt && (!current.lastCreatedAt || note.lastCreatedAt > current.lastCreatedAt)) {
      current.lastCreatedAt = note.lastCreatedAt;
    }
    result.set(note.dealerId, current);
  }
  return result;
}

/** Keeps typing responsive even with a large dealer list. */
function useDebounced<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function isDefaultAvatar(emoji: string | null | undefined): boolean {
  return !emoji || emoji === "💬";
}

const avatarSizeClasses = {
  sm: "size-8 text-[34px]",
  md: "size-[42px] text-[44px]",
  lg: "size-[52px] text-[60px]",
} as const;

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
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full after:hidden",
        avatarSizeClasses[size],
        isDefault ? "bg-avatar-bg shadow-none" : "bg-transparent shadow-none",
        className,
      )}
    >
      {isDefault && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="absolute left-1/2 top-[22%] size-[34%] -translate-x-1/2 rounded-full bg-avatar-mark" />
          <span className="absolute left-1/2 top-[60%] h-[60%] w-[68%] -translate-x-1/2 rounded-full bg-avatar-mark" />
        </span>
      )}
      <AvatarFallback
        className={cn(
          "bg-transparent leading-none !text-[inherit]",
          isDefault ? "text-transparent" : "text-inherit",
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
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center text-[26px] font-light text-text-faint">
      <ArchiveXIcon strokeWidth={1} className="size-[90px]" />
      <span>{text}</span>
    </div>
  );
}

const headerClass =
  "flex h-[60px] flex-none items-center gap-2.5 bg-card px-3 shadow-header";
const headerTitleClass = "text-base leading-[1.15]";
const headerSubClass = "text-xs text-muted-foreground";
const rowMetaClass = "text-[11px] text-muted-foreground";
const fabClass =
  "absolute right-4 bottom-[18px] z-[5] grid size-[54px] min-w-[54px] place-items-center rounded-2xl bg-primary text-fab-fg shadow-fab active:scale-[0.96]";

/* ------------------------------------------------------------------ */
/* Pane 1 — dealers                                                    */
/* ------------------------------------------------------------------ */

export function DealersPanel({
  dealers,
  summaries: noteSummaries,
  selectedId,
  currency,
  active,
  desktopActive,
  onSelect,
  onNewDealer,
  onEditDealer,
  onDeleteDealer,
  onDetailDealer,
}: {
  dealers: Dealer[];
  summaries: NoteSummary[];
  selectedId: number | null;
  currency: Currency;
  active: boolean;
  desktopActive: boolean;
  onSelect: (id: number) => void;
  onNewDealer: () => void;
  onEditDealer: (dealer: Dealer) => void;
  onDeleteDealer: (dealer: Dealer) => void;
  onDetailDealer: (dealer: Dealer) => void;
}) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);

  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return query
      ? dealers.filter((dealer) => dealer.name.toLowerCase().includes(query))
      : dealers;
  }, [dealers, debouncedSearch]);

  const summaries = useMemo(() => summarizeByDealer(noteSummaries), [noteSummaries]);

  return (
    <section
      className={cn(
        "relative flex min-h-0 w-full shrink-0 flex-col border-r lg:w-80",
        !active && "max-lg:hidden",
        !desktopActive && "lg:hidden",
      )}
    >
      <div className={headerClass}>
        <SidebarTrigger className="-ml-1" />
        <Logo width="26" height="30" primaryColor="var(--primary)" title="" />
        <div className="min-w-0 flex-1">
          <div className={headerTitleClass}>Ledger</div>
          <div className={headerSubClass}>Dealers</div>
        </div>
        <Button size="icon" variant="ghost" aria-label="New dealer" onClick={onNewDealer}>
          <span className="text-xl leading-none">+</span>
        </Button>
      </div>

      <div className="shrink-0 px-3 py-3">
        <div className="flex h-10 items-center gap-2.5 rounded-[10px] border-2 border-border-accent bg-panel px-3 text-text-soft">
          <SearchIcon className="size-5 shrink-0" />
          <Input
            type="search"
            aria-label="Search dealers"
            placeholder="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-base text-foreground shadow-none ring-0 placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
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
                        className={cn(
                          "h-full min-h-0 w-full items-center justify-start gap-3 rounded-xl px-3 py-3 text-left transition-[background-color]",
                          "hover:bg-overlay-hover",
                          selectedId === dealer.id && "bg-accent",
                        )}
                        aria-label={`Open ${dealer.name}`}
                        onClick={() => onSelect(dealer.id)}
                      />
                    }
                  >
                    <LedgerAvatar dealer={dealer} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[15px]" title={dealer.name}>
                          {dealer.name}
                        </span>
                        {summary?.lastCreatedAt && (
                          <span className={cn(rowMetaClass, "shrink-0")}>
                            {formatListDate(summary.lastCreatedAt)}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-2">
                        <span
                          className={cn(rowMetaClass, "truncate")}
                          title={`${dealer.phone || "—"}${summary ? ` · ${summary.count} tx` : " · no transactions"}`}
                        >
                          {dealer.phone || "—"}
                          {summary ? ` · ${summary.count} tx` : " · no transactions"}
                        </span>
                        {summary && summary.count > 0 && (
                          <span
                            className={cn(
                              "shrink-0 text-sm font-medium tabular-nums",
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
                    <ContextMenuList>
                      <ContextMenuItem onClick={() => onDetailDealer(dealer)}>
                        <InfoIcon />
                        Detail
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => onEditDealer(dealer)}>
                        <PencilIcon />
                        Edit dealer
                      </ContextMenuItem>
                      <ContextMenuItem variant="destructive" onClick={() => onDeleteDealer(dealer)}>
                        <Trash2Icon />
                        Delete dealer
                      </ContextMenuItem>
                    </ContextMenuList>
                  </ContextMenuContent>
                </ContextMenu>
              );
            }}
          />
        </div>
      )}

      <Button className={fabClass} aria-label="New dealer" onClick={onNewDealer}>
        <span className="text-2xl leading-none">+</span>
      </Button>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Dealer detail — PoC "7 · Deal detail" inspired panel               */
/* ------------------------------------------------------------------ */

export function DealerDetailPanel({
  dealer,
  total,
  currency,
  active,
  desktopActive,
  onClose,
  onDeleteDealer,
}: {
  dealer: Dealer | null;
  total: number;
  currency: Currency;
  active: boolean;
  desktopActive: boolean;
  onClose: () => void;
  onDeleteDealer: (dealer: Dealer) => void;
}) {
  const createdDate = dealer
    ? new Date(dealer.created_at)
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        .replaceAll("/", " - ")
    : "—";

  return (
    <section
      className={cn(
        "relative flex min-h-0 w-full shrink-0 flex-col border-l lg:w-80",
        !active && "max-lg:hidden",
        !desktopActive && "lg:hidden",
      )}
    >
      <div className={headerClass}>
        <Button variant="ghost" size="icon" aria-label="Back" onClick={onClose}>
          <ArrowLeftIcon />
        </Button>
        <div className="min-w-0 flex-1">
          <div className={cn(headerTitleClass, "truncate")}>Dealer detail</div>
          <div className={cn(headerSubClass, "truncate")}>{dealer?.name ?? "—"}</div>
        </div>
      </div>

      {!dealer ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <EmptyLedger text="No dealer selected" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-auto pb-4">
          <div className="flex items-center gap-5 px-6 pt-5 pb-7">
            <DealerAvatar emoji={dealer.emoji} size="lg" className="size-[76px]" />
            <div className="min-w-0">
              <div className="text-[26px] leading-tight">{dealer.name}</div>
              <div
                className={cn(
                  "mt-1 text-sm tabular-nums",
                  total >= 0 ? "text-success" : "text-danger",
                )}
              >
                {formatSigned(total, currency)}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 px-3.5">
            <DetailRow icon={<ReceiptTextIcon />} label="Date" value={createdDate} />
            <DetailRow icon={<InfoIcon />} label="Email" value={dealer.email || "—"} />
            <DetailRow
              icon={<span className="text-[15px] leading-none">☎</span>}
              label="Phone"
              value={dealer.phone || "—"}
            />
          </div>

          <div className="mt-auto grid grid-cols-2 gap-2 px-3 pt-4">
            <button
              type="button"
              className="flex h-[38px] items-center gap-2.5 rounded-[9px] border-2 border-[color-mix(in_srgb,var(--success)_40%,var(--border-strong))] bg-[color-mix(in_srgb,var(--success)_22%,var(--secondary))] px-3 text-sm text-foreground active:brightness-[1.15]"
              onClick={() => {}}
            >
              <span className="grid size-[18px] place-items-center rounded-[3px] bg-excel text-[10px] font-bold text-text-inverse">
                x
              </span>
              Excel
            </button>
            <button
              type="button"
              className="flex h-[38px] items-center gap-2.5 rounded-[9px] border-2 border-border-strong bg-secondary px-3 text-sm text-foreground active:brightness-[1.15]"
              onClick={() => {}}
            >
              <SendIcon className="size-[18px] -rotate-45" />
              Export
            </button>
            <button
              type="button"
              className="flex h-[38px] items-center gap-2.5 rounded-[9px] border-2 border-[color-mix(in_srgb,var(--danger)_35%,var(--border-strong))] bg-[color-mix(in_srgb,var(--danger)_12%,var(--secondary))] px-3 text-sm text-danger active:brightness-[1.15]"
              onClick={() => onDeleteDealer(dealer)}
            >
              <Trash2Icon className="size-[18px]" />
              Delete
            </button>
            <button
              type="button"
              className="flex h-[38px] items-center gap-2.5 rounded-[9px] border-2 border-[color-mix(in_srgb,var(--primary)_45%,var(--border-strong))] bg-[color-mix(in_srgb,var(--primary)_18%,var(--secondary))] px-3 text-sm text-primary-hover active:brightness-[1.15]"
              onClick={onClose}
            >
              <span className="grid size-[18px] place-items-center rounded-full border border-current text-[11px]">
                ✓
              </span>
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[34px] overflow-hidden rounded-[9px] border-2 border-surface-sunken bg-card">
      <div className="flex w-[104px] flex-none items-center gap-2.5 bg-surface-sunken px-2.5 text-xs text-secondary-foreground">
        <span className="grid size-[15px] place-items-center text-secondary-foreground [&_svg]:size-[15px]">
          {icon}
        </span>
        <span>{label}</span>
      </div>
      <div
        className="flex min-w-0 flex-1 items-center justify-center gap-1.5 bg-card px-2 py-1.5 text-center text-xs break-words"
        title={value}
      >
        {value}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pane 2 — ledger notes of the selected dealer                        */
/* ------------------------------------------------------------------ */

export function LedgerNotesPanel({
  dealer,
  notes,
  summaries: noteSummaries,
  total,
  selectedId,
  currency,
  active,
  desktopActive,
  onBack,
  onSelect,
  onNewNote,
  onEditNote,
  onDeleteNote,
  onDetailDealer,
  onEditDealer,
  onDeleteDealer,
}: {
  dealer: Dealer | null;
  notes: LedgerNote[];
  summaries: NoteSummary[];
  total: number;
  selectedId: number | null;
  currency: Currency;
  active: boolean;
  desktopActive: boolean;
  onBack: () => void;
  onSelect: (id: number) => void;
  onNewNote: () => void;
  onEditNote: (note: LedgerNote) => void;
  onDeleteNote: (note: LedgerNote) => void;
  onDetailDealer: (dealer: Dealer) => void;
  onEditDealer: (dealer: Dealer) => void;
  onDeleteDealer: () => void;
}) {
  const summaries = useMemo(
    () => new Map(noteSummaries.map((summary) => [summary.ledgerNoteId, summary])),
    [noteSummaries],
  );

  return (
    <section
      className={cn(
        "relative flex min-h-0 w-full shrink-0 flex-col border-r lg:w-80",
        !active && "max-lg:hidden",
        !desktopActive && "lg:hidden",
      )}
    >
      <div className={headerClass}>
        <Button variant="ghost" size="icon" aria-label="Back to dealers" onClick={onBack}>
          <ArrowLeftIcon />
        </Button>
        {dealer && <LedgerAvatar dealer={dealer} />}
        <div className="min-w-0 flex-1">
          <div className={cn(headerTitleClass, "truncate")}>{dealer?.name ?? "Dealer"}</div>
          <div className={headerSubClass}>
            Total :{" "}
            <span className={total >= 0 ? "text-success" : "text-danger"}>
              {formatSigned(total, currency)}
            </span>
          </div>
        </div>
        {dealer && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Dealer actions"
                  title="Dealer actions"
                />
              }
            >
              <EllipsisVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuList>
                <DropdownMenuItem onClick={() => onDetailDealer(dealer)}>
                  <InfoIcon />
                  Detail
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEditDealer(dealer)}>
                  <PencilIcon />
                  Edit dealer
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={onDeleteDealer}>
                  <Trash2Icon />
                  Delete dealer
                </DropdownMenuItem>
              </DropdownMenuList>
            </DropdownMenuContent>
          </DropdownMenu>
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
              const noteTotal = summary ? summary.income - summary.expense : 0;
              const tone = noteTotal >= 0 ? "var(--bar-green)" : "var(--bar-red)";
              return (
                <div
                  className={cn(
                    "relative mx-2.5 mt-1.5 cursor-pointer overflow-hidden rounded-xl bg-[linear-gradient(var(--surface-raised),var(--surface-sunken))] shadow-card hover:bg-[linear-gradient(var(--surface-raised-hover),var(--surface-raised))]",
                    selectedId === note.id && "outline-2 outline-primary-hover",
                  )}
                  style={{ "--tone": tone } as CSSProperties}
                >
                  <ContextMenu>
                    <ContextMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          className="h-auto w-full justify-start rounded-none p-3 text-left hover:bg-transparent"
                          aria-label={`Open ${note.code}`}
                          onClick={() => onSelect(note.id)}
                        />
                      }
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-lg font-normal tracking-[0.2px] text-amount-blue">
                            {note.code}
                          </span>
                          {summary?.lastCreatedAt && (
                            <span className={cn(rowMetaClass, "shrink-0")}>
                              {formatListDate(summary.lastCreatedAt)}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 flex items-center justify-between gap-2">
                          <span
                            className={cn(rowMetaClass, "truncate")}
                            title={`${note.label || "Ledger note"} · ${summary?.count ?? 0} tx`}
                          >
                            {note.label || "Ledger note"}
                            {` · ${summary?.count ?? 0} tx`}
                          </span>
                          {summary && summary.count > 0 && (
                            <span
                              className={cn(
                                "shrink-0 text-sm font-medium tabular-nums",
                                noteTotal >= 0 ? "text-success" : "text-danger",
                              )}
                            >
                              {formatSigned(noteTotal, currency)}
                            </span>
                          )}
                        </span>
                      </span>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuList>
                        <ContextMenuItem onClick={() => onEditNote(note)}>
                          <PencilIcon />
                          Edit ledger note
                        </ContextMenuItem>
                        <ContextMenuItem variant="destructive" onClick={() => onDeleteNote(note)}>
                          <Trash2Icon />
                          Delete ledger note
                        </ContextMenuItem>
                      </ContextMenuList>
                    </ContextMenuContent>
                  </ContextMenu>
                  <div className="h-[3px] bg-[linear-gradient(90deg,var(--tone,var(--bar-blue)),transparent_92%)]" />
                </div>
              );
            }}
          />
        </div>
      )}

      {dealer && (
        <Button className={fabClass} aria-label="New ledger note" onClick={onNewNote}>
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
  pages,
  totals,
  currency,
  active,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onLoadOlder,
  onBack,
  onDeleteNote,
  onAddEntry,
  onRemoveEntry,
}: {
  dealer: Dealer | null;
  note: LedgerNote | null;
  pages: EntryPage[];
  totals: { income: number; expense: number; balance: number };
  currency: Currency;
  active: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadOlder: () => void;
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

  // Pages arrive newest-first; the thread renders oldest → newest.
  const entries = useMemo(() => pages.flatMap((page) => page.entries).reverse(), [pages]);

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

  // One virtual row per item: date dividers become compact rows and
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
      <div className={headerClass}>
        <Button variant="ghost" size="icon" aria-label="Back to ledger notes" onClick={onBack}>
          <ArrowLeftIcon />
        </Button>
        {dealer && <LedgerAvatar dealer={dealer} />}
        <div className="min-w-0 flex-1">
          <div className={cn(headerTitleClass, "truncate")}>
            {dealer?.name ?? "Dealer"}
            {note && (
              <Badge variant="secondary" className="ml-2 align-middle font-normal">
                {note.code}
              </Badge>
            )}
          </div>
          <div className={headerSubClass}>
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

      {hasNextPage && (
        <div className="shrink-0 border-b px-3 py-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadOlder}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading…" : "Load older transactions"}
          </Button>
        </div>
      )}

      {!isLoading && entries.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center text-text-faint">
            <ReceiptTextIcon strokeWidth={1} className="size-[90px]" />
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
                  <div className="relative my-4 mb-2 flex h-3 items-center justify-center">
                    <span className="absolute inset-x-0 top-1/2 h-px bg-divider-accent" />
                    <span className="relative rounded-[3px] bg-primary px-[14px] py-[2px] text-[8px] text-primary-foreground">
                      {row.label}
                    </span>
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
                    className={cn(
                      "relative max-w-[78%] rounded-xl bg-[linear-gradient(var(--surface-raised),var(--surface-sunken))] px-3 py-2 shadow-card",
                      isIncome ? "rounded-bl-[4px]" : "rounded-br-[4px]",
                    )}
                    style={{ "--tone": entryTone } as CSSProperties}
                  >
                    <div className="flex items-baseline justify-between gap-6">
                      <span className="text-lg tabular-nums" style={{ color: entryColor }}>
                        {isIncome ? "+" : "−"}
                        {formatAmount(entry.amount_cents, currency)}
                      </span>
                      <span className="text-[8px] text-muted-foreground">
                        {formatTime(entry.created_at)}
                      </span>
                    </div>
                    <div className="mx-[-12px] my-1.5 h-[3px] bg-[linear-gradient(90deg,var(--tone),transparent_92%)]" />
                    <div
                      className="overflow-hidden text-[10px] text-ellipsis whitespace-nowrap text-text-soft"
                      title={entry.description}
                    >
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
          <div
            className="mx-3 mb-3 flex-none overflow-hidden rounded-xl bg-card shadow-card"
            style={{ "--tone": tone, "--bar": bar } as CSSProperties}
          >
            <div className="flex gap-2 px-2.5 pt-2">
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
            <div className="flex items-center gap-2 px-2.5 pt-1.5 pb-1">
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
                className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-right text-lg text-[var(--tone)] shadow-none ring-0 placeholder:text-placeholder-income focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
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
            <div
              className="h-[3px]"
              style={{ background: `linear-gradient(90deg, transparent, ${bar})` }}
            />
            <div className="flex items-center gap-2 px-2.5 pt-1.5 pb-2">
              <Input
                className="h-auto min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-sm shadow-none ring-0 placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
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
