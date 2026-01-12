"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { dragAndDrop } from "@formkit/drag-and-drop";
import { ChevronRight, Check, Trash2, Download, Upload, Search, X, Loader2, ChevronLeft } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as XLSX from "xlsx";
import { GetServerSideProps } from "next";
import { withAuth } from "@/utils/auth";

const arraysAreEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

// Memoized list item component
const TempListItem = ({
  item,
  isSelected,
  isCopied,
  darkMode,
  onToggleSelect,
  onCopy,
}: {
  item: string;
  index: number;
  isSelected: boolean;
  isCopied: boolean;
  darkMode: boolean;
  onToggleSelect: (item: string) => void;
  onCopy: (item: string) => void;
}) => {
  const textPrimary = darkMode ? "text-gray-100" : "text-gray-800";

  return (
    <li
      data-id={item}
      className={`group cursor-grab active:cursor-grabbing ${darkMode ? "bg-gray-800" : "bg-gray-50"
        } border ${isSelected
          ? darkMode
            ? "border-blue-500 bg-blue-900/20"
            : "border-blue-500 bg-blue-50"
          : darkMode
            ? "border-gray-700"
            : "border-gray-200"
        } px-4 py-2 rounded hover:border-gray-400 transition-all duration-150`}
    >
      <div className="flex items-center gap-3 justify-between">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(item);
            }}
            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${isSelected
                ? "bg-blue-600 border-blue-600"
                : darkMode
                  ? "border-gray-600 bg-transparent"
                  : "border-gray-300 bg-white"
              }`}
          >
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </button>
          <svg
            className={`w-4 h-4 ${darkMode ? "text-gray-500" : "text-gray-400"
              } group-hover:text-gray-600 transition-colors`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
          <span className={`font-mono text-sm ${textPrimary}`}>{item}</span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopy(item);
          }}
          className={`opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded ${isCopied
              ? "bg-green-100 dark:bg-green-900/30"
              : "hover:bg-gray-200 dark:hover:bg-gray-700"
            } ${darkMode ? "text-gray-400" : "text-gray-500"
            } hover:text-gray-700 dark:hover:text-gray-300`}
          title={isCopied ? "Copied!" : "Copy to clipboard"}
        >
          {isCopied ? (
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          )}
        </button>
      </div>
    </li>
  );
};

// Memoized main list item
const MainListItem = ({
  item,
  darkMode,
  onDelete,
  loading,
}: {
  item: string;
  index: number;
  darkMode: boolean;
  onDelete: (item: string) => void;
  loading: boolean;
}) => {
  const textPrimary = darkMode ? "text-gray-100" : "text-gray-800";

  return (
    <li
      data-id={item}
      className={`group cursor-grab active:cursor-grabbing ${darkMode ? "bg-gray-800" : "bg-gray-50"
        } border ${darkMode ? "border-gray-700" : "border-gray-200"
        } py-1 px-4 rounded hover:border-gray-400 transition-all duration-150`}
    >
      <div className="flex items-center gap-3">
        <svg
          className={`w-4 h-4 ${darkMode ? "text-gray-500" : "text-gray-400"
            } group-hover:text-gray-600 transition-colors`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8h16M4 16h16"
          />
        </svg>
        <span className={`font-mono text-sm ${textPrimary}`}>{item}</span>

        <Button
          disabled={loading}
          size="sm"
          variant="ghost"
          onClick={() => onDelete(item)}
          className="text-white bg-red-700 hover:bg-red-900 hover:text-white ml-auto"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
};

export default function HpNumbersPage() {
  const [hp_numbers, setHpNumbers] = useState<string[]>([]);
  const [hp_numbers_temp, setHpNumbersTemp] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [serverSearchQuery, setServerSearchQuery] = useState("");
  const [newHpNumber, setNewHpNumber] = useState("");
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isMainLoading, setIsMainLoading] = useState(true);
  const [isTempLoading, setIsTempLoading] = useState(true);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const originalHpNumbersRef = useRef<string[]>([]);
  const originalTempNumbersRef = useRef<string[]>([]);
  const theme = useTheme();
  const hpNumbersRef = useRef<HTMLUListElement>(null);
  const hpNumbersTempRef = useRef<HTMLUListElement>(null);
  const dragInitializedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const darkMode = theme.theme === "dark";

  // Fetch data with pagination and search
  const fetchData = useCallback(async (pageNum: number, search: string, isInitial = false) => {
    setIsMainLoading(true);
    if (isInitial) setIsTempLoading(true);

    try {
      const res = await fetch(`/api/hp-number-lists?page=${pageNum}&pageSize=${pageSize}&search=${search}`);
      const data = await res.json();

      setHpNumbers(data.hpNumbersList || []);
      if (isInitial) {
        setHpNumbersTemp(data.hpNumbersTempList || []);
        originalTempNumbersRef.current = data.hpNumbersTempList || [];
        setIsTempLoading(false);
      }

      setTotalCount(data.pagination?.totalCount || 0);
      setTotalPages(data.pagination?.totalPages || 0);
      originalHpNumbersRef.current = data.hpNumbersList || [];
      setIsMainLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setIsMainLoading(false);
      setIsTempLoading(false);
      toast({
        variant: "destructive",
        description: "Failed to fetch REC numbers.",
      });
    }
  }, [pageSize]);

  useEffect(() => {
    fetchData(page, serverSearchQuery, page === 1 && serverSearchQuery === "");
  }, [page, serverSearchQuery, fetchData]);

  // Initialize drag and drop only once
  useEffect(() => {
    if (
      !isMainLoading &&
      !isTempLoading &&
      !dragInitializedRef.current &&
      hpNumbersRef.current &&
      hpNumbersTempRef.current
    ) {
      dragInitializedRef.current = true;

      dragAndDrop({
        parent: hpNumbersTempRef.current,
        getValues: () => {
          return Array.from(hpNumbersTempRef.current!.children).map(
            (li: Element) => (li as HTMLElement).dataset.id || ""
          );
        },
        setValues: (newValues) => {
          setHpNumbersTemp(newValues as string[]);
        },
        config: {
          group: "hpGroup",
          accepts: () => false,
        },
      });

      dragAndDrop({
        parent: hpNumbersRef.current,
        getValues: () => {
          return Array.from(hpNumbersRef.current!.children).map(
            (li: Element) => (li as HTMLElement).dataset.id || ""
          );
        },
        setValues: (newValues) => {
          setHpNumbers(newValues as string[]);
        },
        config: {
          group: "hpGroup",
          accepts: () => true,
          sortable: false,
        },
      });
    }
  }, [isMainLoading, isTempLoading]);

  // Check if dirty (only for temp list now, as main list is managed per-action)
  useEffect(() => {
    if (!isTempLoading) {
      const isDifferent = !arraysAreEqual(
        hp_numbers_temp,
        originalTempNumbersRef.current
      );
      setIsDirty(isDifferent);
    }
  }, [hp_numbers_temp, isTempLoading]);

  // Client-side filtering on the current page
  const filteredHpNumbers = useMemo(() => {
    if (!searchQuery) return hp_numbers;
    const query = searchQuery.toLowerCase();
    return hp_numbers.filter((item) => item?.toLowerCase().includes(query));
  }, [hp_numbers, searchQuery]);

  // Excel Bulk Upload
  const handleBulkUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsBulkUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        const numbers = jsonData
          .map(row => String(row[0]).trim())
          .filter(num => num && num !== "REC Number" && num !== "undefined" && num !== "null");

        if (numbers.length === 0) {
          toast({
            variant: "destructive",
            description: "No valid numbers found in the first column.",
          });
          setIsBulkUploading(false);
          return;
        }

        const res = await fetch("/api/hp-number-lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hp_numbers: numbers,
            operation: "bulk_add"
          }),
        });

        const result = await res.json();
        if (res.ok) {
          toast({
            variant: "success",
            description: result.message,
          });
          fetchData(1, "", true);
          setPage(1);
          setServerSearchQuery("");
        } else {
          throw new Error(result.error || "Upload failed");
        }
      } catch (error) {
        console.error("Bulk upload error:", error);
        toast({
          variant: "destructive",
          description: error instanceof Error ? error.message : "Failed to process Excel file.",
        });
      } finally {
        setIsBulkUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  }, [fetchData]);

  // Download Excel function
  const downloadExcel = useCallback(
    (data: string[], filename: string, sheetName: string) => {
      try {
        const wsData = [["REC Number"], ...data.map((item) => [item])];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws["!cols"] = [{ wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        const timestamp = new Date().toISOString().split("T")[0];
        const fullFilename = `${filename}_${timestamp}.xlsx`;
        XLSX.writeFile(wb, fullFilename);
        toast({
          variant: "success",
          description: `${filename} downloaded successfully!`,
        });
      } catch (error) {
        console.error("Error downloading Excel:", error);
        toast({
          variant: "destructive",
          description: "Failed to download Excel file.",
        });
      }
    },
    []
  );

  const handleDownloadTempList = useCallback(() => {
    downloadExcel(hp_numbers_temp, "HP_Numbers_Temp", "Temp List");
  }, [hp_numbers_temp, downloadExcel]);

  const handleDownloadMainList = useCallback(() => {
    downloadExcel(hp_numbers, "HP_Numbers_Main_Page", "Main List");
  }, [hp_numbers, downloadExcel]);

  const handleSave = useCallback(async () => {
    try {
      const res = await fetch("/api/hp-number-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hp_numbers_temp }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          variant: "destructive",
          description: "Failed to update Temp list.",
        });
        return;
      }

      toast({
        variant: "success",
        description: data.message || "Temp list updated successfully.",
      });
      originalTempNumbersRef.current = hp_numbers_temp;
      setIsDirty(false);
    } catch (error) {
      console.error("Error saving data:", error);
      toast({
        variant: "destructive",
        description: "Error saving data to database.",
      });
    }
  }, [hp_numbers_temp]);

  const toggleItemSelection = useCallback((item: string) => {
    setSelectedItems((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(item)) {
        newSelected.delete(item);
      } else {
        newSelected.add(item);
      }
      return newSelected;
    });
  }, []);

  const handleCopy = useCallback((item: string) => {
    navigator.clipboard.writeText(item);
    setCopiedItem(item);
    setTimeout(() => setCopiedItem(null), 2000);
  }, []);

  const moveSelectedItems = useCallback(() => {
    if (selectedItems.size === 0) return;

    const itemsToMove = Array.from(selectedItems);
    const hpNumbersSet = new Set(hp_numbers);
    const uniqueItems = itemsToMove.filter((item) => !hpNumbersSet.has(item));

    setHpNumbers((prev) => [...prev, ...uniqueItems]);
    setHpNumbersTemp((prev) =>
      prev.filter((item) => !selectedItems.has(item))
    );
    setSelectedItems(new Set());
  }, [selectedItems, hp_numbers]);

  const selectAll = useCallback(() => {
    setSelectedItems(new Set(hp_numbers_temp));
  }, [hp_numbers_temp]);

  const deselectAll = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const handleAddHpNumber = useCallback(async () => {
    const trimmed = newHpNumber.trim();
    if (!trimmed) return;

    try {
      const res = await fetch("/api/hp-number-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hp_numbers: [trimmed],
          operation: "bulk_add"
        }),
      });

      if (res.ok) {
        toast({ variant: "success", description: "Number added." });
        setNewHpNumber("");
        fetchData(page, serverSearchQuery);
      } else {
        const data = await res.json();
        toast({ variant: "destructive", description: data.error || "Failed to add number." });
      }
    } catch (error) {
            console.error(error)

      toast({ variant: "destructive", description: "Error adding number." });
    }
  }, [newHpNumber, page, serverSearchQuery, fetchData]);

  const handleDeleteHpNumber = useCallback(async (item: string) => {
    try {
      const res = await fetch(`/api/hp-number-lists?number=${item}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setHpNumbers((prev) => prev.filter((num) => num !== item));
        toast({ variant: "success", description: "Number deleted." });
        fetchData(page, serverSearchQuery);
      }
    } catch (error) {
      console.error(error)
      toast({ variant: "destructive", description: "Delete failed." });
    }
  }, [page, serverSearchQuery, fetchData]);

  const handleServerSearch = () => {
    setPage(1);
    setServerSearchQuery(searchQuery);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setServerSearchQuery("");
    setPage(1);
  };

  // Memoized style values
  const cardBg = darkMode ? "bg-sidebar" : "bg-white";
  const borderColor = darkMode ? "border-blue-500/30" : "border-blue-200";
  const textPrimary = darkMode ? "text-gray-100" : "text-gray-800";
  const textSecondary = darkMode ? "text-gray-400" : "text-gray-600";

  const skeletonItems = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-[38px] w-full" />
      )),
    []
  );

  return (
    <div
      className={`${darkMode ? "" : "bg-gray-50"
        } p-6 transition-colors duration-300`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h1 className={`text-2xl font-semibold ${textPrimary} mb-1`}>
              REC Numbers Management
            </h1>
            <p className={`text-sm ${textSecondary}`}>
              Select and move items from Temp to Main list
            </p>
          </div>
          <div className="flex gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleBulkUpload}
              accept=".xlsx, .xls"
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isBulkUploading}
              className="bg-green-600 hover:bg-green-700 text-white flex gap-2"
            >
              {isBulkUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Bulk Add Excel
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* hp_numbers_temp */}
          <div className="flex-1 w-full mt-11">
            <div
              className={`${cardBg} rounded-lg border ${borderColor} overflow-hidden`}
            >
              <div
                className={`${darkMode
                    ? "bg-gray-800 border-b border-gray-700"
                    : "bg-white border-b border-gray-200"
                  } px-4 py-3`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h2
                    className={`text-base font-semibold ${textPrimary} flex items-center gap-2`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    REC Numbers Temp
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadTempList}
                      disabled={hp_numbers_temp.length === 0}
                      className={`text-xs px-3 py-1.5 flex items-center gap-1.5 ${hp_numbers_temp.length === 0
                          ? darkMode
                            ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : darkMode
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-green-600 hover:bg-green-700 text-white"
                        } rounded transition-colors font-medium`}
                      title="Download as Excel"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Excel
                    </button>
                    <button
                      onClick={selectAll}
                      className={`text-xs px-3 py-1.5 ${darkMode
                          ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        } rounded transition-colors font-medium`}
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAll}
                      className={`text-xs px-3 py-1.5 ${darkMode
                          ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        } rounded transition-colors font-medium`}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <p className={`text-xs ${textSecondary}`}>
                  {hp_numbers_temp.length} items ({selectedItems.size} selected)
                </p>
              </div>
              <ul
                ref={hpNumbersTempRef}
                className="p-4 max-h-[400px] min-h-[400px] overflow-y-auto space-y-1.5"
              >
                {isTempLoading ? (
                  skeletonItems
                ) : hp_numbers_temp.length === 0 ? (
                  <li className={`text-center ${textSecondary} py-12 text-sm`}>
                    No items in temp list
                  </li>
                ) : (
                  hp_numbers_temp.map((item, i) => (
                    <TempListItem
                      key={`${item}-${i}`}
                      item={item}
                      index={i}
                      isSelected={selectedItems.has(item)}
                      isCopied={copiedItem === item}
                      darkMode={darkMode}
                      onToggleSelect={toggleItemSelection}
                      onCopy={handleCopy}
                    />
                  ))
                )}
              </ul>
            </div>
          </div>

          {/* Move button */}
          <div className="flex items-center justify-center rotate-90 lg:rotate-0 lg:py-48 py-2">
            <button
              onClick={moveSelectedItems}
              disabled={selectedItems.size === 0}
              className={`group relative p-3 rounded-lg transition-all duration-200 ${selectedItems.size === 0
                  ? darkMode
                    ? "bg-gray-800 cursor-not-allowed"
                    : "bg-gray-200 cursor-not-allowed"
                  : darkMode
                    ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                    : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                }`}
            >
              <ChevronRight
                className={`w-6 h-6 ${selectedItems.size === 0 ? "text-gray-400" : "text-white"
                  }`}
              />
              {selectedItems.size > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {selectedItems.size}
                </span>
              )}
            </button>
          </div>

          {/* hp_numbers */}
          <div className="flex-1 w-full">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search REC number..."
                    className="pr-10"
                  />
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <Button onClick={handleServerSearch} className="flex gap-2">
                  <Search className="w-4 h-4" />
                  Search
                </Button>
              </div>

              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newHpNumber}
                  onChange={(e) => setNewHpNumber(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddHpNumber()}
                  placeholder="Add new REC number"
                />
                <Button onClick={handleAddHpNumber}>Add</Button>
              </div>
            </div>

            <div
              className={`${cardBg} rounded-lg border ${borderColor} overflow-hidden`}
            >
              <div
                className={`${darkMode
                    ? "bg-gray-800 border-b border-gray-700"
                    : "bg-white border-b border-gray-200"
                  } px-4 py-3`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2
                    className={`text-base font-semibold ${textPrimary} flex items-center gap-2`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                    REC Numbers
                  </h2>
                  <button
                    onClick={handleDownloadMainList}
                    disabled={hp_numbers.length === 0}
                    className={`text-xs px-3 py-1.5 flex items-center gap-1.5 ${hp_numbers.length === 0
                        ? darkMode
                          ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : darkMode
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      } rounded transition-colors font-medium`}
                    title="Download as Excel"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Excel
                  </button>
                </div>
                <p className={`text-xs ${textSecondary}`}>
                  Main list ({totalCount} total items)
                </p>
              </div>
              <ul
                ref={hpNumbersRef}
                className="p-3 max-h-[400px] min-h-[400px] overflow-y-auto space-y-1.5"
              >
                {isMainLoading ? (
                  skeletonItems
                ) : filteredHpNumbers.length === 0 ? (
                  <li className={`text-center ${textSecondary} py-12 text-sm`}>
                    {searchQuery
                      ? "No results found"
                      : "Drag or move items here"}
                  </li>
                ) : (
                  filteredHpNumbers.map((item, i) => (
                    <MainListItem
                      key={`${item}-${i}`}
                      item={item}
                      index={i}
                      darkMode={darkMode}
                      onDelete={handleDeleteHpNumber}
                      loading={isMainLoading}
                    />
                  ))
                )}
              </ul>

              {/* Pagination UI */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                <span className="text-xs text-gray-500">
                  Page {page} of {totalPages || 1}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1 || isMainLoading}
                    onClick={() => setPage(p => p - 1)}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages || totalPages === 0 || isMainLoading}
                    onClick={() => setPage(p => p + 1)}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className={`px-6 py-2.5 text-sm font-medium rounded transition-colors flex items-center gap-2 ${isDirty
                ? darkMode
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-400 cursor-not-allowed text-gray-200"
              }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            Save Changes
          </button>
        </div>
        {isDirty && (
          <p className="mt-2 text-xs text-red-500 font-medium text-center">
            You have unsaved changes
          </p>
        )}
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);