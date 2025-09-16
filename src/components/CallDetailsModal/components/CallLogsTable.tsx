import { parseNestedJSON } from "@/utils/parseMetaData";

import { ScrollArea } from "@radix-ui/react-scroll-area";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../ui/dialog";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table,
} from "../../ui/table";
import { Button } from "../../ui/button";
import { CallLog } from "@/types/callDetails";

interface CallLogsTable {
  callLogs: CallLog[];
}

function CallLogsTable({ callLogs }: CallLogsTable) {
  return (
    <div>
      <h2 className="font-bold">Call Logs</h2>
      <ScrollArea className="h-[300px] max-w-[950px]  text-sm rounded-md border p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Turn</TableHead>
              <TableHead>Emoji</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Time From Start</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {callLogs?.map((row: CallLog, i: number) => {
              let additionData;

              if (row.additionalData) {
                const normalized = parseNestedJSON(row.additionalData);
                additionData = JSON.stringify(normalized, null, 2);
              }

              return (
                <TableRow key={i}>
                  <TableCell>{row.turn}</TableCell>
                  <TableCell>{row.emoji}</TableCell>
                  <TableCell className="max-w-[300px]">{row.action}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>
                    {new Date(row.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>{row.timeFromStart}</TableCell>
                  <TableCell>
                    {row.additionalData &&
                    Object.keys(row.additionalData).length !== 0 ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="link"
                            className="p-0 h-auto font-normal"
                          >
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[50vh] overflow-y-auto font-mono whitespace-pre">
                          <DialogHeader>
                            <DialogTitle>Additional Data</DialogTitle>
                          </DialogHeader>

                          <code className="whitespace-pre-wrap text-sm  p-4 rounded-lg overflow-x-auto">
                            {additionData}
                          </code>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

export default CallLogsTable;
