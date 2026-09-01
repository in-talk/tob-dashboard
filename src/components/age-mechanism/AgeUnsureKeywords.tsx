"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR, { mutate } from "swr";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import {
  DataTable,
  type DataTableSelectionMultipleChangeEvent,
} from "primereact/datatable";
import { Column } from "primereact/column";

import { AgeUnsureKeyword } from "@/types/ageMechanism";
import { fetcher } from "@/utils/fetcher";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import CustomLoader from "@/components/ui/CustomLoader";
import BulkDeleteButton from "@/components/age-mechanism/BulkDeleteButton";
import BulkAddDialog, {
  type ParsedLine,
} from "@/components/age-mechanism/BulkAddDialog";
import { bulkCreate, bulkDelete } from "@/components/age-mechanism/bulkOps";

const API_ROUTE = "/api/age-classifier/age-unsure-label-keywords";

const VALID_LABELS = ["DNC", "AH", "NI", "IDL"] as const;

const LABEL_COLORS: Record<string, { variant: "default" | "destructive" | "secondary"; className?: string }> = {
  DNC: { variant: "destructive" },
  AH: { variant: "default" },
  NI: { variant: "secondary" },
};

const keywordSchema = z.object({
  keyword: z.string().min(1, "Keyword is required"),
  label: z.enum(["DNC", "AH", "NI", "IDL"], {
    required_error: "Label is required",
  }),
  active: z.boolean(),
});

type KeywordFormValues = z.infer<typeof keywordSchema>;

