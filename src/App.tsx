import { useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useParams, useRouter } from "@tanstack/react-router";
import AppSidebar from "@/components/AppSidebar";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import DealerDialog from "@/components/dialogs/DealerDialog";
import NoteDialog from "@/components/dialogs/NoteDialog";
import SettingsDialog from "@/components/dialogs/SettingsDialog";
import {
  DealerDetailPanel,
  DealersPanel,
  LedgerNotesPanel,
  LedgerThread,
} from "@/components/LedgerPanels";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  useAddEntry,
  useDealers,
  useDeleteDealer,
  useDeleteLedgerNote,
  useLedgerNotes,
  useRemoveEntry,
  useSummaries,
  useThreadEntries,
} from "@/hooks/use-ledger";
import { isTauri, type Dealer, type EntryKind, type LedgerNote } from "@/lib/entries";
import { useUIStore } from "@/store/ui";

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** Android's hardware back button pops dialogs, then the route stack. */
function useAndroidBack(pathname: string) {
  const router = useRouter();
  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    let listener: { unregister(): Promise<void> } | undefined;
    void import("@tauri-apps/api/app")
      .then(({ onBackButtonPress, exit }) =>
        onBackButtonPress(() => {
          const state = useUIStore.getState();
          if (state.dialog) return state.closeDialog();
          if (state.confirm) return state.closeConfirm();
          if (pathname !== "/") return router.history.back();
          void exit(0);
        }),
      )
      .then((handle) => {
        if (cancelled) void handle.unregister();
        else listener = handle;
      });
    return () => {
      cancelled = true;
      void listener?.unregister();
    };
  }, [router, pathname]);
}

