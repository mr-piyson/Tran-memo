import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowLeftIcon,
  MessageCircleIcon,
  ReceiptTextIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  formatAmount,
  formatTime,
  type Currency,
  type Entry,
  type EntryKind,
  type Note,
} from "../lib/entries";

interface ChatPanelProps {
  note: Note | null;
  entries: Entry[];
  currency: Currency;
  loading: boolean;
  hiddenOnMobile: boolean;
  onBack: () => void;
  onDeleteNote: () => void;
  onAddEntry: (kind: EntryKind, amountCents: number, description: string) => Promise<void>;
  onRemoveEntry: (id: number) => Promise<void>;
}

export default function ChatPanel({
  note,
  entries,
  currency,
  loading,
  hiddenOnMobile,
  onBack,
  onDeleteNote,
  onAddEntry,
  onRemoveEntry,
}: ChatPanelProps) {
  const [kind, setKind] = useState<EntryKind>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const entry of entries) {
      if (entry.kind === "income") income += entry.amount_cents;
      else expense += entry.amount_cents;
    }
    return { income, expense, balance: income - expense };
  }, [entries]);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 76,
    overscan: 10,
    getItemKey: (index) => entries[index]?.id ?? index,
  });

  useEffect(() => {
    if (entries.length === 0) return;
    const frame = requestAnimationFrame(() => {
      virtualizer.scrollToIndex(entries.length - 1, { align: "end" });
    });
    return () => cancelAnimationFrame(frame);
  }, [note?.id, entries.length, virtualizer]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setSending(true);
    setError("");
    try {
      await onAddEntry(
        kind,
        cents,
        description.trim() || (kind === "income" ? "Income" : "Expense"),
      );
      setAmount("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col bg-muted/30",
        hiddenOnMobile && "max-md:hidden",
      )}
    >
      {!note ? (
        <Empty className="border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageCircleIcon />
            </EmptyMedia>
            <EmptyTitle>Select a note</EmptyTitle>
            <EmptyDescription>
              Pick a conversation from the left to see its transactions.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <header className="flex shrink-0 items-center gap-3 border-b px-3 py-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back to notes"
              className="md:hidden"
              onClick={onBack}
            >
              <ArrowLeftIcon />
            </Button>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xl">
              {note.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-semibold leading-tight">{note.title}</h2>
              <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                <Badge variant="secondary" className="tabular-nums">
                  {entries.length} transactions
                </Badge>
                <span className="font-medium tabular-nums">
                  {formatAmount(totals.balance, currency)}
                </span>
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete note"
              title="Delete note"
              onClick={onDeleteNote}
            >
              <Trash2Icon />
            </Button>
          </header>

          <div className="grid shrink-0 grid-cols-2 gap-2 border-b p-2">
            <Card size="sm" className="shadow-none">
              <CardHeader>
                <CardDescription>Income</CardDescription>
                <CardTitle className="tabular-nums text-positive">
                  {formatAmount(totals.income, currency)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm" className="shadow-none">
              <CardHeader>
                <CardDescription>Expenses</CardDescription>
                <CardTitle className="tabular-nums text-negative">
                  {formatAmount(totals.expense, currency)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {!loading && entries.length === 0 && (
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ReceiptTextIcon />
                </EmptyMedia>
                <EmptyTitle>No transactions yet</EmptyTitle>
                <EmptyDescription>
                  Send your first income or expense below.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {entries.length > 0 && (
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6"
            >
              <div
                className="relative mx-auto w-full max-w-3xl"
                style={{ height: virtualizer.getTotalSize() }}
              >
                {virtualizer.getVirtualItems().map((row) => {
                  const entry = entries[row.index];
                  const isIncome = entry.kind === "income";

                  return (
                    <div
                      key={row.key}
                      data-index={row.index}
                      ref={(element) => {
                        if (element) virtualizer.measureElement(element);
                      }}
                      className="absolute left-0 top-0 w-full px-1 pb-2"
                      style={{ transform: `translateY(${row.start}px)` }}
                    >
                      <div
                        className={cn(
                          "group flex w-full items-end gap-2",
                          isIncome ? "justify-start" : "justify-end",
                        )}
                      >
                        {isIncome && (
                          <span className="mb-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-positive/15 text-sm">
                            💰
                          </span>
                        )}
                        <div
                          className={cn(
                            "relative max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm sm:max-w-[70%]",
                            isIncome
                              ? "rounded-bl-md bg-positive text-positive-foreground"
                              : "rounded-br-md bg-negative text-negative-foreground",
                          )}
                        >
                          <p className="break-words text-sm font-medium">{entry.description}</p>
                          <div className="mt-1 flex items-center justify-end gap-2">
                            <span className="text-sm font-bold tabular-nums">
                              {isIncome ? "+" : "−"}
                              {formatAmount(entry.amount_cents, currency)}
                            </span>
                            <span
                              className={cn(
                                "text-[10px]",
                                isIncome
                                  ? "text-positive-foreground/70"
                                  : "text-negative-foreground/70",
                              )}
                            >
                              {formatTime(entry.created_at)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete transaction"
                          title="Delete transaction"
                          className="mb-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                          onClick={() => onRemoveEntry(entry.id)}
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={submit} className="shrink-0 border-t px-3 py-3">
            <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center">
              <ToggleGroup
                value={[kind]}
                onValueChange={(value) => {
                  const next = value[0];
                  if (next === "income" || next === "expense") setKind(next);
                }}
                variant="outline"
                size="sm"
              >
                <ToggleGroupItem value="expense">Expense</ToggleGroupItem>
                <ToggleGroupItem value="income">Income</ToggleGroupItem>
              </ToggleGroup>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                required
                aria-label="Amount"
                placeholder="Amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full tabular-nums sm:w-28"
              />
              <Input
                type="text"
                maxLength={120}
                aria-label="Message"
                placeholder="Message"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-w-0 flex-1"
              />
              <Button
                type="submit"
                size="icon"
                aria-label="Send transaction"
                title="Send"
                disabled={sending}
              >
                {sending ? <Spinner /> : <SendIcon />}
              </Button>
            </div>
            {error && (
              <Alert variant="destructive" className="mx-auto mt-2 max-w-3xl">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </form>
        </>
      )}
    </section>
  );
}
