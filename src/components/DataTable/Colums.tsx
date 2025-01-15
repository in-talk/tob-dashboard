import { labels } from "@prisma/client";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import UpdateDocument from "../UpdateDocument";
import DeleteDocument from "../DeleteDocument";
import { MoreHorizontalIcon } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

export const columns: ColumnDef<labels>[] = [
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
    cell: ({ row }) => (
      <div className="lowercase">{row.getValue("file_name")}</div>
    ),
  },
  {
    accessorKey: "keywords",
    header: "Keywords",
    cell: ({ row }) => {
      const keywords: string[] = row.getValue("keywords");
      return (
        <div className="flex" style={{ gap: "5px" }}>
          {keywords.map((keyword, index) => (
            <Button variant={"outline"} key={index}>
              {keyword}
            </Button>
          ))}
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    header: "Actions",
    cell: ({ row }) => {
      const document = row.original;

      return (
        <Popover>
          <PopoverTrigger>
            <MoreHorizontalIcon />
          </PopoverTrigger>
          <PopoverContent className="w-full">
            <UpdateDocument document={document} />
            <Separator className="my-4" />
            <DeleteDocument id={document.id} />
          </PopoverContent>
        </Popover>
      );
    },
  },
];