export default function AgeUnsureKeywords() {
  const { data, error, isLoading } = useSWR<AgeUnsureKeyword[]>(
    API_ROUTE,
    fetcher
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgeUnsureKeyword | null>(null);
  const [search, setSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState<string>("all");
  const [selected, setSelected] = useState<AgeUnsureKeyword[]>([]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    let result = data;
    if (labelFilter !== "all") {
      result = result.filter((item) => item.label === labelFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.keyword.toLowerCase().includes(q) ||
          item.label.toLowerCase().includes(q)
      );
    }
    return result;
  }, [data, search, labelFilter]);

  const form = useForm<KeywordFormValues>({
    resolver: zodResolver(keywordSchema),
    defaultValues: { keyword: "", label: "DNC", active: true },
  });

  const openCreate = () => {
    setEditingItem(null);
    form.reset({ keyword: "", label: "DNC", active: true });
    setDialogOpen(true);
  };

  const openEdit = (item: AgeUnsureKeyword) => {
    setEditingItem(item);
    form.reset({
      keyword: item.keyword,
      label: item.label,
      active: item.active,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: KeywordFormValues) => {
    try {
      const res = await fetch(API_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to save");
      }

      toast({
        variant: "success",
        description: editingItem ? "Keyword updated" : "Keyword added",
      });
      mutate(API_ROUTE);
      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        description:
          err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_ROUTE}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");

      toast({ variant: "success", description: "Keyword deleted" });
      mutate(API_ROUTE);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", description: "Failed to delete" });
    }
  };

  const handleBulkDelete = async () => {
    const ids = selected.map((item) => item.id);
    const { ok, failed } = await bulkDelete(API_ROUTE, ids);
    mutate(API_ROUTE);
    setSelected([]);
    toast({
      variant: failed ? "destructive" : "success",
      description: failed
        ? `Deleted ${ok}, failed ${failed}`
        : `Deleted ${ok} keyword${ok === 1 ? "" : "s"}`,
    });
  };

  const parseKeywordLine = (line: string): ParsedLine<KeywordFormValues> => {
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 2) {
      return { ok: false, error: "expected: keyword | label" };
    }
    const [keyword, rawLabel] = parts;
    if (!keyword) return { ok: false, error: "keyword is required" };
    const label = rawLabel.toUpperCase();
    if (!VALID_LABELS.includes(label as KeywordFormValues["label"])) {
      return {
        ok: false,
        error: `label must be DNC, AH, NI or IDL (got "${rawLabel}")`,
      };
    }
    return {
      ok: true,
      value: { keyword, label: label as KeywordFormValues["label"], active: true },
    };
  };

  const handleBulkAdd = async (items: KeywordFormValues[]) => {
    const { ok, failed } = await bulkCreate(API_ROUTE, items);
    mutate(API_ROUTE);
    toast({
      variant: failed ? "destructive" : "success",
      description: failed
        ? `Added ${ok}, failed ${failed}`
        : `Added ${ok} keyword${ok === 1 ? "" : "s"}`,
    });
  };

  const handleToggleActive = async (item: AgeUnsureKeyword) => {
    try {
      const res = await fetch(API_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: item.keyword,
          label: item.label,
          active: !item.active,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");

      toast({
        variant: "success",
        description: `Keyword ${item.active ? "deactivated" : "activated"}`,
      });
      mutate(API_ROUTE);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", description: "Failed to update status" });
    }
  };

  const ptConfig = useMemo(
    () => ({
      header: { className: "bg-white dark:bg-sidebar" },
      thead: { className: "dark:bg-sidebar" },
      tbody: { className: "dark:bg-sidebar" },
      headerRow: {
        className: "border-b dark:bg-sidebar text-sm border-gray-200 pb-2",
      },
      emptyMessage: { className: "dark:bg-sidebar" },
      bodyRow: {
        className:
          "border-b border-gray-200 dark:bg-sidebar dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
      },
    }),
    []
  );

  const labelTemplate = (rowData: AgeUnsureKeyword) => {
    const config = LABEL_COLORS[rowData.label] || { variant: "secondary" as const };
    return <Badge variant={config.variant}>{rowData.label}</Badge>;
  };

  const activeTemplate = (rowData: AgeUnsureKeyword) => (
    <Badge
      variant={rowData.active ? "default" : "destructive"}
      className="cursor-pointer"
      onClick={() => handleToggleActive(rowData)}
    >
      {rowData.active ? "Active" : "Inactive"}
    </Badge>
  );

  const actionsTemplate = (rowData: AgeUnsureKeyword) => (
    <div className="flex justify-center space-x-2">
      <Button
        variant="ghost"
        className="bg-gray-700 hover:bg-gray-600 text-white py-1 px-3 rounded-md"
        onClick={() => openEdit(rowData)}
      >
        <Edit className="h-4 w-4" />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            className="text-white bg-red-700 hover:bg-red-900 hover:text-white"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Keyword</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this keyword? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(rowData.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative w-12 h-12">
          <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-spin border-t-transparent"></div>
          <div className="absolute w-12 h-12 border-4 border-primary rounded-full animate-ping opacity-25"></div>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="text-destructive p-4">
        Failed to load age-unsure keywords. Please try again.
      </div>
    );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            DNC/AH/NI keywords for AGEUNSURE intent detection
          </p>
          <Badge variant="secondary">
            {filteredData.length}
            {data && filteredData.length !== data.length
              ? ` / ${data.length}`
              : ""}{" "}
            entries
          </Badge>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={labelFilter} onValueChange={setLabelFilter}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="DNC">DNC</SelectItem>
              <SelectItem value="AH">AH</SelectItem>
              <SelectItem value="NI">NI</SelectItem>
              <SelectItem value="IDL">IDL</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full sm:w-[250px]"
            />
          </div>
          {selected.length > 0 && (
            <BulkDeleteButton
              count={selected.length}
              itemNoun="keywords"
              onConfirm={handleBulkDelete}
            />
          )}
          <BulkAddDialog
            itemNoun="Keywords"
            placeholder={"stop calling | DNC\nalready have insurance | AH"}
            formatHint={
              <>
                One entry per line as{" "}
                <span className="font-mono">keyword | label</span>. Label must be
                DNC, AH, NI or IDL.
              </>
            }
            parseLine={parseKeywordLine}
            onSubmit={handleBulkAdd}
          />
          <Button
            onClick={openCreate}
            className="bg-gradient-to-br from-blue-600 to-purple-600 text-white hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(102,126,234,0.4)] shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Keyword
          </Button>
        </div>
      </div>

      <div className="bg-gray-100 px-3 sm:px-6 py-4 shadow-lg dark:bg-sidebar rounded-xl border overflow-x-auto">
        <DataTable
          value={filteredData}
          scrollable
          scrollHeight="550px"
          tableStyle={{ minWidth: "500px" }}
          showGridlines
          pt={ptConfig}
          size="normal"
          removableSort
          dataKey="id"
          selectionMode="checkbox"
          selection={selected}
          onSelectionChange={(
            e: DataTableSelectionMultipleChangeEvent<AgeUnsureKeyword[]>
          ) => setSelected(e.value)}
        >
          <Column
            selectionMode="multiple"
            headerStyle={{ width: "3rem" }}
            style={{ background: "transparent" }}
          />
          <Column
            field="keyword"
            header="Keyword"
            sortable
            style={{ padding: "8px", background: "transparent", width: "35%" }}
          />
          <Column
            header="Label"
            body={labelTemplate}
            sortable
            field="label"
            style={{ padding: "8px", background: "transparent", width: "15%" }}
          />
          <Column
            header="Status"
            body={activeTemplate}
            style={{ padding: "8px", background: "transparent", width: "15%" }}
          />
          <Column
            header="Actions"
            body={actionsTemplate}
            align="center"
            style={{ padding: "8px", background: "transparent", width: "25%" }}
          />
        </DataTable>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Keyword" : "Add Keyword"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="keyword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keyword</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g. "stop calling"'
                        {...field}
                        disabled={!!editingItem}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select label" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DNC">DNC (Do Not Call)</SelectItem>
                          <SelectItem value="AH">AH (Already Have)</SelectItem>
                          <SelectItem value="NI">NI (Not Interested)</SelectItem>
                          <SelectItem value="IDL">IDL (In Decision Loop)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(v) => field.onChange(v === "true")}
                        value={String(field.value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Active</SelectItem>
                          <SelectItem value="false">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <span className="mr-5">Saving...</span>
                    <CustomLoader />
                  </>
                ) : editingItem ? (
                  "Update Keyword"
                ) : (
                  "Add Keyword"
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
