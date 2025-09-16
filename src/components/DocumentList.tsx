"use client";
import { Card, CardContent } from "@/components/ui/card";
import useSWR from "swr";
import { DataTable } from "./DataTable/DataTable";
import { getColumns } from "./DataTable/Colums";
import { labels } from "@/types/lables";
import { useMemo } from "react";
import { documentListData } from "@/constants";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DocumentList({
  collectionType,
}: {
  collectionType: string;
}) {
  const {
    data: documents,
    error,
    isLoading,
  } = useSWR<labels[]>(
    collectionType ? `/api/dashboard?collectionType=${collectionType}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

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

  if (error) return <div>{documentListData.emptyState}</div>;
  return (
    <div className="space-y-2">
      {memoizedData.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10">
            <p className="text-muted-foreground">{documentListData.error}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="container mx-auto py-3 px-[30px]">
          <DataTable columns={getColumns(collectionType)} data={memoizedData} />
        </div>
      )}
    </div>
  );
}
