import data from "@emoji-mart/data";
import { Picker } from "emoji-mart";
import { createSignal, onCleanup, Show } from "solid-js";

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export default function EmojiPicker(props: EmojiPickerProps) {
  const [open, setOpen] = createSignal(false);
  let picker: HTMLElement | undefined;

  const close = () => {
    setOpen(false);
    picker?.remove();
    picker = undefined;
  };

  onCleanup(() => {
    picker?.remove();
    picker = undefined;
  });

  const mountPicker = (element: HTMLDivElement) => {
    // emoji-mart's Picker is an <em-emoji-picker> custom element; its shipped
    // types don't expose the HTMLElement surface, so narrow it here.
    picker = new Picker({
      data,
      theme: "auto",
      perLine: 8,
      emojiButtonSize: 32,
      emojiSize: 22,
      previewPosition: "none",
      maxFrequentRows: 2,
      onEmojiSelect: (emoji: { native: string }) => {
        props.onChange(emoji.native);
        close();
      },
      onClickOutside: close,
    }) as unknown as HTMLElement;
    element.appendChild(picker);
  };

  return (
    <div class="relative">
      <button
        type="button"
        aria-label="Choose emoji"
        aria-expanded={open() ? "true" : "false"}
        onClick={() => (open() ? close() : setOpen(true))}
        class="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-2.5 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <span class="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-2xl dark:bg-emerald-500/10">
          {props.value}
        </span>
        <span class="text-sm text-slate-500 dark:text-slate-400">
          {props.value} · Change emoji
        </span>
      </button>

      <Show when={open()}>
        <div
          ref={mountPicker}
          class="absolute left-0 top-full z-30 mt-2 overflow-hidden rounded-xl shadow-xl"
        />
      </Show>
    </div>
  );
}
