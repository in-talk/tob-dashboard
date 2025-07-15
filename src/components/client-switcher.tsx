import * as React from "react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function ClientSwitcher({
  clients,
}: {
  clients: {
    name: string;
    logo: React.ElementType;
  }[];
}) {
  const { toggleSidebar } = useSidebar();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeClient, setActiveClient] = React.useState(clients[0]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          onClick={toggleSidebar}
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#3b65f5] text-sidebar-primary-foreground">
            <activeClient.logo className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{activeClient.name}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
