import * as React from "react";
import {
  Frame,
  GalleryVerticalEnd,
  Atom,
  LayoutDashboard,
  AudioLines
} from "lucide-react";
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

const data = {
  user: {
    name: "In Talk",
    email: "abc@example.com",
    avatar: "/boy.png",
  },
  clients: [
    {
      name: "In Talk",
      logo: Atom,
    },
  ],
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: LayoutDashboard,
      isActive: true,
      items: [
        {
          title: "Audio Formatter",
          url: "/audio-formatter",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Documents",
          url: "#",
        },
      ],
    },

    {
      title: "Audio Formatter",
      url: "/audio-formatter",
      icon: AudioLines,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Home",
      url: "/",
      icon: LayoutDashboard,
    },
    {
      name: "Audio Formatter",
      url: "/audio-formatter",
      icon: AudioLines,
    },
    {
      name: "Design",
      url: "#",
      icon: Frame,
    },
    {
      name: "Quantumwhile",
      url: "#",
      icon: GalleryVerticalEnd,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  
  return (
    <Sidebar collapsible="icon" {...props}>
     <SidebarHeader>
        <ClientSwitcher clients={data.clients} />
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
