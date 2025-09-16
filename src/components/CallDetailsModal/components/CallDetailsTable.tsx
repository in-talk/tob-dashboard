import React from "react";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table,
} from "../../ui/table";
import { CallDetails } from "@/types/callDetails";
import AudioPlayer from "@/components/AudioPlayer";
import { formatDateTime } from "@/utils/formatDateTime";
import { utcToCurrentTimezone } from "@/utils/timezone";

interface CallDetailsTableProps {
  callDetails: CallDetails[];
}

function CallDetailsTable({ callDetails }: CallDetailsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Agent</TableHead>
          <TableHead className="w-[120px]">Interaction ID</TableHead>
          <TableHead>Transcription</TableHead>
          <TableHead className="text-center">DL</TableHead>
          <TableHead className="text-center">Call Audio</TableHead>
          <TableHead className="text-center">Created At</TableHead>
          <TableHead className="text-center">T</TableHead>
          <TableHead className="text-center">FN</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {callDetails?.map((callDetail: CallDetails, i: number) => (
          <TableRow key={i} className="p-0 px-1">
            <TableCell className="p-0 border-l px-1 capitalize ">
              {callDetail.agent}
            </TableCell>
            <TableCell className="p-0  text-center px-1 border-l">
              {callDetail.interaction_id}
            </TableCell>

            <TableCell className=" pb-2 border-l px-1 max-w-[180px] whitespace-nowrap overflow-x-auto">
              {callDetail.transcription || "N/A"}
            </TableCell>
            <TableCell className="p-0 border-l px-1">
              {callDetail.detected_label}
            </TableCell>
            <TableCell className="p-0 border-l px-1">
              <AudioPlayer audioPath={callDetail.response_audio_path} />
            </TableCell>
            <TableCell className="w-[150px] border-l p-0  px-1">
              {formatDateTime(utcToCurrentTimezone(callDetail.created_at))}
            </TableCell>
            <TableCell className="text-center border-l p-0  px-1">
              {callDetail.turn}
            </TableCell>
            <TableCell className="text-center p-0 border-l border-r px-1">
              {callDetail.response_file_label}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default CallDetailsTable;
