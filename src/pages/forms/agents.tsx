"use client";

import { Edit, Search, Trash2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { deleteAgentAlert, usersComponentData } from "@/constants";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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

import CreateUpdateAgent from "@/components/CreateUpdateAgent";
import { Agent } from "@/types/agent";
import { Campaign } from "@/types/campaign";
import { Input } from "@/components/ui/input";
import { fetcher } from "@/utils/fetcher";

function Agents() {
  const { data, error, isLoading } = useSWR<Agent[]>("/api/agents", fetcher, {
    revalidateOnFocus: false,
  });

  const { data: campaigns } = useSWR<Campaign[]>(
    "/api/fetchCampaigns",
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditOpen, setEditOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const handleDelete = async (agentId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/agents", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ agent_id: agentId }),
      });

      const data = await res.json();

      if (!data.ok) {
        toast({
          variant: "destructive",
          description: data.error || "Failed to delete agent",
        });
        return;
      } else {
        toast({
          variant: "success",
          description: "Agent deleted successfully",
        });
        mutate("/api/agents");
      }
    } catch (error) {
      console.error("Delete failed:", error);
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
        className: "border-b dark:bg-sidebar  text-sm border-gray-200 pb-2",
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

  const filteredAgents = useMemo(() => {
    if (!data) return [];
    if (!searchTerm.trim()) return data;
    return data.filter((agent) =>
      agent.agent_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const agentNameTemplate = (rowData: Agent) => (
    <span className="font-medium text-sm  text-gray-800 dark:text-gray-100">
      {rowData.agent_name}
    </span>
  );

  const agentIdTemplate = (rowData: Agent) => (
    <span className="text-sm text-gray-800 dark:text-gray-100">
      # {rowData.agent_id}
    </span>
  );

  const campaignTemplate = (rowData: Agent) => (
    <span className="text-sm text-gray-800 dark:text-gray-100">
      {rowData.campaign_name || "-"}
    </span>
  );

  const activeTemplate = (rowData: Agent) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-semibold ${rowData.is_active
        ? "bg-green-100 text-green-700"
        : "bg-red-100 text-red-700"
        }`}
    >
      {rowData.is_active ? "Active" : "Inactive"}
    </span>
  );

  const dateTemplate = (rowData: Agent) => {
    const date = new Date(rowData.created_at);
    return (
      <span className="text-sm text-gray-800dark:text-gray-100">
        {date.toLocaleDateString()} {date.toLocaleTimeString()}
      </span>
    );
  };

  const actionsTemplate = (rowData: Agent) => {
    return (
      <div className="flex justify-center space-x-2">
        <Button
          variant="ghost"
          onClick={() => {
            setEditingAgent(rowData);
            setEditOpen(true);
          }}
        >
          <Edit className="h-4 w-4" />
        </Button>
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
              <AlertDialogAction onClick={() => handleDelete(rowData.agent_id)}>
                {deleteAgentAlert.dialog.confirmDelete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };
  if (error) return <div>{usersComponentData.error}</div>;
  if (isLoading)
    return (
      <div className="flex justify-center items-center h-full bg-white dark:bg-sidebar">
        <div className="relative w-12 h-12 top-[0px]">
          <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
          <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-ping opacity-25"></div>
        </div>
      </div>
    );
  return (
    <div className="px-3 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 my-4">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by agent name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-sm pl-8"
          />
        </div>
        <CreateUpdateAgent mode="create" campaigns={campaigns} />
      </div>

      <CreateUpdateAgent
        mode="update"
        open={isEditOpen}
        onOpenChange={setEditOpen}
        initialData={editingAgent ?? {}}
        agentId={editingAgent?.agent_id}
        campaigns={campaigns}
      />

      <div className="bg-gray-100 px-3 sm:px-6 py-4 shadow-lg dark:bg-sidebar rounded-xl border overflow-x-auto">
        <DataTable
          value={filteredAgents || []}
          scrollable
          scrollHeight="550px"
          tableStyle={{ minWidth: "600px" }}
          showGridlines
          pt={ptConfig}
          size="normal"
          removableSort
        >
          <Column
            header="Agent Id"
            body={agentIdTemplate}
            style={{ ...columnStyles.base, width: "15%" }}
          />
          <Column
            header="Agent Name"
            body={agentNameTemplate}
            style={{ ...columnStyles.base, width: "15%" }}
          />
          <Column
            header="Campaign"
            body={campaignTemplate}
            style={{ ...columnStyles.base, width: "15%" }}
          />

          <Column
            header="Status"
            body={activeTemplate}
            style={{ ...columnStyles.base, width: "15%" }}
          />

          <Column
            header="Created At"
            body={dateTemplate}
            style={{ ...columnStyles.base, width: "15%" }}
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

export default Agents;

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);
