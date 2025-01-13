import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import React from "react";
import DeleteDocument from "./delete-document";
import UpdateDocument from "./update-document";
import { type Document } from "@prisma/client";

interface DocumentProps {
  document: Document;
}

function DocumentItem({ document }: DocumentProps) {
  return (
    <Card className="group relative" key={document.id}>
      <div className="absolute top-2 right-2 ">
        <UpdateDocument document={document} />
        <DeleteDocument id={document.id} />
      </div>
      <CardHeader>
        <CardTitle className="font-normal">
          <span className="font-bold">Label: </span>
          <span>{document.label}</span>
        </CardTitle>
      </CardHeader>
      {document.keywords && (
        <CardContent>
          <div className="flex  mt-2 items-center" style={{ gap: "5px" }}>
            <span className="font-bold">Keywords:</span>
            <div className="flex" style={{ gap: "5px" }}>
              {document.keywords.map((keyword: string, index: number) => (
                <Button variant={"outline"} key={index}>
                  {keyword}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      )}
      {document.file_name && (
        <CardContent>
          <span className="font-bold">Filename: </span>
          <span>{document.file_name}</span>
        </CardContent>
      )}
    </Card>
  );
}

export default DocumentItem;
