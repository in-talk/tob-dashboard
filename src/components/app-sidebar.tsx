import * as React from "react";
import {
  Atom,
  LayoutDashboard,
  ChartArea,
  AudioLines,
  User,
  Blocks,
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
import { useSession } from "next-auth/react";
import { Campaign } from "@/lib/utils";

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
  projects: [
    {
      name: "Dashboard",
      url: "/",
      icon: ChartArea,
    },
    {
      name: "Users",
      url: "/users",
      icon: User,
    },
    {
      name: "Label Managment",
      url: "/label_managment",
      icon: LayoutDashboard,
      items: [
        {
          title: `CGM - ${Campaign.CGM}`,
          url: "/label_managment/?CGM",
        },
        {
          title: `ACA - ${Campaign.ACA}`,
          url: "/label_managment/?ACA",
        },
        {
          title: `SOLAR - ${Campaign.SOLAR}`,
          url: "/label_managment/?SOLAR",
        },
        {
          title: `FE - ${Campaign.FE}`,
          url: "/label_managment/?FE",
        },
        {
          title: `MVA - ${Campaign.MVA}`,
          url: "/label_managment/?MVA",
        },
      ],
    },
    {
      name: "Audio Formatter",
      url: "/audio-formatter",
      icon: AudioLines,
    },
    {
      name: "Admin Utilities",
      url: "/admin",
      icon: Blocks,
      items: [
        {
          title: "Keyword Finder",
          url: "/keyword_finder",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();

  const userRole = session?.user?.role;

  const filteredProjects = data.projects.filter((project) => {
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
        <ClientSwitcher clients={data.clients} />
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={filteredProjects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
