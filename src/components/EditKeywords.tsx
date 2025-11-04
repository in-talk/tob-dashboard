import React, { useRef, useState, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import { toast } from "@/hooks/use-toast";
import { Label } from "./ui/label";
import ClearAllKeywordsAlert from "./ClearAllKeywordsAlert";
import { Input } from "./ui/input";
import { labels } from "@/types/lables";
import { editKeywordsData } from "@/constants";

interface EditKeywordProps {
  document: labels;
  documentKeywords: string[];
  collectionType: string;
}

function EditKeywords({
  document,
  documentKeywords,
  collectionType,
}: EditKeywordProps) {
  const [keywords, setKeywords] = useState<string[]>(documentKeywords ?? []);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const keywordInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLTextAreaElement>(null);
  console.log("EditKeywords document:", document, collectionType);

  const submitKeywords = useCallback(
    async (updatedKeywords: string[]) => {
      try {
        const response = await fetch(
          `/api/updateKeywords?collectionType=${collectionType}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: document._id,
              keywords: updatedKeywords,
            }),
            next: { revalidate: 0}
          }
        );

        if (!response.ok) {
          const responseData = await response.json();
          throw new Error(
            responseData.message || editKeywordsData.toasts.error.default
          );
        }
        const result = await response.json();

        setKeywords(result.updatedDocument?.keywords);

        toast({
          variant: "success",
          description: editKeywordsData.toasts.success,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          description:
            error instanceof Error
              ? error.message
              : editKeywordsData.toasts.error.unexpected,
        });
      }
    },
    [document._id, collectionType]
  );

  const handleAddKeyword = useCallback(
    async (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const input = keywordInputRef.current?.value.trim();
        if (input && !keywords.includes(input)) {
          const updatedKeywords = [...keywords, input];
          setKeywords(updatedKeywords);
          await submitKeywords(updatedKeywords);
        }
        if (keywordInputRef.current) keywordInputRef.current.value = "";
      }
    },
    [keywords, submitKeywords]
  );

  const handleAddBulkKeywords = useCallback(async () => {
    const input = bulkInputRef.current?.value.trim();
    if (input) {
      const newKeywords = input
        .split(/[\n,]+/)
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword && !keywords.includes(keyword));

      if (newKeywords.length > 0) {
        const updatedKeywords = [...keywords, ...newKeywords];
        setKeywords(updatedKeywords);
        await submitKeywords(updatedKeywords);
      }
      if (bulkInputRef.current) bulkInputRef.current.value = "";
    }
  }, [keywords, submitKeywords]);

  const handleRemoveKeyword = useCallback(
    async (keywordToRemove: string) => {
      const updatedKeywords = keywords.filter(
        (keyword) => keyword !== keywordToRemove
      );
      setKeywords(updatedKeywords);
      await submitKeywords(updatedKeywords);
    },
    [keywords, submitKeywords]
  );

  const handleClearAllKeywords = useCallback(async () => {
    setKeywords([]);
    await submitKeywords([]);
    setAlertOpen(false);
  }, [submitKeywords]);

  const filteredKeywords = useMemo(() => {
    if (!searchTerm.trim()) return keywords;

    return keywords.filter((keyword) => {
      if (!keyword || typeof keyword !== "string") return false;

      return keyword
        .trim()
        .toLowerCase()
        .includes(searchTerm.trim().toLowerCase());
    });
  }, [keywords, searchTerm]);

  console.log("Filtered keywords:", filteredKeywords);

  const downloadKeywordsAsExcel = useCallback(() => {
    if (keywords.length === 0) {
      toast({
        variant: "destructive",
        description: "No keywords to download",
      });
      return;
    }

    // Create worksheet data - each keyword in its own row
    const worksheetData = [
      ["Keywords"], // Header
      ...keywords.map((keyword) => [`${keyword},`]), // Each keyword in separate row
    ];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Keywords");

    // Generate filename with document info
    const filename = `keywords_${collectionType}_${document.label}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);

    toast({
      variant: "success",
      description: `Downloaded ${keywords.length} keywords to Excel file`,
    });
  }, [keywords, document.label, collectionType]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>{editKeywordsData.dialog.trigger}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-[825px] bg-white dark:bg-sidebar overflow-y-auto ">
        <DialogHeader>
          <DialogTitle>Add Keywords ({keywords.length})</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-4">
          <div className=" flex flex-col gap-4  pr-4">
            <Label>{editKeywordsData.labels.singleKeyword}</Label>
            <Input
              ref={keywordInputRef}
              type="text"
              placeholder={editKeywordsData.placeholders.singleKeyword}
              onKeyDown={handleAddKeyword}
              className="border dark:border-white"
            />
            <Label>{editKeywordsData.labels.bulkKeyword}</Label>
            <Textarea
              ref={bulkInputRef}
              placeholder={editKeywordsData.placeholders.bulkKeyword}
              rows={3}
              className="border dark:border-white"
            />
            <Button
              variant="outline"
              type="button"
              onClick={handleAddBulkKeywords}
            >
              {editKeywordsData.buttons.addBulk}
            </Button>
          </div>
          <Separator />
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <Input
                type="text"
                placeholder={editKeywordsData.placeholders.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 w-[50%] border dark:border-white"
              />
              <Button
                variant="outline"
                onClick={downloadKeywordsAsExcel}
                disabled={keywords.length === 0}
                className="ml-4"
              >
                Download Excel
              </Button>
            </div>
            <div className="overflow-y-auto sm:max-w-[400px] md:max-w-[750px] h-[200px] pb-4">
              {filteredKeywords.map((keyword, i) => (
                <Button
                  className="m-1"
                  variant="outline"
                  key={`${keyword}-${i}`}
                  onClick={() => handleRemoveKeyword(keyword)}
                >
                  {keyword} {editKeywordsData.buttons.removeKeywordSuffix}
                </Button>
              ))}
            </div>
            <ClearAllKeywordsAlert
              isAlertOpen={isAlertOpen}
              setAlertOpen={setAlertOpen}
              handleClearAllKeywords={handleClearAllKeywords}
            />
          </div>
        </div>
        <DialogClose asChild>
          <Button variant="secondary">
            {editKeywordsData.dialog.close}
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

export default EditKeywords;