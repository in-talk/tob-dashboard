import {
  Atom,
  LayoutDashboard,
  ChartArea,
  AudioLines,
  User,
  Blocks,
  FormInputIcon,
  FileText,
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
      name: "Forms",
      url: "/forms",
      icon: FormInputIcon,
      items: [
        {
          title: "Add New Clients",
          url: "/forms/clients",
        },
        {
          title: "Add New Agents",
          url: "/forms/agents",
        },
        {
          title: "Assign Campaign to Agents",
          url: "/forms/agents-by-campaign",
        },
        {
          title: "Assign Clients to Users",
          url: "/forms/clients-by-user",
        },
        {
          title: "Add New Models",
          url: "/forms/models",
        },
        {
          title: "Assign Agents to Clients",
          url: "/forms/client-agents",
        },
        {
          title: "Add REC/Honeypot Numbers",
          url: "/forms/HPNumbers",
        },
      ],
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
          title: `FE (Final expense) - ${Campaign.FE}`,
          url: "/label_managment/?FE",
        },
        {
          title: `FE TEST (Final expense) - ${Campaign.FETEST}`,
          url: "/label_managment/?FETEST",
        },
        {
          title: `MVA - ${Campaign.MVA}`,
          url: "/label_managment/?MVA",
        },
        {
          title: `MC (Medicare) - ${Campaign.MC}`,
          url: "/label_managment/?MC",
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
        {
          title: "Bulk Keyword Finder",
          url: "/bulk_keyword_finder",
        },
        {
          title: "Age function analyzer",
          url: "/age_classifier",
        },
      ],
    },
    {
      name: "Reports",
      url: "/reports",
      icon: FileText,
      items: [
        {
          title: "Interactions Report",
          url: "/reports/interactions",
        },
      ],
    },
  ],
};
