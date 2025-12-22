// components/GlobalEditKeywords.tsx
import React, { useRef, useState, useCallback } from "react";
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
import { Input } from "./ui/input";
import { Globe, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface GlobalEditKeywordsProps {
    label: string;
}

interface UpdateResult {
    campaign: string;
    collection?: string;
    matchedCount?: number;
    modifiedCount?: number;
    status: "success" | "error";
    message?: string;
}

function GlobalEditKeywords({ label }: GlobalEditKeywordsProps) {
    const [isDialogOpen, setDialogOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [results, setResults] = useState<UpdateResult[] | null>(null);
    const keywordInputRef = useRef<HTMLInputElement>(null);
    const bulkInputRef = useRef<HTMLTextAreaElement>(null);

    const handleGlobalUpdate = useCallback(async (operation: "add" | "remove") => {
        let keywordsToUpdate: string[] = [];

        if (bulkInputRef.current?.value.trim()) {
            keywordsToUpdate = bulkInputRef.current.value
                .split(/[\n,]+/)
                .map((k) => k.trim())
                .filter((k) => k);
        } else if (keywordInputRef.current?.value.trim()) {
            keywordsToUpdate = [keywordInputRef.current.value.trim()];
        }

        if (keywordsToUpdate.length === 0) {
            toast({
                variant: "destructive",
                description: "Please enter at least one keyword",
            });
            return;
        }

        setIsUpdating(true);
        setResults(null);

        try {
            const response = await fetch("/api/keywords/global-update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    label,
                    operation,
                    keywords: keywordsToUpdate,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Global update failed");
            }

            setResults(data.results);

            if (keywordInputRef.current) keywordInputRef.current.value = "";
            if (bulkInputRef.current) bulkInputRef.current.value = "";

            toast({
                variant: "success",
                description: `Global ${operation} completed. Check results below.`,
            });
        } catch (error) {
            console.error("Global update error:", error);
            toast({
                variant: "destructive",
                description: error instanceof Error ? error.message : "Global update failed",
            });
        } finally {
            setIsUpdating(false);
        }
    }, [label]);

    return (
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex gap-2">
                    <Globe className="w-4 h-4" />
                    Global Edit
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] md:max-w-[700px] bg-white dark:bg-sidebar max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        Global Update Keywords for Label: <span className="text-blue-600 font-bold">{label}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-6 py-4">
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="single-keyword">Single Keyword</Label>
                            <Input
                                id="single-keyword"
                                ref={keywordInputRef}
                                placeholder="Enter a single keyword"
                                disabled={isUpdating}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="bulk-keywords">Bulk Keywords (comma or newline separated)</Label>
                            <Textarea
                                id="bulk-keywords"
                                ref={bulkInputRef}
                                placeholder="keyword1, keyword2, keyword3..."
                                rows={4}
                                disabled={isUpdating}
                            />
                        </div>

                        <div className="flex gap-3">
                            <Button
                                onClick={() => handleGlobalUpdate("add")}
                                disabled={isUpdating}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            >
                                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Add Globally
                            </Button>
                            <Button
                                onClick={() => handleGlobalUpdate("remove")}
                                disabled={isUpdating}
                                variant="destructive"
                                className="flex-1"
                            >
                                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Remove Globally
                            </Button>
                        </div>
                    </div>

                    {results && (
                        <div className="space-y-3">
                            <Separator />
                            <h3 className="font-semibold text-sm">Update Results:</h3>
                            <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2">
                                {results.map((res, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-md border flex items-center justify-between ${res.status === "success"
                                                ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                                                : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                                            }`}
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm uppercase">{res.campaign}</span>
                                            {res.status === "success" ? (
                                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                                    Matched: {res.matchedCount} | Modified: {res.modifiedCount}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-red-600 dark:text-red-400">
                                                    Error: {res.message}
                                                </span>
                                            )}
                                        </div>
                                        {res.status === "success" ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-600" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end">
                    <DialogClose asChild>
                        <Button variant="secondary">Close</Button>
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default GlobalEditKeywords;
