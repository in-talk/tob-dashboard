// components/EditKeywords.tsx
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
  const [isUpdating, setIsUpdating] = useState(false); // ✅ Prevent simultaneous updates
  const keywordInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLTextAreaElement>(null);

  // ✅ Track pending operations to prevent race conditions
  const pendingOperations = useRef<Set<string>>(new Set());

  // ✅ Add single keyword using atomic API
  const addSingleKeyword = useCallback(
    async (keyword: string) => {
      const operationId = `add-${keyword}-${Date.now()}`;

      if (pendingOperations.current.has(operationId)) {
        console.warn("Operation already in progress");
        return;
      }

      pendingOperations.current.add(operationId);
      setIsUpdating(true);

      try {
        const response = await fetch(
          `/api/keywords/add?collectionType=${collectionType}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: document._id,
              keyword: keyword,
            }),
          }
        );

        if (!response.ok) {
          const responseData = await response.json();
          throw new Error(responseData.message || "Failed to add keyword");
        }

        const result = await response.json();

        // ✅ Update with server response (source of truth)
        setKeywords(result.updatedDocument.keywords);


        return true;
      } catch (error) {
        console.error("❌ Failed to add keyword:", error);
        toast({
          variant: "destructive",
          description:
            error instanceof Error ? error.message : "Failed to add keyword",
        });
        return false;
      } finally {
        pendingOperations.current.delete(operationId);
        setIsUpdating(false);
      }
    },
    [document._id, collectionType]
  );

  // ✅ Remove single keyword using atomic API
  const removeSingleKeyword = useCallback(
    async (keyword: string) => {
      const operationId = `remove-${keyword}`;

      if (pendingOperations.current.has(operationId)) {
        console.warn("Remove operation already in progress");
        return;
      }

      pendingOperations.current.add(operationId);
      setIsUpdating(true);

      try {
        const response = await fetch(
          `/api/keywords/remove?collectionType=${collectionType}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: document._id,
              keyword: keyword,
            }),
          }
        );

        if (!response.ok) {
          const responseData = await response.json();
          throw new Error(responseData.message || "Failed to remove keyword");
        }

        const result = await response.json();

        // ✅ Update with server response (source of truth)
        setKeywords(result.updatedDocument.keywords);


        return true;
      } catch (error) {
        console.error("❌ Failed to remove keyword:", error);
        toast({
          variant: "destructive",
          description:
            error instanceof Error ? error.message : "Failed to remove keyword",
        });
        return false;
      } finally {
        pendingOperations.current.delete(operationId);
        setIsUpdating(false);
      }
    },
    [document._id, collectionType]
  );

  const handleAddKeyword = useCallback(
    async (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();

        if (isUpdating) {
          toast({
            variant: "default",
            description: "Please wait for current operation to complete",
          });
          return;
        }

        const input = keywordInputRef.current?.value.trim();

        if (!input) {
          return;
        }

        if (keywords.includes(input)) {
          toast({
            variant: "default",
            description: "Keyword already exists",
          });
          if (keywordInputRef.current) keywordInputRef.current.value = "";
          return;
        }

        // ✅ Use atomic add
        const success = await addSingleKeyword(input);

        if (success) {
          if (keywordInputRef.current) keywordInputRef.current.value = "";
          toast({
            variant: "success",
            description: "Keyword added successfully",
          });
        }
      }
    },
    [keywords, isUpdating, addSingleKeyword]
  );

  const handleAddBulkKeywords = useCallback(async () => {
    if (isUpdating) {
      toast({
        variant: "default",
        description: "Please wait for current operation to complete",
      });
      return;
    }

    const input = bulkInputRef.current?.value.trim();
    if (!input) {
      return;
    }

    const newKeywords = input
      .split(/[\n,]+/)
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword);

    if (newKeywords.length === 0) {
      toast({
        variant: "default",
        description: "No valid keywords to add",
      });
      if (bulkInputRef.current) bulkInputRef.current.value = "";
      return;
    }

    setIsUpdating(true);

    try {
      // ✅ Use bulk API for better performance
      const response = await fetch(
        `/api/keywords/bulk?collectionType=${collectionType}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: document._id,
            operation: "add", // Use "add" instead of "replace"
            keywords: newKeywords,
          }),
        }
      );

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.message || "Failed to add keywords");
      }

      const result = await response.json();
      setKeywords(result.updatedDocument.keywords);

      if (bulkInputRef.current) bulkInputRef.current.value = "";

      toast({
        variant: "success",
        description: `Successfully added keywords. Total: ${result.keywordsCount}`,
      });
    } catch (error) {
      console.error("❌ Failed to add bulk keywords:", error);
      toast({
        variant: "destructive",
        description:
          error instanceof Error ? error.message : "Failed to add keywords",
      });
    } finally {
      setIsUpdating(false);
    }
  }, [document._id, collectionType, isUpdating]);

  const handleRemoveKeyword = useCallback(
    async (keywordToRemove: string) => {
      if (isUpdating) {
        toast({
          variant: "default",
          description: "Please wait for current operation to complete",
        });
        return;
      }

      // ✅ Use atomic remove
      const success = await removeSingleKeyword(keywordToRemove);

      if (success) {
        toast({
          variant: "success",
          description: "Keyword removed successfully",
        });
      }
    },
    [isUpdating, removeSingleKeyword]
  );

  const handleClearAllKeywords = useCallback(async () => {
    if (isUpdating) {
      toast({
        variant: "default",
        description: "Please wait for current operation to complete",
      });
      return;
    }

    setIsUpdating(true);

    try {
      // ✅ Use bulk API with "clear" operation
      const response = await fetch(
        `/api/keywords/bulk?collectionType=${collectionType}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: document._id,
            operation: "clear",
            keywords: [],
          }),
        }
      );

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.message || "Failed to clear keywords");
      }

      await response.json();
      setKeywords([]);
      setAlertOpen(false);

      toast({
        variant: "success",
        description: "All keywords cleared successfully",
      });
    } catch (error) {
      console.error("❌ Failed to clear keywords:", error);
      toast({
        variant: "destructive",
        description:
          error instanceof Error ? error.message : "Failed to clear keywords",
      });
    } finally {
      setIsUpdating(false);
    }
  }, [document._id, collectionType, isUpdating]);

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

  const downloadKeywordsAsExcel = useCallback(() => {
    if (keywords.length === 0) {
      toast({
        variant: "destructive",
        description: "No keywords to download",
      });
      return;
    }

    const worksheetData = [
      ["Keywords"],
      ...keywords.map((keyword) => [`${keyword},`]),
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    XLSX.utils.book_append_sheet(workbook, worksheet, "Keywords");

    const filename = `keywords_${collectionType}_${document.label}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

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
      <DialogContent className="sm:max-w-[425px] md:max-w-[825px] bg-white dark:bg-sidebar overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Add Keywords ({keywords.length}){isUpdating && " - Updating..."}
          </DialogTitle>
        </DialogHeader>

        {/* ✅ Disable form when updating */}
        <fieldset disabled={isUpdating}>
          <div className="flex flex-col gap-4 mt-4">
            <div className="flex flex-col gap-4 pr-4">
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
                disabled={isUpdating}
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
                  disabled={keywords.length === 0 || isUpdating}
                  className="ml-4"
                >
                  Download Excel
                </Button>
              </div>
              <div className="overflow-y-auto sm:max-w-[400px] md:max-w-[750px] h-[200px] pb-4">
                {filteredKeywords.map((keyword, i) => (
                  <div
                    key={`${keyword}-${i}`}
                    className="inline-flex items-center gap-1 m-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    <span>{keyword}</span>
                    <button
                      onClick={() => handleRemoveKeyword(keyword)}
                      disabled={isUpdating}
                      className="ml-1 hover:text-blue-600 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <ClearAllKeywordsAlert
                isAlertOpen={isAlertOpen}
                setAlertOpen={setAlertOpen}
                handleClearAllKeywords={handleClearAllKeywords}
              />
            </div>
          </div>
        </fieldset>

        {/* ✅ Loading indicator */}
        {isUpdating && (
          <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg">
            Updating keywords...
          </div>
        )}

        <DialogClose asChild>
          <Button variant="secondary" disabled={isUpdating}>
            {editKeywordsData.dialog.close}
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

export default EditKeywords;
