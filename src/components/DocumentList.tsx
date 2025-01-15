"use client";
import { Card, CardContent } from "@/components/ui/card";
import useSWR from "swr";
import { labels } from "@prisma/client";
import { DataTable } from "./DataTable/DataTable";
import { columns } from "./DataTable/Colums";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DocumentList() {
  const {
    data: documents,
    error,
    isLoading,
  } = useSWR<labels[]>("/api/dashboard", fetcher);

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-40 bg-white">
        <div className="relative w-12 h-12">
          <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
          <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-ping opacity-25"></div>
        </div>
      </div>
    );

  if (error) return <div>Failed to load documents.</div>;

  const documentsList = documents || [];

  return (
    <div className="space-y-4">
      {documentsList.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <p className="text-muted-foreground">
              No Document is availabe in database!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="container mx-auto py-10">
          <DataTable columns={columns} data={documentsList} />
        </div>
      )}
    </div>
  );
}
