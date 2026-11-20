import { createMemo, createSignal, For, Show, type Accessor } from "solid-js";
import {
  formatAmount,
  formatListDate,
  type Currency,
  type Entry,
  type Note,
} from "../lib/entries";
import { createVirtualizer } from "../lib/virtual";
import { PlusIcon, SearchIcon } from "./Icons";

interface NoteSummary {
  total: number;
  count: number;
  last?: Entry;
}

interface NotesPanelProps {
  notes: Accessor<Note[]>;
  entries: Accessor<Entry[]>;
  selectedId: Accessor<number | null>;
  currency: Accessor<Currency>;
  hiddenOnMobile: boolean;
  onSelect: (id: number) => void;
  onNewNote: () => void;
}

export default function NotesPanel(props: NotesPanelProps) {
  const [search, setSearch] = createSignal("");

  const filteredNotes = createMemo(() => {
    const query = search().trim().toLowerCase();
    return query
      ? props.notes().filter((note) => note.title.toLowerCase().includes(query))
      : props.notes();
  });

  const summaries = createMemo(() => {
    const result = new Map<number, NoteSummary>();
    for (const entry of props.entries()) {
      const summary = result.get(entry.note_id) ?? { total: 0, count: 0 };
      summary.total +=
        entry.kind === "income" ? entry.amount_cents : -entry.amount_cents;
      summary.count += 1;
      if (!summary.last || entry.created_at > summary.last.created_at) {
        summary.last = entry;
      }
      result.set(entry.note_id, summary);
    }
    return result;
  });

  const virtual = createVirtualizer<HTMLDivElement>(() => ({
    count: filteredNotes().length,
    estimateSize: () => 78,
    overscan: 8,
    getItemKey: (index) => filteredNotes()[index]?.id ?? index,
  }));

  return (
    <aside
      class={[
        "min-h-0 w-full shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 md:flex md:w-80 lg:w-96",
        props.hiddenOnMobile ? "hidden" : "flex",
      ]}
    >
      <div class="shrink-0 space-y-3 px-4 pb-3 pt-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
              Ledger Notes
            </p>
            <h1 class="mt-0.5 text-xl font-bold">Chats</h1>
          </div>
          <button
            type="button"
            title="New note"
            aria-label="New note"
            onClick={props.onNewNote}
            class="rounded-xl bg-emerald-500 p-2.5 text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600"
          >
            <PlusIcon class="size-5" />
          </button>
        </div>

        <label class="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 dark:bg-slate-800">
          <SearchIcon class="size-4 shrink-0 text-slate-400" />
          <input
            type="search"
            placeholder="Search notes"
            value={search()}
            onInput={(event) => setSearch(event.currentTarget.value)}
            class="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      <Show
        when={filteredNotes().length > 0}
        fallback={
          <div class="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {search() ? "No notes match your search." : "No notes yet."}
            </p>
            <Show when={!search()}>
              <button
                type="button"
                onClick={props.onNewNote}
                class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                Create your first note
              </button>
            </Show>
          </div>
        }
      >
        <div
          ref={virtual.setScrollElement}
          class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3"
        >
          <div class="relative w-full" style={{ height: `${virtual.totalSize()}px` }}>
            <For each={virtual.virtualItems()}>
              {(row) => {
                const note = () => filteredNotes()[row.index];
                const summary = () => summaries().get(note().id);
                const isSelected = () => props.selectedId() === note().id;

                return (
                  <div
                    ref={(element) => virtual.measureElement(element)}
                    data-index={row.index}
                    class="absolute left-0 top-0 w-full px-1 pb-1"
                    style={{ transform: `translateY(${row.start}px)` }}
                  >
                    <button
                      type="button"
                      onClick={() => props.onSelect(note().id)}
                      class={[
                        "flex w-full items-center gap-3 rounded-2xl p-3 text-left transition",
                        {
                          "bg-emerald-50 dark:bg-emerald-500/10": isSelected(),
                          "hover:bg-slate-50 dark:hover:bg-slate-800": !isSelected(),
                        },
                      ]}
                    >
                      <span class="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 text-xl dark:from-emerald-500/20 dark:to-teal-500/20">
                        {note().emoji}
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="flex items-baseline justify-between gap-2">
                          <span class="truncate font-semibold">{note().title}</span>
                          <Show when={summary()?.last}>
                            {(last) => (
                              <span class="shrink-0 text-[11px] text-slate-400">
                                {formatListDate(last().created_at)}
                              </span>
                            )}
                          </Show>
                        </span>
                        <span class="mt-1 flex items-center justify-between gap-2">
                          <span class="truncate text-xs text-slate-500 dark:text-slate-400">
                            {summary()?.last
                              ? `${summary()?.last?.kind === "income" ? "↙ " : "↗ "}${summary()?.last?.description}`
                              : "No transactions yet"}
                          </span>
                          <Show when={(summary()?.count ?? 0) > 0}>
                            <span
                              class={[
                                "shrink-0 text-xs font-semibold tabular-nums",
                                {
                                  "text-emerald-600 dark:text-emerald-400":
                                    (summary()?.total ?? 0) >= 0,
                                  "text-rose-500 dark:text-rose-400":
                                    (summary()?.total ?? 0) < 0,
                                },
                              ]}
                            >
                              {formatAmount(summary()?.total ?? 0, props.currency())}
                            </span>
                          </Show>
                        </span>
                      </span>
                    </button>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </Show>
    </aside>
  );
}
