import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import {
  getStore,
  type Dealer,
  type Entry,
  type EntryKind,
  type EntryPage,
  type NewDealer,
} from "@/lib/entries";
import { queryKeys } from "@/lib/query-keys";

export const THREAD_PAGE_SIZE = 100;

export function useDealers() {
  return useQuery({
    queryKey: queryKeys.dealers,
    queryFn: async () => (await getStore()).listDealers(),
  });
}

export function useSummaries() {
  return useQuery({
    queryKey: queryKeys.summaries,
    queryFn: async () => (await getStore()).listSummaries(),
  });
}

export function useLedgerNotes(dealerId: number | null) {
  return useQuery({
    queryKey: queryKeys.notes(dealerId ?? -1),
    queryFn: async () => {
      if (dealerId === null) throw new Error("No dealer selected");
      return (await getStore()).listLedgerNotes(dealerId);
    },
    enabled: dealerId !== null,
  });
}

/** Newest-first pages; the UI reverses them into chat order. */
export function useThreadEntries(noteId: number | null) {
  return useInfiniteQuery({
    queryKey: queryKeys.entries(noteId ?? -1),
    queryFn: async ({ pageParam }) => {
      if (noteId === null) throw new Error("No ledger note selected");
      return (await getStore()).listEntriesPage(noteId, THREAD_PAGE_SIZE, pageParam);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: noteId !== null,
  });
}

function useInvalidate() {
  const client = useQueryClient();
  return async (ids: { dealerId?: number; noteId?: number } = {}) => {
    const invalidations = [
      client.invalidateQueries({ queryKey: queryKeys.dealers }),
      client.invalidateQueries({ queryKey: queryKeys.summaries }),
    ];
    if (ids.dealerId !== undefined) {
      invalidations.push(client.invalidateQueries({ queryKey: queryKeys.notes(ids.dealerId) }));
    }
    if (ids.noteId !== undefined) {
      invalidations.push(client.invalidateQueries({ queryKey: queryKeys.entries(ids.noteId) }));
    }
    await Promise.all(invalidations);
  };
}

export function useCreateDealer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (dealer: NewDealer) => getStore().then((store) => store.createDealer(dealer)),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateDealer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: number;
      patch: Partial<Pick<Dealer, "name" | "phone" | "email" | "emoji">>;
    }) => getStore().then((store) => store.updateDealer(id, patch)),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteDealer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => getStore().then((store) => store.deleteDealer(id)),
    onSuccess: () => invalidate(),
  });
}

export function useCreateLedgerNote(dealerId: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (label: string | null) =>
      getStore().then((store) => store.createLedgerNote({ dealerId, label })),
    onSuccess: (note) => invalidate({ dealerId, noteId: note.id }),
  });
}

export function useRenameLedgerNote(dealerId: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, label }: { id: number; label: string }) =>
      getStore().then((store) => store.renameLedgerNote(id, label)),
    onSuccess: () => invalidate({ dealerId }),
  });
}

export function useDeleteLedgerNote(dealerId: number, noteId: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: () => getStore().then((store) => store.deleteLedgerNote(noteId)),
    onSuccess: () => invalidate({ dealerId, noteId }),
  });
}

export interface AddEntryInput {
  kind: EntryKind;
  amountCents: number;
  description: string;
}

export function useAddEntry(noteId: number) {
  const client = useQueryClient();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (input: AddEntryInput) => {
      const store = await getStore();
      await store.addEntry({ ledgerNoteId: noteId, ...input });
    },
    onMutate: async (input) => {
      await client.cancelQueries({ queryKey: queryKeys.entries(noteId) });
      const previous = client.getQueryData<InfiniteData<EntryPage>>(queryKeys.entries(noteId));
      const optimistic: Entry = {
        id: -Date.now(),
        ledger_note_id: noteId,
        kind: input.kind,
        amount_cents: input.amountCents,
        description: input.description,
        created_at: new Date().toISOString(),
      };
      client.setQueryData<InfiniteData<EntryPage>>(queryKeys.entries(noteId), (old) => {
        if (!old || old.pages.length === 0) return old;
        const [first, ...rest] = old.pages;
        if (!first) return old;
        return {
          ...old,
          pages: [{ ...first, entries: [optimistic, ...first.entries] }, ...rest],
        };
      });
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) client.setQueryData(queryKeys.entries(noteId), context.previous);
    },
    onSettled: () => invalidate({ noteId }),
  });
}

export function useRemoveEntry(noteId: number) {
  const client = useQueryClient();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (id: number) => {
      const store = await getStore();
      await store.removeEntry(id);
    },
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: queryKeys.entries(noteId) });
      const previous = client.getQueryData<InfiniteData<EntryPage>>(queryKeys.entries(noteId));
      client.setQueryData<InfiniteData<EntryPage>>(queryKeys.entries(noteId), (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                entries: page.entries.filter((entry) => entry.id !== id),
              })),
            }
          : old,
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) client.setQueryData(queryKeys.entries(noteId), context.previous);
    },
    onSettled: () => invalidate({ noteId }),
  });
}
