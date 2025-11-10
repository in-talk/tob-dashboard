"use client";
import { useEffect, useRef, useState } from "react";
import { dragAndDrop } from "@formkit/drag-and-drop";
import { ChevronRight, Check, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const arraysAreEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

export default function HpNumbersPage() {
  const [hp_numbers, setHpNumbers] = useState<string[]>();
  const [hp_numbers_temp, setHpNumbersTemp] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newHpNumber, setNewHpNumber] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const originalHpNumbersRef = useRef<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const theme = useTheme();
  const hpNumbersRef = useRef<HTMLUListElement>(null);
  const hpNumbersTempRef = useRef<HTMLUListElement>(null);
  const darkMode = theme.theme === "dark";

  useEffect(() => {
    fetch("/api/hp-number-lists")
      .then((res) => res.json())
      .then((data) => {
        setHpNumbers(data.hpNumbersList || []);
        setHpNumbersTemp(data.hpNumbersTempList || []);
        setLoading(false);
        originalHpNumbersRef.current = data.hpNumbersList || [];
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!loading && hpNumbersRef.current && hpNumbersTempRef.current) {
      dragAndDrop({
        parent: hpNumbersTempRef.current,
        getValues: () => {
          return Array.from(hpNumbersTempRef.current!.children).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (li: any) => li.dataset.id
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (li: any) => li.dataset.id
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
  }, [loading]);

  useEffect(() => {
    if (!loading && hp_numbers) {
      const isDifferent = !arraysAreEqual(
        hp_numbers,
        originalHpNumbersRef.current
      );
      setIsDirty(isDifferent);
    }
  }, [hp_numbers, loading]);

  const handleSave = async () => {
    try {
      const res = await fetch("/api/hp-number-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hp_numbers, hp_numbers_temp }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({
          variant: "destructive",
          description: "Failed to update HP numbers.",
        });
        return;
      }

      toast({
        variant: "success",
        description: data.message || "HP numbers updated successfully.",
      });
      originalHpNumbersRef.current = hp_numbers ?? [];
      setIsDirty(false);
    } catch (error) {
      console.error("Error saving data:", error);

      toast({
        variant: "destructive",
        description: "Error saving data to database.",
      });
    }
  };

  const toggleItemSelection = (item: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(item)) {
      newSelected.delete(item);
    } else {
      newSelected.add(item);
    }
    setSelectedItems(newSelected);
  };

  const moveSelectedItems = () => {
    if (selectedItems.size === 0) return;
    if (!hp_numbers) return;

    const itemsToMove = Array.from(selectedItems);

    const uniqueItems = itemsToMove.filter(
      (item) => !hp_numbers?.includes(item)
    );

    setHpNumbers([...hp_numbers, ...uniqueItems]);

    setHpNumbersTemp(
      hp_numbers_temp.filter((item) => !itemsToMove.includes(item))
    );

    setSelectedItems(new Set());
  };

  const selectAll = () => {
    setSelectedItems(new Set(hp_numbers_temp));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const filteredHpNumbers = hp_numbers?.filter((item) =>
    item?.toLowerCase().includes(searchQuery?.toLowerCase())
  );

  const cardBg = darkMode ? "bg-sidebar " : "bg-white ";
  const borderColor = darkMode ? "border-blue-500/30" : "border-blue-200";
  const textPrimary = darkMode ? "text-gray-100" : "text-gray-800";
  const textSecondary = darkMode ? "text-gray-400" : "text-gray-600";

  const skeletonItems = Array.from({ length: 6 }).map((_, index) => (
    <Skeleton key={index} className="h-[38px] w-full" />
  ));

  return (
    <div
      className={` ${
        darkMode ? "" : "bg-gray-50"
      } p-6  transition-colors duration-300`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className={`text-2xl font-semibold ${textPrimary} mb-1`}>
            HP Numbers Management
          </h1>
          <p className={`text-sm ${textSecondary}`}>
            Select and move items from Temp to Main list
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-center ">
          {/* hp_numbers_temp */}
          <div className="flex-1 w-full mt-11">
            <div
              className={`${cardBg} rounded-lg border ${borderColor} overflow-hidden`}
            >
              <div
                className={`${
                  darkMode
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
                    HP Numbers Temp
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className={`text-xs px-3 py-1.5 ${
                        darkMode
                          ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      } rounded transition-colors font-medium`}
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAll}
                      className={`text-xs px-3 py-1.5 ${
                        darkMode
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
                className="p-4 max-h-[300px] min-h-[300px] overflow-y-auto space-y-1.5"
              >
                {hp_numbers_temp.length === 0 ? (
                  <li className={`text-center ${textSecondary} py-12 text-sm`}>
                    No items in temp list
                  </li>
                ) : loading ? (
                  skeletonItems
                ) : (
                  hp_numbers_temp.map((item, i) => (
                    <li
                      key={`${item}-${i}`}
                      data-id={`${item}-${i}`}
                      className={`group cursor-grab active:cursor-grabbing ${
                        darkMode ? "bg-gray-800" : "bg-gray-50"
                      } border ${
                        selectedItems.has(item)
                          ? darkMode
                            ? "border-blue-500 bg-blue-900/20"
                            : "border-blue-500 bg-blue-50"
                          : darkMode
                          ? "border-gray-700"
                          : "border-gray-200"
                      } px-4 py-2 rounded hover:border-gray-400 transition-all duration-150`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleItemSelection(item);
                          }}
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                            selectedItems.has(item)
                              ? "bg-blue-600 border-blue-600"
                              : darkMode
                              ? "border-gray-600 bg-transparent"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {selectedItems.has(item) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </button>
                        <svg
                          className={`w-4 h-4 ${
                            darkMode ? "text-gray-500" : "text-gray-400"
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
                        <span className={`font-mono text-sm ${textPrimary}`}>
                          {item}
                        </span>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          {/* Move button */}
          <div className="flex items-center justify-center rotate-90 lg:rotate-0 lg:py-32 py-2">
            <button
              onClick={moveSelectedItems}
              disabled={selectedItems.size === 0}
              className={`group relative p-3 rounded-lg transition-all duration-200 ${
                selectedItems.size === 0
                  ? darkMode
                    ? "bg-gray-800 cursor-not-allowed"
                    : "bg-gray-200 cursor-not-allowed"
                  : darkMode
                  ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
              }`}
            >
              <ChevronRight
                className={`w-6 h-6 ${
                  selectedItems.size === 0 ? "text-gray-400" : "text-white"
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
            <div className="flex justify-start lg:justify-between w-full ">
              <div className="flex items-center gap-2 mb-2 ">
                <label htmlFor="searchInput" className="text-sm">
                  Search
                </label>

                <input
                  type="text"
                  id="searchInput"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search HP number..."
                  className={`flex-1 px-3 py-1.5 text-sm border rounded ${
                    darkMode
                      ? "bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>

              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newHpNumber}
                  onChange={(e) => setNewHpNumber(e.target.value)}
                  placeholder="Add new HP number"
                  className={`flex-1 px-3 py-1.5 text-sm border rounded ${
                    darkMode
                      ? "bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500"
                      : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
                <button
                  onClick={() => {
                    const trimmed = newHpNumber.trim();
                    if (!trimmed) return;
                    if (hp_numbers?.includes(trimmed)) {
                      toast({
                        variant: "destructive",
                        description: "HP number already exists.",
                      });
                      return;
                    }
                    setHpNumbers([...(hp_numbers || []), trimmed]);
                    setNewHpNumber("");
                  }}
                  className={`text-sm px-3 py-1.5 ${
                    darkMode
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  } rounded font-medium`}
                >
                  Add
                </button>
              </div>
            </div>
            <div
              className={`${cardBg} rounded-lg border ${borderColor} overflow-hidden`}
            >
              <div
                className={`${
                  darkMode
                    ? "bg-gray-800 border-b border-gray-700"
                    : "bg-white border-b border-gray-200"
                } px-4 py-3`}
              >
                <h2
                  className={`text-base font-semibold ${textPrimary} flex items-center gap-2 mb-3`}
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
                  HP Numbers
                </h2>

                <p className={`text-xs ${textSecondary}`}>
                  Main list ({hp_numbers?.length} items)
                </p>
              </div>
              <ul
                ref={hpNumbersRef}
                className="p-3 max-h-[300px] min-h-[300px] overflow-y-auto space-y-1.5"
              >
                {filteredHpNumbers?.length === 0 ? (
                  <li className={`text-center ${textSecondary} py-12 text-sm`}>
                    Drag or move items here
                  </li>
                ) : loading ? (
                  skeletonItems
                ) : (
                  filteredHpNumbers?.map((item, i) => (
                    <li
                      key={`${item}-${i}`}
                      data-id={`${item}-${i}`}
                      className={`group cursor-grab active:cursor-grabbing ${
                        darkMode ? "bg-gray-800" : "bg-gray-50"
                      } border ${
                        darkMode ? "border-gray-700" : "border-gray-200"
                      } py-1 px-4 rounded hover:border-gray-400 transition-all duration-150`}
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className={`w-4 h-4 ${
                            darkMode ? "text-gray-500" : "text-gray-400"
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
                        <span className={`font-mono text-sm ${textPrimary}`}>
                          {item}
                        </span>

                        <Button
                          disabled={loading}
                          size={'sm'}
                          variant="ghost"
                          className="text-white bg-red-700 hover:bg-red-900 hover:text-white ml-auto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleSave}
            className={`px-6 py-2.5 text-sm font-medium rounded transition-colors flex items-center gap-2  ${
              darkMode
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
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
