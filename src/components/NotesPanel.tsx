import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MessageCircleIcon, PlusIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import {
  formatAmount,
  formatListDate,
  type Currency,
  type Entry,
  type Note,
} from "../lib/entries";

interface NoteSummary {
  total: number;
  count: number;
  last?: Entry;
}

interface NotesPanelProps {
  notes: Note[];
  entries: Entry[];
  selectedId: number | null;
  currency: Currency;
  hiddenOnMobile: boolean;
  onSelect: (id: number) => void;
  onNewNote: () => void;
}

export default function NotesPanel({
  notes,
  entries,
  selectedId,
  currency,
  hiddenOnMobile,
  onSelect,
  onNewNote,
}: NotesPanelProps) {
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? notes.filter((note) => note.title.toLowerCase().includes(query)) : notes;
  }, [notes, search]);

  const summaries = useMemo(() => {
    const result = new Map<number, NoteSummary>();
    for (const entry of entries) {
      const summary = result.get(entry.note_id) ?? { total: 0, count: 0 };
      summary.total += entry.kind === "income" ? entry.amount_cents : -entry.amount_cents;
      summary.count += 1;
      if (!summary.last || entry.created_at > summary.last.created_at) {
        summary.last = entry;
      }
      result.set(entry.note_id, summary);
    }
    return result;
  }, [entries]);

  const virtualizer = useVirtualizer({
    count: filteredNotes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 78,
    overscan: 8,
    getItemKey: (index) => filteredNotes[index]?.id ?? index,
  });

  return (
    <aside
      className={cn(
        "flex min-h-0 w-full shrink-0 flex-col border-r bg-background md:w-80 lg:w-96",
        hiddenOnMobile && "max-md:hidden",
      )}
    >
      <div className="flex shrink-0 flex-col gap-3 px-4 pb-3 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Ledger Notes
            </p>
            <h1 className="mt-0.5 text-xl font-bold">Chats</h1>
          </div>
          <Button size="icon" aria-label="New note" onClick={onNewNote}>
            <PlusIcon />
          </Button>
        </div>

        <InputGroup>
          <InputGroupInput
            type="search"
            aria-label="Search notes"
            placeholder="Search notes"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
      </div>

      {filteredNotes.length === 0 ? (
        <Empty className="border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageCircleIcon />
            </EmptyMedia>
            <EmptyTitle>{search ? "No matches" : "No notes yet"}</EmptyTitle>
            <EmptyDescription>
              {search
                ? "No notes match your search."
                : "Create a note to start tracking transactions."}
            </EmptyDescription>
          </EmptyHeader>
          {!search && (
            <EmptyContent>
              <Button onClick={onNewNote}>
                <PlusIcon data-icon="inline-start" />
                Create your first note
              </Button>
            </EmptyContent>
          )}
        </Empty>
      ) : (
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3"
        >
          <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
            {virtualizer.getVirtualItems().map((row) => {
              const note = filteredNotes[row.index];
              const summary = summaries.get(note.id);
              const last = summary?.last;
              const isSelected = selectedId === note.id;

              return (
                <div
                  key={row.key}
                  data-index={row.index}
                  ref={(element) => {
                    if (element) virtualizer.measureElement(element);
                  }}
                  className="absolute left-0 top-0 w-full px-1 pb-1"
                  style={{ transform: `translateY(${row.start}px)` }}
                >
                  <Button
                    variant="ghost"
                    data-selected={isSelected}
                    aria-label={`Open ${note.title}`}
                    className="h-auto w-full justify-start rounded-2xl p-3 text-left data-[selected=true]:bg-accent"
                    onClick={() => onSelect(note.id)}
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-xl">
                      {note.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-semibold">{note.title}</span>
                        {last && (
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatListDate(last.created_at)}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-muted-foreground">
                          {last
                            ? `${last.kind === "income" ? "↙ " : "↗ "}${last.description}`
                            : "No transactions yet"}
                        </span>
                        {(summary?.count ?? 0) > 0 && (
                          <span
                            className={cn(
                              "shrink-0 text-xs font-semibold tabular-nums",
                              (summary?.total ?? 0) >= 0 ? "text-positive" : "text-negative",
                            )}
                          >
                            {formatAmount(summary?.total ?? 0, currency)}
                          </span>
                        )}
                      </span>
                    </span>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
