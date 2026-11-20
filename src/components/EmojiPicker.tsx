import { useEffect, useState } from "react";
import data from "@emoji-mart/data";
import { init, Picker } from "emoji-mart";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
      perLine: 8,
      emojiButtonSize: 32,
      emojiSize: 22,
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" className="h-auto w-full justify-start p-2.5" />
        }
      >
        <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-2xl">
          {value}
        </span>
        <span className="text-sm text-muted-foreground">{value} · Change emoji</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div ref={setHost} className="overflow-hidden rounded-lg" />
      </PopoverContent>
    </Popover>
  );
}
