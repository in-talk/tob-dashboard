"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import useSWR from "swr";

import CustomLoader from "../ui/CustomLoader";
import CallLogsTable from "./components/CallLogsTable";
import CallDetailsTable from "./components/CallDetailsTable";

interface CallDetailsModalProps {
  callId: string;
  clientId?: string;
}

const postFetcher = async (
  url: string,
  body: { call_Id: string; client_Id?: string }
) => {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await res.json();
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  if (result?.callDetails) return result.callDetails;
  if (result?.callMetadata) return result.callMetadata;
  return result || [];
};

export default function CallDetailsModal({
  callId,
  clientId,
}: CallDetailsModalProps) {
  const [open, setOpen] = useState(false);

  const {
    data: callDetails,
    error: callDetailError,
    isLoading: callDetailLoading,
  } = useSWR(open ? `call-details-${callId}` : null, () =>
    postFetcher("/api/getCallDetails", { call_Id: callId })
  );

  const {
    data: callMetadata,
    error: metadataError,
    isLoading: metadataLoading,
  } = useSWR(open ? `call-metadata-${callId}-${clientId}` : null, () =>
    postFetcher("/api/getCallMetadata", {
      call_Id: callId,
      client_Id: clientId,
    })
  );

  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  const isLoading = callDetailLoading || metadataLoading;

  const metadata = callMetadata?.[0]?.metadata;


  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button variant="link" className="underline">
          {callId}
        </Button>
      </DialogTrigger>
      <DialogContent className=" w-full max-w-[1000px] max-h-[850px] overflow-auto bg-white dark:bg-sidebar">
        <DialogHeader>
          <DialogTitle>Call details for {callId}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <CustomLoader />
        ) : callDetailError || metadataError ? (
          <div className="text-red-500">Error loading call details</div>
        ) : callDetails?.length ? (
          <>
            <CallDetailsTable callDetails={callDetails} />
            {metadata && metadata.call_logs && (
              <CallLogsTable callLogs={metadata.call_logs} />
            )}
          </>
        ) : (
          <div>No data found</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
