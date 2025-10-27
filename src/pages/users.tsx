"use client";

import { User } from "@/types/user";
import { Edit, Trash2 } from "lucide-react";
import React, { useMemo } from "react";
import useSWR from "swr";
import { usersComponentData } from "@/constants";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import CreateUser from "@/components/CreateUser";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function Users() {
  const {
    data: users,
    error,
    isLoading,
  } = useSWR<User[]>("/api/get-users", fetcher);

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
      base: { padding: "4px", background: "transparent" },
      username: { minWidth: "150px" },
      clientId: { minWidth: "50px" },
      role: { minWidth: "80px" },
      actions: { minWidth: "80px", },
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

  const nameTemplate = (rowData: User) => (
    <div className="flex items-center space-x-3">
      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
        {rowData.name.charAt(0).toUpperCase()}
      </div>
      <div>
        <h3 className="text-dark dark:text-white font-semibold text-sm">
          {rowData.name}
        </h3>
        <p className="text-gray-400 text-xs">{rowData.email}</p>
      </div>
    </div>
  );

  const clientIdTemplate = (rowData: User) =>
    rowData.client_id ? (
      <span className="font-bold">{rowData.client_id}</span>
    ) : (
      <span className="text-gray-400">
        {usersComponentData.labels.missingClientId}
      </span>
    );

  const roleTemplate = (rowData: User) =>
    rowData.client_id ? (
      <span className="font-normal">{rowData.role}</span>
    ) : (
      <span className="text-gray-400">
        {usersComponentData.labels.missingClientId}
      </span>
    );

  const actionsTemplate = () => (
    <div className="flex justify-center space-x-2">
      <button className="bg-gray-700 hover:bg-gray-600 text-white py-1 px-3 rounded-md flex items-center justify-center">
        <Edit className="h-4 w-4" />
      </button>
      <button className="bg-red-600 hover:bg-red-500 text-white py-1 px-3 rounded-md flex items-center justify-center">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="px-6">
      <div className="flex justify-end items-center my-2">
        <CreateUser />
      </div>

      <div className="bg-gray-100 px-6 py-4 shadow-lg dark:bg-sidebar rounded-xl border">
        <DataTable
          value={users || []}
          scrollable
          scrollHeight="550px"
          tableStyle={{ minWidth: "400px" }}
          showGridlines
          pt={ptConfig}
          size="normal"
          removableSort
        >
          <Column
            field="name"
            header="User"
            body={nameTemplate}
            sortable
            style={{ ...columnStyles.base, ...columnStyles.username }}
          />
          <Column
            field="client_id"
            header={usersComponentData.labels.clientId}
            body={clientIdTemplate}
            style={{ ...columnStyles.base, ...columnStyles.clientId }}
          />
          <Column
            field="role"
            header={usersComponentData.labels.role}
            body={roleTemplate}
            style={{ ...columnStyles.base, ...columnStyles.role }}
          />

          <Column
            header="Actions"
            body={actionsTemplate}
            align="center"
            style={{ ...columnStyles.base, ...columnStyles.actions }}
          />
        </DataTable>
      </div>
    </div>
  );
}

export default Users;
