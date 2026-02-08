"use client";

import { Search, Trash2, X, Check, ChevronsUpDown } from "lucide-react";
import React, { useMemo, useState, useCallback } from "react";
import useSWR, { mutate } from "swr";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { withAuth } from "@/utils/auth";
import { GetServerSideProps } from "next";
import { fetcher } from "@/utils/fetcher";
import { Client } from "@/types/client";
import { Agent } from "@/types/agent";

type AssignedAgent = {
  client_id: string;
  agent_id: string;
  agent_name: string;
  is_active: boolean;
};

function ClientAgents() {
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientSearch, setClientSearch] = useState("");
  const [agentSearch, setAgentSearch] = useState("");
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch clients list
  const { data: clients } = useSWR<Client[]>("/api/clients", fetcher, {
    revalidateOnFocus: false,
  });

  // Fetch all agents
  const { data: agents } = useSWR<Agent[]>("/api/agents", fetcher, {
    revalidateOnFocus: false,
  });

  // Fetch assigned agents for selected client
  const {
    data: assignedAgents,
    error,
    isLoading,
  } = useSWR<AssignedAgent[]>(
    selectedClientId
      ? `/api/client-agents?client_id=${selectedClientId}`
      : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Selected client details
  const selectedClient = useMemo(() => {
    if (!clients || !selectedClientId) return null;
    return clients.find(
      (c) => c.client_id.toString() === selectedClientId
    ) || null;
  }, [clients, selectedClientId]);

  const selectedClientName = selectedClient?.name || "";
  const selectedClientCampaignId = selectedClient?.campaign_id?.toString() || "";

  // Get agent IDs that are already assigned
  const assignedAgentIds = useMemo(() => {
    if (!assignedAgents) return new Set<string>();
    return new Set(assignedAgents.map((a) => a.agent_id.toString()));
  }, [assignedAgents]);

  // Available agents (not yet assigned + same campaign as client)
  const availableAgents = useMemo(() => {
    if (!agents || !selectedClientCampaignId) return [];
    return agents.filter(
      (a) =>
        !assignedAgentIds.has(a.agent_id.toString()) &&
        a.campaign_id?.toString() === selectedClientCampaignId
    );
  }, [agents, assignedAgentIds, selectedClientCampaignId]);

  // Filtered available agents based on search
  const filteredAvailableAgents = useMemo(() => {
    if (!agentSearch.trim()) return availableAgents;
    return availableAgents.filter((a) =>
      a.agent_name?.toLowerCase().includes(agentSearch.toLowerCase())
    );
  }, [availableAgents, agentSearch]);

  // Filtered clients for dropdown search
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!clientSearch.trim()) return clients;
    return clients.filter((c) =>
      c.name?.toLowerCase().includes(clientSearch.toLowerCase())
    );
  }, [clients, clientSearch]);

  // Toggle agent selection
  const toggleAgent = useCallback((agentId: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  }, []);

  // Select all visible agents
  const selectAll = useCallback(() => {
    const allIds = filteredAvailableAgents.map((a) => a.agent_id.toString());
    setSelectedAgentIds((prev) => {
      const newSet = new Set(prev);
      allIds.forEach((id) => newSet.add(id));
      return Array.from(newSet);
    });
  }, [filteredAvailableAgents]);

  // Deselect all
  const deselectAll = useCallback(() => {
    setSelectedAgentIds([]);
  }, []);

  // Assign selected agents
  const handleAssign = async () => {
    if (!selectedClientId || selectedAgentIds.length === 0) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/client-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: selectedClientId,
          agent_ids: selectedAgentIds,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        toast({
          variant: "destructive",
          description: data.error || "Failed to assign agents",
        });
        return;
      }

      toast({
        variant: "success",
        description: data.message || "Agents assigned successfully",
      });
      setSelectedAgentIds([]);
      mutate(`/api/client-agents?client_id=${selectedClientId}`);
    } catch (err) {
      console.error("Assign failed:", err);
      toast({
        variant: "destructive",
        description: "Something went wrong",
      });
    } finally {
      setAssigning(false);
    }
  };

  // Unassign agent
  const handleUnassign = async (agentId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/client-agents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: selectedClientId,
          agent_id: agentId,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        toast({
          variant: "destructive",
          description: data.error || "Failed to unassign agent",
        });
        return;
      }

      toast({
        variant: "success",
        description: "Agent unassigned successfully",
      });
      mutate(`/api/client-agents?client_id=${selectedClientId}`);
    } catch (err) {
      console.error("Unassign failed:", err);
      toast({
        variant: "destructive",
        description: "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  // PrimeReact table config
  const ptConfig = useMemo(
    () => ({
      header: { className: "bg-white dark:bg-sidebar" },
      thead: { className: "dark:bg-sidebar" },
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
    }),
    []
  );

  // Filter assigned agents table
  const filteredAssigned = useMemo(() => {
    if (!assignedAgents) return [];
    if (!searchTerm.trim()) return assignedAgents;
    return assignedAgents.filter((a) =>
      a.agent_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [assignedAgents, searchTerm]);

  // Table templates
  const agentIdTemplate = (rowData: AssignedAgent) => (
    <span className="text-sm text-gray-800 dark:text-gray-100">
      # {rowData.agent_id}
    </span>
  );

  const agentNameTemplate = (rowData: AssignedAgent) => (
    <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
      {rowData.agent_name}
    </span>
  );

  const statusTemplate = (rowData: AssignedAgent) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-semibold ${
        rowData.is_active
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {rowData.is_active ? "Active" : "Inactive"}
    </span>
  );

  const actionsTemplate = (rowData: AssignedAgent) => (
    <div className="flex justify-center">
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
            <AlertDialogTitle>Unassign Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unassign &quot;{rowData.agent_name}&quot;
              from this client? This action can be undone by reassigning.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleUnassign(rowData.agent_id.toString())}
            >
              Unassign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <div className="px-6">
      {/* Header: Client selector */}
      <div className="flex flex-col gap-4 my-4">
        <div className="flex items-center gap-4">
          <div className="w-80">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
              Select Client
            </label>
            <Select
              value={selectedClientId}
              onValueChange={(val) => {
                setSelectedClientId(val);
                setSelectedAgentIds([]);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 pb-2">
                  <Input
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="h-8"
                  />
                </div>
                {filteredClients?.map((client) => (
                  <SelectItem
                    key={client.client_id}
                    value={client.client_id.toString()}
                  >
                    {client.name} (#{client.client_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClient && (
            <div className="mt-5 flex items-center gap-3">
              <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Client: {selectedClientName}
                </span>
              </div>
              <div className="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Campaign: {selectedClient.campaign_name || `#${selectedClient.campaign_id}`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedClientId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left Panel: Available agents multi-select */}
          <div className="bg-gray-100 dark:bg-sidebar rounded-xl border shadow-lg p-4">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
              Available Agents
            </h3>

            {/* Search + actions */}
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search agents..."
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={filteredAvailableAgents.length === 0}
              >
                <Check className="h-3 w-3 mr-1" />
                All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAll}
                disabled={selectedAgentIds.length === 0}
              >
                <X className="h-3 w-3 mr-1" />
                None
              </Button>
            </div>

            {/* Agent checklist */}
            <div className="max-h-[400px] overflow-y-auto border rounded-md bg-white dark:bg-gray-800">
              {filteredAvailableAgents.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  {availableAgents.length === 0
                    ? "No more agents available for this campaign"
                    : "No agents match your search"}
                </div>
              ) : (
                filteredAvailableAgents.map((agent) => (
                  <label
                    key={agent.agent_id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0 border-gray-100 dark:border-gray-700"
                  >
                    <Checkbox
                      checked={selectedAgentIds.includes(
                        agent.agent_id.toString()
                      )}
                      onCheckedChange={() =>
                        toggleAgent(agent.agent_id.toString())
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100 block truncate">
                        {agent.agent_name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        #{agent.agent_id}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        agent.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {agent.is_active ? "Active" : "Inactive"}
                    </span>
                  </label>
                ))
              )}
            </div>

            {/* Assign button */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selectedAgentIds.length} agent(s) selected
              </span>
              <Button
                onClick={handleAssign}
                disabled={selectedAgentIds.length === 0 || assigning}
              >
                {assigning ? "Assigning..." : "Assign Selected"}
              </Button>
            </div>
          </div>

          {/* Right Panel: Currently assigned agents table */}
          <div className="bg-gray-100 dark:bg-sidebar rounded-xl border shadow-lg p-4">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">
              Assigned Agents
              {assignedAgents && (
                <span className="ml-2 text-xs font-normal text-gray-500">
                  ({assignedAgents.length} total)
                </span>
              )}
            </h3>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search assigned agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="relative w-12 h-12">
                  <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
                  <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-ping opacity-25"></div>
                </div>
              </div>
            ) : error ? (
              <div className="text-center text-red-500 py-4">
                Failed to load assigned agents
              </div>
            ) : (
              <DataTable
                value={filteredAssigned || []}
                scrollable
                scrollHeight="400px"
                tableStyle={{ minWidth: "400px" }}
                showGridlines
                pt={ptConfig}
                size="small"
                removableSort
              >
                <Column
                  header="Agent Id"
                  body={agentIdTemplate}
                  style={{ ...columnStyles.base, width: "20%" }}
                />
                <Column
                  header="Agent Name"
                  body={agentNameTemplate}
                  style={{ ...columnStyles.base, width: "35%" }}
                />
                <Column
                  header="Status"
                  body={statusTemplate}
                  style={{ ...columnStyles.base, width: "20%" }}
                />
                <Column
                  header="Actions"
                  body={actionsTemplate}
                  align="center"
                  style={{ ...columnStyles.base, width: "25%" }}
                />
              </DataTable>
            )}
          </div>
        </div>
      )}

      {!selectedClientId && (
        <div className="flex flex-col items-center justify-center h-[400px] text-gray-400 dark:text-gray-500">
          <ChevronsUpDown className="h-12 w-12 mb-3" />
          <p className="text-lg font-medium">Select a client to manage agents</p>
          <p className="text-sm">
            Choose a client from the dropdown above to assign or unassign agents
          </p>
        </div>
      )}
    </div>
  );
}

export default ClientAgents;

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);
