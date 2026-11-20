import { ChatIcon, PlusIcon, SettingsIcon } from "./Icons";

interface RailProps {
  onNewNote: () => void;
  onSettings: () => void;
}

export default function Rail(props: RailProps) {
  return (
    <nav
      aria-label="Tools"
      class="order-last flex h-14 w-full shrink-0 items-center justify-around border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 md:order-first md:h-full md:w-16 md:flex-col md:justify-start md:gap-2 md:border-r md:border-t-0 md:py-4"
    >
      <div class="hidden size-10 items-center justify-center rounded-2xl bg-emerald-500 text-lg font-bold text-white shadow-lg shadow-emerald-500/30 md:flex">
        L
      </div>

      <button
        type="button"
        title="Notes"
        aria-label="Notes"
        class="flex h-12 w-16 flex-col items-center justify-center gap-0.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300 md:h-11 md:w-12"
      >
        <ChatIcon class="size-5" />
        <span class="text-[10px] font-medium md:hidden">Notes</span>
      </button>

      <button
        type="button"
        title="New note"
        aria-label="New note"
        onClick={props.onNewNote}
        class="flex h-12 w-16 flex-col items-center justify-center gap-0.5 rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white md:h-11 md:w-12"
      >
        <PlusIcon class="size-5" />
        <span class="text-[10px] font-medium md:hidden">New</span>
      </button>

      <button
        type="button"
        title="Settings"
        aria-label="Settings"
        onClick={props.onSettings}
        class="flex h-12 w-16 flex-col items-center justify-center gap-0.5 rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white md:h-11 md:w-12"
      >
        <SettingsIcon class="size-5" />
        <span class="text-[10px] font-medium md:hidden">Settings</span>
      </button>

      <div class="hidden size-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-500 text-xs font-bold text-white md:mt-auto md:flex">
        LN
      </div>
    </nav>
  );
}
