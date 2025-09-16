import {
  Atom,
  LayoutDashboard,
  ChartArea,
  AudioLines,
  User,
  Blocks,
} from "lucide-react";
import { Campaign } from "@/lib/utils";


export const sideBarData = {
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