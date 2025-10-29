"use client";

import { Search, Trash2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { withAuth } from "@/utils/auth";
import { GetServerSideProps } from "next";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

// custom dialog text (same as agents)
import { deleteAgentAlert } from "@/constants";
import CreateUpdateAgentByCampaign from "@/components/CreateUpdateAgentByCamapaign";
import { Agent } from "@/types/agent";
import { Campaign } from "@/types/campaign";
import { fetcher } from "@/utils/fetcher";

// types
export interface AgentByCampaign {
  id: string;
  agent_id: string;
  agent_name: string;
  campaign_id: string;
  campaign_name: string;
  is_active: boolean;
  updated_at: string;
}

function AgentByCampaign() {
  //   const { data, error, isLoading } = useSWR<AgentByCampaign[]>(
  //     "/api/agents-by-campaign",
  //     fetcher,
  //     { revalidateOnFocus: false }
  //   );

  const data: AgentByCampaign[] = [
    {
      id: "3",
      agent_name: "miranda",
      agent_id: "3",
      campaign_id: "1",
      campaign_name: "CGM",
      is_active: false,
      updated_at: "2025-05-08T15:15:43.904716+00:00",
    },
    {
      id: "5",
      agent_name: "megan",
      agent_id: "5",
      campaign_id: "2",
      campaign_name: "ACA",
      is_active: true,
      updated_at: "2025-08-15T17:39:26.442812+00:00",
    },
    {
      id: "7",
      agent_name: "lilly",
      agent_id: "7",
      campaign_id: "4",
      campaign_name: "MVA",
      is_active: true,
      updated_at: "2025-08-30T13:07:06.418833+00:00",
    },
    {
      id: "4",
      agent_name: "julia",
      agent_id: "4",
      campaign_id: "2",
      campaign_name: "ACA",
      is_active: true,
      updated_at: "2025-08-05T12:50:34.276867+00:00",
    },
    {
      id: "6",
      agent_name: "jessica",
      agent_id: "6",
      campaign_id: "3",
      campaign_name: "FE",
      is_active: true,
      updated_at: "2025-08-26T15:31:26.473877+00:00",
    },
    {
      id: "1",
      agent_name: "amily",
      agent_id: "1",
      campaign_id: "1",
      campaign_name: "CGM",
      is_active: true,
      updated_at: "2025-05-08T13:58:44.095958+00:00",
    },
  ];

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: campaigns } = useSWR<Campaign[]>(
    "/api/fetchCampaigns",
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const { data: agents } = useSWR<Agent[]>("/api/agents", fetcher, {
    revalidateOnFocus: false,
  });

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/agents-by-campaign", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const response = await res.json();
      if (!res.ok) {
        toast({
          variant: "destructive",
          description: response.error || "Failed to delete record",
        });
      } else {
        toast({
          variant: "success",
          description: "Relation deleted successfully",
        });
        mutate("/api/agents-by-campaign");
      }
    } catch (err) {
      console.error("Delete failed:", err);
      toast({
        variant: "destructive",
        description: "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  const ptConfig = useMemo(
    () => ({
      header: { className: "bg-white dark:bg-sidebar" },
      thead: { className: "dark:bg-sidebar " },
      tbody: { className: "dark:bg-sidebar" },
      headerRow: {
        className: "border-b dark:bg-sidebar text-sm border-gray-200 pb-2",
      },
      emptyMessage: { className: "dark:bg-sidebar" },
      bodyRow: {
        className:
          "border-b border-gray-200 dark:bg-sidebar dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
      },
    }),
    []
  );

  const columnStyles = useMemo(
    () => ({
      base: { padding: "8px", background: "transparent" },
      actions: { minWidth: "80px" },
    }),
    []
  );

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(
      (row) =>
        row.agent_name.toLowerCase().includes(term) ||
        row.campaign_name.toLowerCase().includes(term)
    );
  }, [data, searchTerm]);

  const idTemplate = (row: AgentByCampaign) => (
    <span className="text-sm text-gray-800 dark:text-gray-100">#{row.id}</span>
  );

  const agentTemplate = (row: AgentByCampaign) => (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-xs text-gray-800 dark:text-gray-100">
        # {row.agent_id}
      </span>
      <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
        {row.agent_name}
      </span>
    </div>
  );

  const campaignTemplate = (row: AgentByCampaign) => (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-xs text-gray-800 dark:text-gray-100">
        # {row.campaign_id}
      </span>
      <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
        {row.campaign_name}
      </span>
    </div>
  );

  const activeTemplate = (row: AgentByCampaign) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-semibold ${
        row.is_active
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {row.is_active ? "Active" : "Inactive"}
    </span>
  );

  const dateTemplate = (row: AgentByCampaign) => {
    const date = new Date(row.updated_at);
    return (
      <span className="text-sm text-gray-800 dark:text-gray-100">
        {date.toLocaleDateString()} {date.toLocaleTimeString()}
      </span>
    );
  };

  const actionsTemplate = (row: AgentByCampaign) => {
    const initialData = {
      agent_id: row.agent_id,
      campaign_id: row.campaign_id,
      is_active: row.is_active,
    };

    return (
      <div className="flex justify-center space-x-2">
        <CreateUpdateAgentByCampaign
          mode="update"
          initialData={initialData}
          recordId={row.id}
          agents={agents}
          campaigns={campaigns}
        />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              disabled={loading}
              variant="ghost"
              className="text-white bg-red-700 hover:bg-red-900 hover:text-white"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleteAgentAlert.dialog.title}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteAgentAlert.dialog.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {deleteAgentAlert.dialog.cancel}
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDelete(row.id)}>
                {deleteAgentAlert.dialog.confirmDelete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };

  //   if (error) return <div>{usersComponentData.error}</div>;
  //   if (isLoading)
  //     return (
  //       <div className="flex justify-center items-center h-full bg-white dark:bg-sidebar">
  //         <div className="relative w-12 h-12 top-[0px]">
  //           <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
  //           <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-ping opacity-25"></div>
  //         </div>
  //       </div>
  //     );

  return (
    <div className="px-6">
      <div className="flex justify-between items-center my-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by agent or campaign..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm pl-8"
          />
        </div>
        <CreateUpdateAgentByCampaign
          mode="create"
          agents={agents}
          campaigns={campaigns}
        />
      </div>

      <div className="bg-gray-100 px-6 py-4 shadow-lg dark:bg-sidebar rounded-xl border">
        <DataTable
          value={filteredData || []}
          scrollable
          scrollHeight="550px"
          tableStyle={{ minWidth: "700px" }}
          showGridlines
          pt={ptConfig}
          size="normal"
          removableSort
        >
          <Column
            header="ID"
            body={idTemplate}
            style={{ ...columnStyles.base, width: "10%" }}
          />
          <Column
            header="Agent"
            body={agentTemplate}
            style={{ ...columnStyles.base, width: "20%" }}
          />
          <Column
            header="Campaign"
            body={campaignTemplate}
            style={{ ...columnStyles.base, width: "25%" }}
          />
          <Column
            header="Status"
            body={activeTemplate}
            style={{ ...columnStyles.base, width: "15%" }}
          />
          <Column
            header="Updated At"
            body={dateTemplate}
            style={{ ...columnStyles.base, width: "20%" }}
          />
          <Column
            header="Actions"
            body={(rowData) => actionsTemplate(rowData)}
            align="center"
            style={{ ...columnStyles.base, width: "10%" }}
          />
        </DataTable>
      </div>
    </div>
  );
}

export default AgentByCampaign;

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);
