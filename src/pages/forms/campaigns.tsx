"use client";

import { Edit, Search, Trash2 } from "lucide-react";
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
import CreateUpdateCampaign from "@/components/CreateUpdateCampaign";
import { Campaign } from "@/types/campaign";
import { fetcher } from "@/utils/fetcher";

function Campaigns() {
  const { data, error, isLoading } = useSWR<Campaign[]>(
    "/api/campaigns",
    fetcher,
    { revalidateOnFocus: false }
  );

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditOpen, setEditOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const handleDelete = async (campaignId: string | number) => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId }),
      });

      const result = await res.json();

      if (!result.ok) {
        toast({
          variant: "destructive",
          description: result.error || "Failed to delete campaign",
        });
        return;
      }

      toast({
        variant: "success",
        description: "Campaign deleted successfully",
      });
      mutate("/api/campaigns");
      mutate("/api/fetchCampaigns");
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

  const filteredCampaigns = useMemo(() => {
    if (!data) return [];
    if (!searchTerm.trim()) return data;
    const q = searchTerm.toLowerCase();
    return data.filter(
      (c) =>
        c.campaign_name?.toLowerCase().includes(q) ||
        c.campaign_code?.toString().includes(q)
    );
  }, [data, searchTerm]);

  const campaignIdTemplate = (rowData: Campaign) => (
    <span className="text-sm text-gray-800 dark:text-gray-100">
      # {rowData.campaign_id}
    </span>
  );

  const campaignNameTemplate = (rowData: Campaign) => (
    <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
      {rowData.campaign_name}
    </span>
  );

  const campaignCodeTemplate = (rowData: Campaign) => (
    <span className="text-sm text-gray-800 dark:text-gray-100">
      {rowData.campaign_code ?? "-"}
    </span>
  );

  const extensionTemplate = (rowData: Campaign) => (
    <span className="text-sm text-gray-800 dark:text-gray-100">
      {rowData.extension || "-"}
    </span>
  );

  const greetingTemplate = (rowData: Campaign) => (
    <span className="text-sm text-gray-800 dark:text-gray-100 line-clamp-2">
      {rowData.greeting_label || "-"}
    </span>
  );

  const noTranscriptionTemplate = (rowData: Campaign) => (
    <span className="text-sm text-gray-800 dark:text-gray-100 line-clamp-2">
      {rowData.no_transcription_label || "-"}
    </span>
  );

  const descriptionTemplate = (rowData: Campaign) => (
    <span className="text-sm text-gray-800 dark:text-gray-100 line-clamp-2">
      {rowData.campaign_description || "-"}
    </span>
  );

  const activeTemplate = (rowData: Campaign) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-semibold ${
        rowData.isactive
          ? "bg-green-100 text-green-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {rowData.isactive ? "Active" : "Inactive"}
    </span>
  );

  const actionsTemplate = (rowData: Campaign) => {
    return (
      <div className="flex justify-center space-x-2">
        <Button
          variant="ghost"
          onClick={() => {
            setEditingCampaign(rowData);
            setEditOpen(true);
          }}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <div>
              <Button
                disabled={loading}
                variant="ghost"
                className="text-white bg-red-700 hover:bg-red-900 hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this campaign? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(rowData.campaign_id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };

  if (error) return <div>Failed to load campaigns.</div>;

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
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:max-w-sm pl-8"
          />
        </div>
        <CreateUpdateCampaign mode="create" />
      </div>

      <CreateUpdateCampaign
        mode="update"
        open={isEditOpen}
        onOpenChange={setEditOpen}
        initialData={
          editingCampaign
            ? {
                campaign_name: editingCampaign.campaign_name,
                campaign_description:
                  editingCampaign.campaign_description ?? "",
                greeting_label: editingCampaign.greeting_label ?? "",
                no_transcription_label:
                  editingCampaign.no_transcription_label ?? "",
                isactive: editingCampaign.isactive,
                campaign_code:
                  editingCampaign.campaign_code != null
                    ? editingCampaign.campaign_code.toString()
                    : "",
                extension: editingCampaign.extension ?? "",
              }
            : {}
        }
        campaignId={editingCampaign?.campaign_id?.toString()}
      />

      <div className="bg-gray-100 px-3 sm:px-6 py-4 shadow-lg dark:bg-sidebar rounded-xl border overflow-x-auto">
        <DataTable
          value={filteredCampaigns || []}
          scrollable
          scrollHeight="550px"
          tableStyle={{ minWidth: "900px" }}
          showGridlines
          pt={ptConfig}
          size="normal"
          removableSort
        >
          <Column
            header="Campaign Id"
            body={campaignIdTemplate}
            style={{ ...columnStyles.base, width: "8%" }}
          />
          <Column
            header="Name"
            body={campaignNameTemplate}
            style={{ ...columnStyles.base, width: "15%" }}
          />
          <Column
            header="Code"
            body={campaignCodeTemplate}
            style={{ ...columnStyles.base, width: "8%" }}
          />
          <Column
            header="Extension"
            body={extensionTemplate}
            style={{ ...columnStyles.base, width: "10%" }}
          />
          <Column
            header="Greeting Label"
            body={greetingTemplate}
            style={{ ...columnStyles.base, width: "12%" }}
          />
          <Column
            header="No Transcription Label"
            body={noTranscriptionTemplate}
            style={{ ...columnStyles.base, width: "12%" }}
          />
          <Column
            header="Description"
            body={descriptionTemplate}
            style={{ ...columnStyles.base, width: "17%" }}
          />
          <Column
            header="Status"
            body={activeTemplate}
            style={{ ...columnStyles.base, width: "8%" }}
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

export default Campaigns;

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);
