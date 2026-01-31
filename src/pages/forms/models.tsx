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
import CreateUpdateModel from "@/components/CreateUpdateModel";
import { Campaign } from "@/types/campaign";
import { fetcher } from "@/utils/fetcher";
import { Model } from "@/types/model";

function Models() {
  const { data, error, isLoading } = useSWR<Model[]>("/api/models", fetcher, {
    revalidateOnFocus: false,
  }); // Error: permission denied for table models

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
  const [editingModel, setEditingModel] = useState<Model | null>(null);

  const handleDelete = async (modelId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/models", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model_id: modelId }),
      });

      const data = await res.json();

      if (!data.ok) {
        toast({
          variant: "destructive",
          description: data.error || "Failed to delete model",
        });
        return;
      } else {
        toast({
          variant: "success",
          description: "Model deleted successfully",
        });
        mutate("/api/models");
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

  const filteredModels = useMemo(() => {
    if (!data) return [];
    if (!searchTerm.trim()) return data;
    return data.filter((model) =>
      model.model_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  const modelIdTemplate = (rowData: Model) => (
    <span className="text-sm text-gray-800 dark:text-gray-100">
      # {rowData.model_id}
    </span>
  );

  const modelNameTemplate = (rowData: Model) => (
    <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
      {rowData.model_name}
    </span>
  );

  const campaignNameTemplate = (rowData: Model) => (
    <span className="text-sm text-gray-800 dark:text-gray-100">
      {rowData.campaign_name}
    </span>
  );

  const descriptionTemplate = (rowData: Model) => (
    <span className="text-sm text-gray-800 dark:text-gray-100 line-clamp-2">
      {rowData.description || "-"}
    </span>
  );

  const modelNumberTemplate = (rowData: Model) => (
    <span className="text-sm text-gray-800 dark:text-gray-100">
      {rowData.model_number}
    </span>
  );

  const actionsTemplate = (rowData: Model) => {
    return (
      <div className="flex justify-center space-x-2">
        <Button
          variant="ghost"
          onClick={() => {
            setEditingModel(rowData);
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
              <AlertDialogTitle>Delete Model</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this model? This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDelete(rowData.model_id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };

  if (error) return <div>Failed to load models.</div>;

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
    <div className="px-6">
      <div className="flex justify-between items-center my-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by model name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm pl-8"
          />
        </div>
        <CreateUpdateModel mode="create" campaigns={campaigns} />
      </div>

      <CreateUpdateModel
        mode="update"
        open={isEditOpen}
        onOpenChange={setEditOpen}
        initialData={editingModel ? {
          model_name: editingModel.model_name,
          description: editingModel.description,
          campaign_id: editingModel.campaign_id?.toString(),
          model_number: editingModel.model_number,
        } : {}}
        modelId={editingModel?.model_id}
        campaigns={campaigns}
      />

      <div className="bg-gray-100 px-6 py-4 shadow-lg dark:bg-sidebar rounded-xl border">
        <DataTable
          value={filteredModels || []}
          scrollable
          scrollHeight="550px"
          tableStyle={{ minWidth: "700px" }}
          showGridlines
          pt={ptConfig}
          size="normal"
          removableSort
        >
          <Column
            header="Model Id"
            body={modelIdTemplate}
            style={{ ...columnStyles.base, width: "10%" }}
          />
          <Column
            header="Model Number"
            body={modelNumberTemplate}
            style={{ ...columnStyles.base, width: "10%" }}
          />
          <Column
            header="Model Name"
            body={modelNameTemplate}
            style={{ ...columnStyles.base, width: "20%" }}
          />
          <Column
            header="Campaign Name"
            body={campaignNameTemplate}
            style={{ ...columnStyles.base, width: "20%" }}
          />
          <Column
            header="Description"
            body={descriptionTemplate}
            style={{ ...columnStyles.base, width: "30%" }}
          />

          <Column
            header="Actions"
            body={(rowData) => actionsTemplate(rowData)}
            align="center"
            style={{ ...columnStyles.base, width: "10%" }}
          />
        </DataTable>
      </div>
    </div >
  );
}

export default Models;

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);
