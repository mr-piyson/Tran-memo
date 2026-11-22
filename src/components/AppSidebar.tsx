import Logo from "@/assets/Logo";
import {
  MessageCircleIcon,
  PlusIcon,
  ReceiptTextIcon,
  SettingsIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  onDealers: () => void;
  onNewDealer: () => void;
  onNewNote: () => void;
  onSettings: () => void;
}

export default function AppSidebar({
  onDealers,
  onNewDealer,
  onNewNote,
  onSettings,
}: AppSidebarProps) {
  const { setOpenMobile } = useSidebar();

  const run = (action: () => void) => {
    setOpenMobile(false);
    action();
  };

  return (
    // The sidebar is position:fixed, so it escapes the app shell's safe-area
    // padding. Re-apply it here (left/top/bottom are the relevant edges).
    <Sidebar
      collapsible="icon"
      className="pt-[var(--safe-area-inset-top)] pb-[var(--safe-area-inset-bottom)] pl-[var(--safe-area-inset-left)]"
    >
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1">
          <Logo
            width="26"
            height="30"
            primaryColor="var(--primary)"
            title=""
            className="shrink-0"
          />
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">Ledger Notes</span>
            <span className="truncate text-xs text-sidebar-foreground/70">
              Money tracker
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Dealers" isActive onClick={() => run(onDealers)}>
                  <MessageCircleIcon />
                  <span>Dealers</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="New dealer" onClick={() => run(onNewDealer)}>
                  <PlusIcon />
                  <span>New dealer</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="New ledger note" onClick={() => run(onNewNote)}>
                  <ReceiptTextIcon />
                  <span>New ledger note</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Settings" onClick={() => run(onSettings)}>
                  <SettingsIcon />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-accent-foreground">
            LN
          </div>
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium">Local profile</span>
            <span className="truncate text-xs text-sidebar-foreground/70">
              This device
            </span>
          </div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
