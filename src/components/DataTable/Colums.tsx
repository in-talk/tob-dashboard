import UpdateDocument from "../UpdateDocument";
import DeleteDocument from "../DeleteDocument";
import { ColumnDef } from "@tanstack/react-table";
import { Separator } from "../ui/separator";
import EditKeywords from "../EditKeywords";
import React from "react";
import { labels } from "@/types/lables";

export const getColumns = (collectionType: string): ColumnDef<labels>[] => [
  {
    accessorKey: "label",
    header: "Label",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("label")}</div>
    ),
  },
  {
    accessorKey: "file_name",
    header: "File Name",
    cell: ({ row }) => <div>{row.getValue("file_name")}</div>,
  },
  {
    accessorKey: "active_turns",
    header: "Active turns",
    cell: ({ row }) => {
      const activeTurns: number[] = row.getValue("active_turns");
      return (
        <div className="max-w-[100px] overflow-auto pb-[10px]">
          {activeTurns.map((activeTurn, index) => (
            <React.Fragment key={activeTurn}>
              {activeTurn}
              {index !== activeTurns.length - 1 && ","}
            </React.Fragment>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "check_on_all_turns",
    header: "Check on all turns",
    cell: ({ row }) => {
      const checkOnAllTurns = row.getValue("check_on_all_turns");
      return <div>{checkOnAllTurns ? "True" : "False"}</div>;
    },
  },
  {
    accessorKey: "keywords",
    enableHiding: false,
    header: "Actions",
    cell: ({ row }) => {
      const document = row.original;
      const keywords: string[] = row.getValue("keywords");

      return (
        <div className="flex">
          <UpdateDocument document={document} collectionType={collectionType} />
          <Separator orientation="vertical" className="mx-1" />
          <DeleteDocument id={document._id} collectionType={collectionType} />
          <Separator orientation="vertical" className="mx-1" />
          <EditKeywords
            document={document}
            documentKeywords={keywords}
            collectionType={collectionType}
          />
        </div>
      );
    },
  },
];