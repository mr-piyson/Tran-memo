import { useEffect, useState } from "react";
import data from "@emoji-mart/data";
import { init, Picker } from "emoji-mart";
import { DealerAvatar, isDefaultAvatar } from "@/components/LedgerPanels";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

init({ data });

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

  useEffect(() => {
    if (!open || !host) return;
    // emoji-mart mounts an <em-emoji-picker> custom element; its shipped types
    // don't expose the HTMLElement surface, so narrow it here.
    const picker = new Picker({
      data,
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
    return () => picker.remove();
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
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
