import { MessageCircleIcon, PlusIcon, SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RailProps {
  onNewNote: () => void;
  onSettings: () => void;
}

export default function Rail({ onNewNote, onSettings }: RailProps) {
  const itemClass = "h-12 w-16 flex-col gap-0.5 md:h-11 md:w-12";

  return (
    <nav
      aria-label="Tools"
      className="order-last flex h-14 w-full shrink-0 items-center justify-around border-t bg-background md:order-first md:h-full md:w-16 md:flex-col md:justify-start md:gap-2 md:border-r md:border-t-0 md:py-4"
    >
      <div className="hidden size-10 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-lg md:flex">
        L
      </div>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="secondary"
              aria-label="Notes"
              className={itemClass}
            />
          }
        >
          <MessageCircleIcon />
          <span className="text-[10px] font-medium md:hidden">Notes</span>
        </TooltipTrigger>
        <TooltipContent side="right">Notes</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={<Button aria-label="New note" className={itemClass} onClick={onNewNote} />}
        >
          <PlusIcon />
          <span className="text-[10px] font-medium md:hidden">New</span>
        </TooltipTrigger>
        <TooltipContent side="right">New note</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={<Button aria-label="Settings" className={itemClass} onClick={onSettings} />}
        >
          <SettingsIcon />
          <span className="text-[10px] font-medium md:hidden">Settings</span>
        </TooltipTrigger>
        <TooltipContent side="right">Settings</TooltipContent>
      </Tooltip>

      <div className="hidden size-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground md:mt-auto md:flex">
        LN
      </div>
    </nav>
  );
}
