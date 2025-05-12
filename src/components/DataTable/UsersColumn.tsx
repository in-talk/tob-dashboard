import { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { User } from "@/types/user";

export const usersColumns: ColumnDef<User>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <div className="capitalize">{row.getValue("id")}</div>,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const email: string = row.getValue("email");
      return (
        <div className=" pb-[10px]">
          <p>{email}</p>
        </div>
      );
    },
  },
  {
    accessorKey: "client_id",
    header: "Client ID",
    cell: ({ row }) => {
      const clientID: string = row.getValue("client_id");
      return <p>{clientID}</p>;
    },
  },
];
