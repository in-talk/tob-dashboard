import {
  Atom,
  LayoutDashboard,
  ChartArea,
  AudioLines,
  User,
  Blocks,
  FormInputIcon,
  FileText,
  Network,
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
          title: "Add/View Clients",
          url: "/forms/clients",
        },
        {
          title: "Add/View Agents",
          url: "/forms/agents",
        },
        {
          title: "Add/View Models",
          url: "/forms/models",
        },
        {
          title: "Add/View Campaigns",
          url: "/forms/campaigns",
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
      name: "Network",
      url: "/network",
      icon: Network,
      items: [
        { title: "Kamailio Servers", url: "/network/kamailio" },
        { title: "Client IPs", url: "/network/client-ips" },
        { title: "Kamailio ↔ Client IPs", url: "/network/kamailio-client-ips" },
        { title: "Asterisk Machines", url: "/network/asterisk" },
        { title: "Kamailio ↔ Asterisk", url: "/network/kamailio-asterisk" },
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
          title: `CGM Pills - ${Campaign.CGM_PILLS}`,
          url: "/label_managment/?CGM_PILLS",
        },
        {
          title: `ACA - ${Campaign.ACA}`,
          url: "/label_managment/?ACA",
        },
        {
          title: `MP(Mortgage protection) - ${Campaign.MP}`,
          url: "/label_managment/?MP",
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
          title: `FE V2 - ${Campaign.FEV2}`,
          url: "/label_managment/?FEV2",
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
        {
          title: "Age Mechanism",
          url: "/age-mechanism",
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
