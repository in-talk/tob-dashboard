import React, { useRef, useState, useCallback, useMemo } from "react";
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
import { mutate } from "swr";
import { Label } from "./ui/label";
import ClearAllKeywordsAlert from "./ClearAllKeywordsAlert";
import { Input } from "./ui/input";
import { labels } from "@/types/lables";

interface EditKeywordProps {
  document: labels;
  documentKeywords: string[];
}

function EditKeywords({ document, documentKeywords }: EditKeywordProps) {
  const [keywords, setKeywords] = useState<string[]>(documentKeywords ?? []);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isAlertOpen, setAlertOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const keywordInputRef = useRef<HTMLInputElement>(null);
  const bulkInputRef = useRef<HTMLTextAreaElement>(null);

  const submitKeywords = useCallback(
    async (updatedKeywords: string[]) => {
      try {
        const response = await fetch("/api/updateKeywords", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: document.id, keywords: updatedKeywords }),
        });

        if (!response.ok) {
          const responseData = await response.json();
          throw new Error(responseData.message || "Failed to update keywords");
        }

        toast({ description: "Keywords updated successfully." });
        mutate("/api/dashboard");
      } catch (error) {
        toast({
          variant: "destructive",
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        });
      }
    },
    [document.id]
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

  const filteredKeywords = useMemo(
    () =>
      documentKeywords.filter((keyword) =>
        keyword.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [documentKeywords, searchTerm]
  );

  return (
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>Edit keywords</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-[825px] bg-white overflow-y-auto ">
        <DialogHeader>
          <DialogTitle>Add Keywords</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-4">
          <div className=" flex flex-col gap-4 border-r border-slate-100 pr-4">
            <Label>Single Keyword Input</Label>
            <Input
              ref={keywordInputRef}
              type="text"
              placeholder="Add keywords and press Enter"
              onKeyDown={handleAddKeyword}
            />
            <Label>Bulk Keyword Input</Label>
            <Textarea
              ref={bulkInputRef}
              placeholder="Add multiple keywords (comma-separated or one per line)"
              rows={3}
            />
            <Button
              variant="outline"
              type="button"
              onClick={handleAddBulkKeywords}
            >
              Add Bulk Keywords
            </Button>
          </div>
          <Separator  />
          <div className="flex flex-col gap-4">
            <Input
              type="text"
              placeholder="Search keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 w-[50%]"
            />
            <div className="overflow-y-auto h-[200px]">
              {filteredKeywords.map((keyword) => (
                <Button
                  className="m-1"
                  variant="outline"
                  key={keyword}
                  onClick={() => handleRemoveKeyword(keyword)}
                >
                  {keyword} ✕
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
          <Button variant="secondary">Close</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

export default EditKeywords;
