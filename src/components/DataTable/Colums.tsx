import UpdateDocument from "../UpdateDocument";
import DeleteDocument from "../DeleteDocument";
import { ColumnDef, Row } from "@tanstack/react-table";
import { Separator } from "../ui/separator";
import EditKeywords from "../EditKeywords";
import GlobalEditKeywords from "../GlobalEditKeywords";
import React from "react";
import { labels } from "@/types/lables";
import { formatDateTime } from "@/utils/formatDateTime";

export const getColumns = (
  collectionType: string,
): ColumnDef<labels>[] => [
  {
    accessorKey: "label",
    header: "Label",
    cell: ({ row }: { row: Row<labels> }) => <div className="capitalize">{row.getValue("label")}</div>,
  },
  {
    accessorKey: "file_name",
    header: "File Name",
    cell: ({ row }: { row: Row<labels> }) => <div>{row.getValue("file_name")}</div>,
  },
  {
    accessorKey: "updatedAt",
    header: "Updated At",
    enableSorting: true,
    sortingFn: (rowA: Row<labels>, rowB: Row<labels>, columnId: string) => {
      const a = rowA.getValue(columnId) as unknown;
      const b = rowB.getValue(columnId) as unknown;
      const at = a ? Date.parse(String(a)) : 0;
      const bt = b ? Date.parse(String(b)) : 0;
      return at - bt;
    },
    cell: ({ row }: { row: Row<labels> }) => {
      const original = row.original as unknown as Record<string, unknown>;
      const raw = (original["updatedAt"] ?? row.getValue("updatedAt")) as unknown;
      const date = raw ? new Date(String(raw)) : null;
      return <div>{date ? formatDateTime(date) : "N/A"}</div>;
    },
  },
  {
    accessorKey: "active_turns",
    header: "T",
    cell: ({ row }: { row: Row<labels> }) => {
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
    header: "All Turns",
    cell: ({ row }: { row: Row<labels> }) => {
      const checkOnAllTurns = row.getValue("check_on_all_turns");
      return <div>{checkOnAllTurns ? "True" : "False"}</div>;
    },
  },
  {
    accessorKey: "keywords_count",
    header: "Phrases",
    cell: ({ row }: { row: Row<labels> }) => {
      const keywords: string[] = row.getValue("keywords");
      return <div>{keywords?.length}</div>;
    },
  },
  {
    accessorKey: "keywords",
    enableHiding: false,
    header: "Actions",
    cell: ({ row }: { row: Row<labels> }) => {
      const document = row.original;
      const keywords: string[] = row.getValue("keywords");

      return (
        <div className="flex items-center gap-1">
          <UpdateDocument document={document} collectionType={collectionType} />
          <Separator orientation="vertical" className="h-4 mx-1" />
          <DeleteDocument id={document._id} collectionType={collectionType} />
          <Separator orientation="vertical" className="h-4 mx-1" />
          <EditKeywords
            document={document}
            documentKeywords={keywords}
            collectionType={collectionType}
          />
          <Separator orientation="vertical" className="h-4 mx-1" />
          <GlobalEditKeywords label={document.label} />
        </div>
      );
    },
  },
];