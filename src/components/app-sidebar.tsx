import * as React from "react";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ClientSwitcher } from "./client-switcher";
import { useSession } from "next-auth/react";
import { sideBarData } from "@/constants/sidebarData";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();

  const userRole = session?.user?.role;

  const filteredProjects = sideBarData.projects.filter((project) => {
    if (userRole === "user") {
      return ![
        "/users",
        "/label_managment",
        "/audio-formatter",
        "/admin",
        "/keyword_finder",
      ].includes(project.url);
    }
    return true;
  });

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <ClientSwitcher clients={sideBarData.clients} />
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={filteredProjects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={sideBarData.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
