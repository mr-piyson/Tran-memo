import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  getCurrency,
  setCurrency as storeCurrency,
  type Currency,
} from "@/lib/entries";

export type DialogName =
  | "settings"
  | "newDealer"
  | "editDealer"
  | "newNote"
  | "editNote"
  | null;

export interface Selection {
  dealerId: number;
  noteId: number | null;
}

export interface ConfirmRequest {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}

interface UIState {
  currency: Currency;
  setCurrency: (currency: Currency) => void;

  dialog: DialogName;
  dialogTargetId: number | null;
  openDialog: (dialog: Exclude<DialogName, null>, targetId?: number | null) => void;
  closeDialog: () => void;

  error: string | null;
  setError: (message: string | null) => void;

  confirm: ConfirmRequest | null;
  requestConfirm: (request: ConfirmRequest) => void;
  closeConfirm: () => void;

  /** Last valid selection, restored on cold start. Data itself lives in SQLite. */
  lastSelection: Selection | null;
  rememberSelection: (selection: Selection) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      currency: getCurrency(),
      setCurrency: (currency) => {
        storeCurrency(currency);
        set({ currency });
      },

      dialog: null,
      dialogTargetId: null,
      openDialog: (dialog, targetId = null) => set({ dialog, dialogTargetId: targetId }),
      closeDialog: () => set({ dialog: null, dialogTargetId: null }),

      error: null,
      setError: (error) => set({ error }),

      confirm: null,
      requestConfirm: (confirm) => set({ confirm }),
      closeConfirm: () => set({ confirm: null }),

      lastSelection: null,
      rememberSelection: (lastSelection) => set({ lastSelection }),
    }),
    {
      name: "ledger-notes:ui",
      partialize: (state) => ({ lastSelection: state.lastSelection }),
    },
  ),
);
