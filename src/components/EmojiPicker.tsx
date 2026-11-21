import { useEffect, useState } from "react";
import { DealerAvatar, isDefaultAvatar } from "@/components/LedgerPanels";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// emoji-mart ships ~1 MB of data; load it only when the picker is opened.
let pickerModule: Promise<typeof import("emoji-mart")> | undefined;
let pickerData: typeof import("@emoji-mart/data") | undefined;
function loadPicker() {
  pickerModule ??= Promise.all([import("emoji-mart"), import("@emoji-mart/data")]).then(
    ([mod, data]) => {
      pickerData = data.default;
      mod.init({ data: pickerData });
      return mod;
    },
  );
  return pickerModule;
}

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export default function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  // Base UI portals its popup after the open state commits, so a plain ref is
  // still null when the picker effect runs. Track the node via a callback ref
  // and let its state update re-run the effect once the popup has mounted.
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !host) return;
    let cancelled = false;
    let picker: HTMLElement | undefined;
    setLoading(true);
    loadPicker()
      .then(({ Picker }) => {
        if (cancelled) return;
        // emoji-mart mounts an <em-emoji-picker> custom element; its shipped types
        // don't expose the HTMLElement surface, so narrow it here.
        picker = new Picker({
          data: pickerData,
          theme: "auto",
          dynamicWidth: true,
          emojiButtonSize: 34,
          emojiSize: 24,
          previewPosition: "none",
          maxFrequentRows: 2,
          onEmojiSelect: (emoji: { native: string }) => {
            onChange(emoji.native);
            setOpen(false);
          },
        }) as unknown as HTMLElement;
        host.appendChild(picker);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      picker?.remove();
    };
  }, [open, host, onChange]);

  const isDefault = isDefaultAvatar(value);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-auto w-full justify-start gap-3 p-2.5"
        onClick={() => setOpen(true)}
      >
        <DealerAvatar emoji={value} size="md" />
        <span className="flex min-w-0 flex-col items-start">
          <span className="text-sm font-medium">
            {isDefault ? "Default avatar" : "Emoji avatar"}
          </span>
          <span className="text-xs text-muted-foreground">
            {isDefault ? "Choose an emoji or keep the default" : `${value} · Change`}
          </span>
        </span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b p-4 pb-3">
            <DialogTitle>Choose avatar</DialogTitle>
          </DialogHeader>
          <div className="shrink-0 border-b p-2">
            <Button
              type="button"
              variant={isDefault ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                onChange("💬");
                setOpen(false);
              }}
            >
              Use default avatar
            </Button>
          </div>
          <div
            ref={setHost}
            className="min-h-0 flex-1 overflow-auto [&_em-emoji-picker]:!w-full [&_em-emoji-picker]:!max-w-full [&_em-emoji-picker]:!h-[min(60dvh,28rem)]"
          >
            {loading && <span className="block p-4 text-sm text-muted-foreground">Loading…</span>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
