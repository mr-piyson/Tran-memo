import { createEffect, createMemo, createSignal, For, Show, type Accessor } from "solid-js";
import {
  formatAmount,
  formatTime,
  type Currency,
  type Entry,
  type EntryKind,
  type Note,
} from "../lib/entries";
import { createVirtualizer } from "../lib/virtual";
import { BackIcon, SendIcon, TrashIcon } from "./Icons";

interface ChatPanelProps {
  note: Accessor<Note | null>;
  entries: Accessor<Entry[]>;
  currency: Accessor<Currency>;
  loading: boolean;
  hiddenOnMobile: boolean;
  onBack: () => void;
  onDeleteNote: () => void;
  onAddEntry: (kind: EntryKind, amountCents: number, description: string) => Promise<void>;
  onRemoveEntry: (id: number) => Promise<void>;
}

export default function ChatPanel(props: ChatPanelProps) {
  const [kind, setKind] = createSignal<EntryKind>("expense");
  const [amount, setAmount] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [sending, setSending] = createSignal(false);
  const [error, setError] = createSignal("");

  const totals = createMemo(() => {
    let income = 0;
    let expense = 0;
    for (const entry of props.entries()) {
      if (entry.kind === "income") income += entry.amount_cents;
      else expense += entry.amount_cents;
    }
    return { income, expense, balance: income - expense };
  });

  const virtual = createVirtualizer<HTMLDivElement>(() => ({
    count: props.entries().length,
    estimateSize: () => 76,
    overscan: 10,
    getItemKey: (index) => props.entries()[index]?.id ?? index,
  }));

  createEffect(
    () => [props.note()?.id, props.entries().length] as const,
    () => {
      const count = props.entries().length;
      if (count === 0) return;
      requestAnimationFrame(() => virtual.scrollToIndex(count - 1, { align: "end" }));
    },
  );

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const cents = Math.round(Number(amount()) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    setSending(true);
    setError("");
    try {
      await props.onAddEntry(
        kind(),
        cents,
        description().trim() || (kind() === "income" ? "Income" : "Expense"),
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
      class={[
        "flex min-h-0 min-w-0 flex-1 flex-col bg-[#f7f9fb] dark:bg-slate-950",
        props.hiddenOnMobile && "max-md:hidden",
      ]}
    >
      <Show
        when={props.note()}
        fallback={
          <div class="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
            <span class="text-5xl">💬</span>
            <p class="text-lg font-semibold">Select a note</p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Pick a conversation from the left to see its transactions.
            </p>
          </div>
        }
      >
        {(note) => (
          <>
            <header class="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                aria-label="Back to notes"
                onClick={props.onBack}
                class="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
              >
                <BackIcon class="size-5" />
              </button>
              <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 text-xl dark:from-emerald-500/20 dark:to-teal-500/20">
                {note().emoji}
              </span>
              <div class="min-w-0 flex-1">
                <h2 class="truncate font-semibold leading-tight">{note().title}</h2>
                <p class="truncate text-xs text-slate-500 dark:text-slate-400">
                  {props.entries().length} transactions ·{" "}
                  <span class="font-medium tabular-nums">
                    {formatAmount(totals().balance, props.currency())}
                  </span>
                </p>
              </div>
              <button
                type="button"
                title="Delete note"
                aria-label="Delete note"
                onClick={props.onDeleteNote}
                class="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
              >
                <TrashIcon class="size-5" />
              </button>
            </header>

            <div class="grid shrink-0 grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800">
              <div class="bg-white px-4 py-2 dark:bg-slate-900">
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Income
                </p>
                <p class="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatAmount(totals().income, props.currency())}
                </p>
              </div>
              <div class="bg-white px-4 py-2 dark:bg-slate-900">
                <p class="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Expenses
                </p>
                <p class="text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                  {formatAmount(totals().expense, props.currency())}
                </p>
              </div>
            </div>

            <Show when={!props.loading && props.entries().length === 0}>
              <div class="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
                <span class="text-4xl">🧾</span>
                <p class="font-semibold">No transactions yet</p>
                <p class="text-sm text-slate-500 dark:text-slate-400">
                  Send your first income or expense below.
                </p>
              </div>
            </Show>

            <Show when={props.entries().length > 0}>
              <div
                ref={virtual.setScrollElement}
                class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6"
              >
                <div class="relative mx-auto w-full max-w-3xl" style={{ height: `${virtual.totalSize()}px` }}>
                  <For each={virtual.virtualItems()}>
                    {(row) => {
                      const entry = () => props.entries()[row.index];
                      const isIncome = () => entry().kind === "income";

                      return (
                        <div
                          ref={(element) => virtual.measureElement(element)}
                          data-index={row.index}
                          class="absolute left-0 top-0 w-full px-1 pb-2"
                          style={{ transform: `translateY(${row.start}px)` }}
                        >
                          <div
                            class={[
                              "group flex w-full items-end gap-2",
                              isIncome() ? "justify-start" : "justify-end",
                            ]}
                          >
                            <Show when={isIncome()}>
                              <span class="mb-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm dark:bg-emerald-500/20">
                                💰
                              </span>
                            </Show>
                            <div
                              class={[
                                "relative max-w-[85%] rounded-2xl px-4 py-2.5 text-white shadow-sm sm:max-w-[70%]",
                                {
                                  "rounded-bl-md bg-emerald-600": isIncome(),
                                  "rounded-br-md bg-rose-500": !isIncome(),
                                },
                              ]}
                            >
                              <p class="break-words text-sm font-medium">{entry().description}</p>
                              <div class="mt-1 flex items-center justify-end gap-2">
                                <span class="text-sm font-bold tabular-nums">
                                  {isIncome() ? "+" : "−"}
                                  {formatAmount(entry().amount_cents, props.currency())}
                                </span>
                                <span
                                  class={[
                                    "text-[10px]",
                                    isIncome()
                                      ? "text-slate-400 dark:text-slate-500"
                                      : "text-white/70",
                                  ]}
                                >
                                  {formatTime(entry().created_at)}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              title="Delete transaction"
                              aria-label="Delete transaction"
                              onClick={() => props.onRemoveEntry(entry().id)}
                              class="mb-1 rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-rose-500 group-hover:opacity-100 focus:opacity-100 dark:text-slate-600 dark:hover:bg-slate-800"
                            >
                              <TrashIcon class="size-4" />
                            </button>
                          </div>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>
            </Show>

            <form
              onSubmit={submit}
              class="shrink-0 border-t border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <div class="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center">
                <div class="flex shrink-0 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setKind("expense")}
                    class={[
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                      {
                        "bg-white text-rose-600 shadow-sm dark:bg-slate-700 dark:text-rose-300":
                          kind() === "expense",
                        "text-slate-500 dark:text-slate-400": kind() !== "expense",
                      },
                    ]}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setKind("income")}
                    class={[
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                      {
                        "bg-white text-emerald-600 shadow-sm dark:bg-slate-700 dark:text-emerald-300":
                          kind() === "income",
                        "text-slate-500 dark:text-slate-400": kind() !== "income",
                      },
                    ]}
                  >
                    Income
                  </button>
                </div>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputmode="decimal"
                  required
                  placeholder="Amount"
                  value={amount()}
                  onInput={(event) => setAmount(event.currentTarget.value)}
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm tabular-nums outline-none focus:border-emerald-500 sm:w-28 dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="text"
                  maxlength="120"
                  placeholder="Message"
                  value={description()}
                  onInput={(event) => setDescription(event.currentTarget.value)}
                  class="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800"
                />
                <button
                  type="submit"
                  disabled={sending()}
                  title="Send"
                  aria-label="Send transaction"
                  class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  <SendIcon class="size-5" />
                </button>
              </div>
              <Show when={error()}>
                <p role="alert" class="mx-auto mt-2 max-w-3xl text-xs font-medium text-rose-500">
                  {error()}
                </p>
              </Show>
            </form>
          </>
        )}
      </Show>
    </section>
  );
}
