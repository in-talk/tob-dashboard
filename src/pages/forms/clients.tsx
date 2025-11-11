"use client";

import { Trash2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { deleteClientAlert, usersComponentData } from "@/constants";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Client } from "@/types/client";
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
import CreateUpdateClient from "@/components/CreateUpdateClient";
import { withAuth } from "@/utils/auth";
import { GetServerSideProps } from "next";
import { Campaign } from "../keyword_finder";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { User } from "@/types/user";
import { fetcher } from "@/utils/fetcher";

function Clients() {
  const {
    data: clients,
    error,
    isLoading,
  } = useSWR<Client[]>("/api/clients", fetcher, {
    revalidateOnFocus: false,
  });

  const { data: campaigns } = useSWR<Campaign[]>(
    "/api/fetchCampaigns",
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const { data: users } = useSWR<User[]>("/api/get-users", fetcher, {
    revalidateOnFocus: false,
  });

  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    return clients.filter((client) => {
      const matchesUser = selectedUser
        ? client.user_name.toString() === selectedUser
        : true;
      const matchesCampaign = selectedCampaign
        ? client.campaign_code.toString() === selectedCampaign
        : true;
      return matchesUser && matchesCampaign;
    });
  }, [clients, selectedUser, selectedCampaign]);

  const handleDelete = async (clientId: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ client_id: clientId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          variant: "destructive",
          description: data.error || "Failed to delete client",
        });
      } else {
        toast({
          variant: "success",
          description: "Client deleted successfully",
        });
        mutate("/api/clients");
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
      username: { minWidth: "150px" },
      clientId: { minWidth: "50px" },
      actions: { minWidth: "80px" },
    }),
    []
  );

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-full bg-white dark:bg-sidebar">
        <div className="relative w-12 h-12 top-[0px]">
          <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
          <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-ping opacity-25"></div>
        </div>
      </div>
    );

  if (error) return <div>{usersComponentData.error}</div>;

  const clientTemplate = (rowData: Client) => (
    <div className="flex flex-col">
      <span className="text-xs text-gray-800 dark:text-gray-100">
        #{rowData.client_id}
      </span>
      <span className="font-medium text-sm  text-gray-800 dark:text-gray-100">
        {rowData.name}
      </span>
    </div>
  );

  const campaignTemplate = (rowData: Client) => (
    <div className="flex flex-col">
      <span className="font-medium text-sm  text-gray-800 dark:text-gray-100">
        {rowData.campaign_name} - {rowData.campaign_code}
      </span>
    </div>
  );

  const emailUsernameTemplate = (rowData: Client) => (
    <div className="flex flex-col">
      <span className="font-medium text-sm  text-gray-800 dark:text-gray-100">
        {rowData.user_name}
      </span>
      <span className="text-sm text-gray-800 dark:text-gray-100">
        {rowData.user_email}
      </span>
    </div>
  );

  const activeTemplate = (rowData: Client) => (
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

  const dateTemplate = (rowData: Client) => {
    const date = new Date(rowData.created_at);
    return (
      <span className="text-sm text-gray-800 dark:text-gray-100">
        {date.toLocaleDateString()} {date.toLocaleTimeString()}
      </span>
    );
  };

  const actionsTemplate = (
    rowData: Client,
    campaigns: Campaign[] | undefined,
    users: User[] | undefined
  ) => {
    const initialData = {
      user_id: rowData.user_id,
      campaign_id: rowData.campaign_id,
      model: rowData.model,
      version: rowData.version,
      is_active: rowData.is_active,
      number_of_lines: rowData.number_of_lines,
      name: rowData.name,
      updated_by: rowData.updated_by,
      description: rowData.description,
      vicidial_address: rowData.vicidial_address,
      vicidial_address_folder: rowData.vicidial_address_folder,
      vicidial_transfer_address_folder: rowData.vicidial_transfer_address_folder,
      age_limit: rowData.age_limit,
      vicidial_api_user: rowData.vicidial_api_user,
      vicidial_api_password: rowData.vicidial_api_password,
      transfer_group_name: rowData.transfer_group_name,
      vicidial_transfer_address: rowData.vicidial_transfer_address,
      vicidial_transfer_api_user: rowData.vicidial_transfer_api_user,
      vicidial_transfer_api_pass: rowData.vicidial_transfer_api_pass,
      vicidial_transfer_user: rowData.vicidial_transfer_user,
    };

    return (
      <div className="flex justify-center space-x-2">
        <CreateUpdateClient
          mode="update"
          initialData={initialData}
          client_id={rowData.client_id}
          campaigns={campaigns}
          users={users}
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
                {deleteClientAlert.dialog.title}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleteClientAlert.dialog.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {deleteClientAlert.dialog.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDelete(rowData.client_id)}
              >
                {deleteClientAlert.dialog.confirmDelete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  };

  return (
    <div className="px-6">
      <div className="flex justify-between items-center my-2">
        <div className="flex gap-4">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by User" />
            </SelectTrigger>
            <SelectContent>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.name}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by Campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns?.map((c) => (
                <SelectItem
                  key={c.campaign_id}
                  value={c.campaign_code.toString()}
                >
                  {c.campaign_name}- {c.campaign_code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedUser("");
              setSelectedCampaign("");
            }}
          >
            Clear Filters
          </Button>
        </div>
        <CreateUpdateClient mode="create" campaigns={campaigns} users={users} />
      </div>

      <div className="bg-gray-100 px-6 py-4 shadow-lg dark:bg-sidebar rounded-xl border">
        <DataTable
          value={filteredClients || []}
          scrollable
          scrollHeight="550px"
          tableStyle={{ minWidth: "600px" }}
          showGridlines
          pt={ptConfig}
          size="normal"
          removableSort
        >
          <Column
            field="user"
            header="User"
            body={emailUsernameTemplate}
            style={{ ...columnStyles.base, width: "10%" }}
          />
          <Column
            header="Client"
            body={clientTemplate}
            style={{ ...columnStyles.base, width: "15%" }}
          />

          <Column
            field="campaign"
            header="Campaign"
            body={campaignTemplate}
            style={{ ...columnStyles.base, width: "10%" }}
          />
          <Column
            field="model"
            header="M"
            sortable
            body={(rowData: Client) => (
              <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                {rowData.model}
              </span>
            )}
            style={{ ...columnStyles.base }}
          />
          <Column
            field="version"
            header="V"
            sortable
            body={(rowData: Client) => (
              <span className="text-gray-800 text-sm dark:text-gray-100">
                {rowData.version}
              </span>
            )}
            style={{ ...columnStyles.base }}
          />
          <Column
            header="Status"
            body={activeTemplate}
            style={{ ...columnStyles.base }}
          />
          <Column
            field="number_of_lines"
            header="Lines"
            body={(rowData: Client) => (
              <span className="text-gray-800 text-sm dark:text-gray-100">
                {rowData.number_of_lines}
              </span>
            )}
            style={{ ...columnStyles.base }}
          />
          <Column
            header="Created At"
            body={dateTemplate}
            style={{ ...columnStyles.base, width: "15%" }}
          />

          <Column
            header="Actions"
            body={(rowData) => actionsTemplate(rowData, campaigns, users)}
            align="center"
            style={{ ...columnStyles.base, width: "10%" }}
          />
        </DataTable>
      </div>
    </div>
  );
}

export default Clients;

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);