export default function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const params = useParams({ strict: false }) as { dealerId?: string; noteId?: string };
  const queryClient = useQueryClient();

  const dealerId = params.dealerId ? Number(params.dealerId) : null;
  const explicitNoteId = params.noteId ? Number(params.noteId) : null;
  const isDetail = pathname.endsWith("/detail");

  const currency = useUIStore((state) => state.currency);
  const error = useUIStore((state) => state.error);
  const setError = useUIStore((state) => state.setError);
  const openDialog = useUIStore((state) => state.openDialog);
  const requestConfirm = useUIStore((state) => state.requestConfirm);
  const rememberSelection = useUIStore((state) => state.rememberSelection);

  const dealersQuery = useDealers();
  const summariesQuery = useSummaries();
  const notesQuery = useLedgerNotes(dealerId);
  const threadQuery = useThreadEntries(
    dealerId === null ? null : (explicitNoteId ?? notesQuery.data?.[0]?.id ?? null),
  );

  const dealers = dealersQuery.data ?? [];
  const notes = dealerId === null ? [] : (notesQuery.data ?? []);
  const noteSummaries = summariesQuery.data ?? [];
  const selectedDealer = dealers.find((dealer) => dealer.id === dealerId) ?? null;
  const selectedNoteId = explicitNoteId ?? notes[0]?.id ?? null;
  const selectedNote = notes.find((note) => note.id === selectedNoteId) ?? null;

  const dealerSummaries = useMemo(
    () => noteSummaries.filter((summary) => summary.dealerId === dealerId),
    [noteSummaries, dealerId],
  );
  const notesTotal = dealerSummaries.reduce((sum, summary) => sum + summary.income - summary.expense, 0);
  const noteSummary = noteSummaries.find((summary) => summary.ledgerNoteId === selectedNoteId);
  const threadTotals = {
    income: noteSummary?.income ?? 0,
    expense: noteSummary?.expense ?? 0,
    balance: (noteSummary?.income ?? 0) - (noteSummary?.expense ?? 0),
  };

  const mobilePane = isDetail
    ? "detail"
    : explicitNoteId !== null
      ? "thread"
      : dealerId !== null
        ? "notes"
        : "dealers";

  useAndroidBack(pathname);

  // Restore the last opened dealer once the list is available.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !dealersQuery.data) return;
    restored.current = true;
    const last = useUIStore.getState().lastSelection;
    if (dealerId === null && last && dealersQuery.data.some((dealer) => dealer.id === last.dealerId)) {
      void navigate({ to: "/dealers/$dealerId", params: { dealerId: String(last.dealerId) }, replace: true });
    }
  }, [dealersQuery.data, dealerId, navigate]);

  useEffect(() => {
    if (dealerId !== null) rememberSelection({ dealerId, noteId: selectedNoteId });
  }, [dealerId, selectedNoteId, rememberSelection]);

  const deleteDealerMutation = useDeleteDealer();
  const deleteNoteMutation = useDeleteLedgerNote(dealerId ?? -1, selectedNoteId ?? -1);
  const addEntryMutation = useAddEntry(selectedNoteId ?? -1);
  const removeEntryMutation = useRemoveEntry(selectedNoteId ?? -1);

  function requestDeleteDealer(target?: Dealer) {
    const dealer = target ?? selectedDealer;
    if (!dealer) return;
    requestConfirm({
      title: `Delete ${dealer.name}?`,
      description: "All ledger notes and transactions for this dealer will be removed.",
      onConfirm: async () => {
        try {
          await deleteDealerMutation.mutateAsync(dealer.id);
          if (dealerId === dealer.id) void navigate({ to: "/" });
        } catch (cause) {
          setError(errorMessage(cause));
        }
      },
    });
  }

  function requestDeleteNote(target?: LedgerNote) {
    const note = target ?? selectedNote;
    if (!note || dealerId === null) return;
    requestConfirm({
      title: `Delete ${note.code}?`,
      description: "This ledger note and all its transactions will be removed.",
      onConfirm: async () => {
        try {
          await deleteNoteMutation.mutateAsync();
          void navigate({ to: "/dealers/$dealerId", params: { dealerId: String(dealerId) } });
        } catch (cause) {
          setError(errorMessage(cause));
        }
      },
    });
  }

  function clearBrowserData() {
    requestConfirm({
      title: "Clear browser preview data?",
      description: "All dealers, ledger notes and transactions in this browser will be deleted.",
      confirmLabel: "Clear data",
      onConfirm: async () => {
        for (const key of [
          "ledger-notes:v4",
          "ledger-notes:v3",
          "ledger-notes:v2",
          "ledger-notes:entries",
        ]) {
          localStorage.removeItem(key);
        }
        useUIStore.setState({ lastSelection: null });
        queryClient.clear();
        void navigate({ to: "/", replace: true });
      },
    });
  }

  const displayedError =
    error ??
    [dealersQuery.error, summariesQuery.error, notesQuery.error, threadQuery.error]
      .find((queryError) => queryError !== null)
      ?.message ??
    null;

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={false}>
        <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
          <AppSidebar
            onDealers={() => void navigate({ to: "/" })}
            onNewDealer={() => openDialog("newDealer")}
            onNewNote={() => openDialog("newNote", dealerId)}
            onSettings={() => openDialog("settings")}
          />

          <SidebarInset className="min-w-0">
            <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
              <DealersPanel
                dealers={dealers}
                summaries={noteSummaries}
                selectedId={dealerId}
                currency={currency}
                active={mobilePane === "dealers"}
                // Detail is a separate pane: keep the list on desktop while it
                // is open, but let the two swap on mobile (only the active one).
                desktopActive={dealerId === null || isDetail}
                onSelect={(id) =>
                  void navigate({ to: "/dealers/$dealerId", params: { dealerId: String(id) } })
                }
                onNewDealer={() => openDialog("newDealer")}
                onEditDealer={(dealer) => openDialog("editDealer", dealer.id)}
                onDeleteDealer={requestDeleteDealer}
                onDetailDealer={(dealer) =>
                  void navigate({
                    to: "/dealers/$dealerId/detail",
                    params: { dealerId: String(dealer.id) },
                  })
                }
              />
              <LedgerNotesPanel
                dealer={selectedDealer}
                notes={notes}
                summaries={dealerSummaries}
                total={notesTotal}
                selectedId={selectedNoteId}
                currency={currency}
                active={mobilePane === "notes"}
                desktopActive={!isDetail && dealerId !== null}
                onBack={() => void navigate({ to: "/" })}
                onSelect={(id) =>
                  void navigate({
                    to: "/dealers/$dealerId/notes/$noteId",
                    params: { dealerId: String(dealerId), noteId: String(id) },
                  })
                }
                onNewNote={() => openDialog("newNote", dealerId)}
                onEditNote={(note) => openDialog("editNote", note.id)}
                onDeleteNote={requestDeleteNote}
                onDetailDealer={(dealer) =>
                  void navigate({
                    to: "/dealers/$dealerId/detail",
                    params: { dealerId: String(dealer.id) },
                  })
                }
                onEditDealer={(dealer) => openDialog("editDealer", dealer.id)}
                onDeleteDealer={() => requestDeleteDealer()}
              />
              <LedgerThread
                dealer={selectedDealer}
                note={selectedNote}
                pages={threadQuery.data?.pages ?? []}
                totals={threadTotals}
                currency={currency}
                active={mobilePane === "thread"}
                isLoading={threadQuery.isLoading}
                isFetchingNextPage={threadQuery.isFetchingNextPage}
                hasNextPage={threadQuery.hasNextPage}
                onLoadOlder={() => void threadQuery.fetchNextPage()}
                onBack={() =>
                  void navigate({ to: "/dealers/$dealerId", params: { dealerId: String(dealerId) } })
                }
                onDeleteNote={() => requestDeleteNote()}
                onAddEntry={async (kind: EntryKind, amount: number, description: string) => {
                  if (selectedNoteId === null) return;
                  await addEntryMutation.mutateAsync({ kind, amountCents: amount, description });
                }}
                onRemoveEntry={async (id: number) => {
                  await removeEntryMutation.mutateAsync(id);
                }}
              />
              {isDetail && (
                <DealerDetailPanel
                  dealer={selectedDealer}
                  total={notesTotal}
                  currency={currency}
                  active
                  desktopActive
                  onClose={() =>
                    void navigate({
                      to: "/dealers/$dealerId",
                      params: { dealerId: String(dealerId) },
                    })
                  }
                  onDeleteDealer={requestDeleteDealer}
                />
              )}
            </div>

            {displayedError && (
              <Alert
                variant="destructive"
                className="fixed bottom-20 left-1/2 z-50 w-auto -translate-x-1/2 shadow-lg md:bottom-6"
              >
                <AlertDescription>{displayedError}</AlertDescription>
              </Alert>
            )}

            <DealerDialog />
            <NoteDialog dealerId={dealerId} />
            <SettingsDialog onClearData={clearBrowserData} />
            <ConfirmDialog />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
