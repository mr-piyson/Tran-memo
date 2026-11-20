import type { JSX } from "@solidjs/web";
import { CloseIcon } from "./Icons";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: JSX.Element;
}

export default function Modal(props: ModalProps) {
  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={props.onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        onClick={(event) => event.stopPropagation()}
        class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-lg font-semibold">{props.title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={props.onClose}
            class="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <CloseIcon class="size-5" />
          </button>
        </div>
        <div class="mt-5">{props.children}</div>
      </div>
    </div>
  );
}
