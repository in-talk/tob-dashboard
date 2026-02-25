"use client";

import { User } from "@/types/user";
import { Edit, Trash2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { usersComponentData } from "@/constants";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import CreateUpdateUser from "@/components/CreateUpdateUser";
import { GetServerSideProps } from "next";
import { withAuth } from "@/utils/auth";
import { fetcher } from "@/utils/fetcher";
import { toast } from "@/hooks/use-toast";
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
import { Button } from "@/components/ui/button";

function Users() {
  const {
    data: users,
    error,
    isLoading,
  } = useSWR<User[]>("/api/users", fetcher);

  const [loading, setLoading] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const result = await res.json();

      if (!result.ok) {
        toast({
          variant: "destructive",
          description: result.error || "Failed to delete user",
        });
        return;
      }

      toast({
        variant: "success",
        description: "User deleted successfully",
      });
      mutate("/api/users");
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
      username: { minWidth: "150px" },
      role: { minWidth: "80px" },
      actions: { minWidth: "100px" },
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

  const roleTemplate = (rowData: User) => (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${rowData.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
      }`}>
      {rowData.role.toUpperCase()}
    </span>
  );

  const actionsTemplate = (rowData: User) => (
    <div className="flex justify-center space-x-2">
      <Button
        variant="ghost"
        className="bg-gray-700 hover:bg-gray-600 text-white py-1 px-3 rounded-md"
        onClick={() => {
          setEditingUser(rowData);
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
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(rowData.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <div className="px-3 sm:px-6">
      <div className="flex justify-end items-center my-4">
        <CreateUpdateUser mode="create" />
      </div>

      <CreateUpdateUser
        mode="update"
        open={isEditOpen}
        onOpenChange={setEditOpen}
        initialData={editingUser ? {
          name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role,
        } : {}}
        userId={editingUser?.id}
      />

      <div className="bg-gray-100 px-3 sm:px-6 py-4 shadow-lg dark:bg-sidebar rounded-xl border overflow-x-auto">
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
            style={{ ...columnStyles.base, ...columnStyles.username, width: "50%" }}
          />
          <Column
            field="role"
            header="Role"
            body={roleTemplate}
            sortable
            style={{ ...columnStyles.base, ...columnStyles.role, width: "30%" }}
          />

          <Column
            header="Actions"
            body={actionsTemplate}
            align="center"
            style={{ ...columnStyles.base, ...columnStyles.actions, width: "20%" }}
          />
        </DataTable>
      </div>
    </div>
  );
}

export default Users;
export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);
