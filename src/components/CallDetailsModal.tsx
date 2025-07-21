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
import CustomLoader from "./ui/CustomLoader";
import { CallDetails } from "@/types/callDetails";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { formatDateTime } from "@/utils/formatDateTime";
import AudioPlayer from "./AudioPlayer";

interface CallDetailsModalProps {
  callId: string;
}

const fetcher = async (callId: string): Promise<CallDetails[]> => {
  const res = await fetch("/api/getCallDetails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ call_Id: callId }),
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Failed to fetch call details");
  return result.callDetails || [];
};

export default function CallDetailsModal({ callId }: CallDetailsModalProps) {
  const [open, setOpen] = useState(false);

  const shouldFetch = open; // only fetch when dialog is open

  const {
    data: callDetails,
    error,
    isLoading,
  } = useSWR(
    shouldFetch ? `call-details-${callId}` : null,
    () => fetcher(callId),
    {
      revalidateOnFocus: false, // don’t re-fetch on tab switch
    }
  );

  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button variant="link" className="underline">
          {callId}
        </Button>
      </DialogTrigger>
      <DialogContent className=" max-w-[950px] min-h-[200px] bg-white dark:bg-sidebar">
        <DialogHeader>
          <DialogTitle>Call details for {callId}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <CustomLoader />
        ) : error ? (
          <div className="text-red-500">Error loading call details</div>
        ) : callDetails?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Agent Name</TableHead>
                <TableHead className="w-[120px]">Interaction ID</TableHead>
                <TableHead>Transcription</TableHead>
                <TableHead className="text-center">Detected Label</TableHead>
                <TableHead className="text-center">Call Audio</TableHead>
                <TableHead className="text-center">Created At</TableHead>
                <TableHead className="text-center">Interaction time</TableHead>
                <TableHead className="text-center">Turn</TableHead>
                <TableHead className="text-center">Response Label</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {callDetails.map((callDetail, i) => (
                <TableRow key={i} className="p-0 px-1">
                  <TableCell className="p-0  px-1 capitalize">
                    {callDetail.agent}
                  </TableCell>
                  <TableCell className="p-0  px-1">
                    {callDetail.interaction_id}
                  </TableCell>

                  <TableCell className=" p-0  px-1">
                    {callDetail.transcription || "N/A"}
                  </TableCell>
                  <TableCell className="p-0  px-1">
                    {callDetail.detected_label}
                  </TableCell>
                  <TableCell className="p-0  px-1">
                    <AudioPlayer audioPath={callDetail.response_audio_path} />
                  </TableCell>
                  <TableCell className="w-[200px] p-0  px-1">
                    {formatDateTime(callDetail.created_at)}
                  </TableCell>
                  <TableCell className="w-[200px] p-0 px-1">
                    {formatDateTime(callDetail.interaction_timestamp)}
                  </TableCell>
                  <TableCell className="text-center p-0  px-1">
                    {callDetail.turn}
                  </TableCell>
                  <TableCell className="text-center p-0  px-1">
                    {callDetail.response_file_label}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div>No data found</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
