"use client";
import { Card, CardContent } from "@/components/ui/card";
import useSWR from "swr";
import { DataTable } from "./DataTable/DataTable";
import { columns } from "./DataTable/Colums";
import { labels } from "@/types/lables";
import { useMemo } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DocumentList() {
  const {
    data: documents,
    error,
    isLoading,
  } = useSWR<labels[]>("/api/dashboard", fetcher);

  const memoizedData = useMemo(() => {
    return documents ?? [];
  }, [documents]);

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-40 bg-transparent">
        <div className="relative w-12 h-12 top-[170px]">
          <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
          <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-ping opacity-25"></div>
        </div>
      </div>
    );

  if (error) return <div>Failed to load documents.</div>;



  return (
    <div className="space-y-2">
      {memoizedData.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <p className="text-muted-foreground">
              No Document is availabe in database!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="container mx-auto py-3 px-[30px]">
          <DataTable columns={columns} data={memoizedData} />
        </div>
      )}
    </div>
  );
}
