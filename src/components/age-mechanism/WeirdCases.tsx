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

import { WeirdCase } from "@/types/ageMechanism";
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

const API_ROUTE = "/api/age-classifier/weird-cases";

const VALID_CATEGORIES = ["phonetic", "slang", "other"];

const weirdCaseSchema = z.object({
  input: z.string().min(1, "Input is required"),
  output: z.string().min(1, "Output is required"),
  category: z.string().min(1, "Category is required"),
  active: z.boolean(),
});

type WeirdCaseFormValues = z.infer<typeof weirdCaseSchema>;

export default function WeirdCases() {
  const { data, error, isLoading } = useSWR<WeirdCase[]>(API_ROUTE, fetcher);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WeirdCase | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<WeirdCase[]>([]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (item) =>
        item.input.toLowerCase().includes(q) ||
        item.output.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [data, search]);

  const form = useForm<WeirdCaseFormValues>({
    resolver: zodResolver(weirdCaseSchema),
    defaultValues: { input: "", output: "", category: "phonetic", active: true },
  });

  const openCreate = () => {
    setEditingItem(null);
    form.reset({ input: "", output: "", category: "phonetic", active: true });
    setDialogOpen(true);
  };

  const openEdit = (item: WeirdCase) => {
    setEditingItem(item);
    form.reset({
      input: item.input,
      output: item.output,
      category: item.category,
      active: item.active,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: WeirdCaseFormValues) => {
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
        description: editingItem ? "Weird case updated" : "Weird case added",
      });
      mutate(API_ROUTE);
      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_ROUTE}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");

      toast({ variant: "success", description: "Weird case deleted" });
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
        : `Deleted ${ok} weird case${ok === 1 ? "" : "s"}`,
    });
  };

  const parseWeirdCaseLine = (line: string): ParsedLine<WeirdCaseFormValues> => {
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length < 2) {
      return { ok: false, error: "expected: input | output | category" };
    }
    const [input, output, rawCategory] = parts;
    if (!input) return { ok: false, error: "input is required" };
    if (!output) return { ok: false, error: "output is required" };
    const category = (rawCategory || "phonetic").toLowerCase();
    if (!VALID_CATEGORIES.includes(category)) {
      return { ok: false, error: `unknown category "${rawCategory}"` };
    }
    return { ok: true, value: { input, output, category, active: true } };
  };

  const handleBulkAdd = async (items: WeirdCaseFormValues[]) => {
    const { ok, failed } = await bulkCreate(API_ROUTE, items);
    mutate(API_ROUTE);
    toast({
      variant: failed ? "destructive" : "success",
      description: failed
        ? `Added ${ok}, failed ${failed}`
        : `Added ${ok} weird case${ok === 1 ? "" : "s"}`,
    });
  };

  const handleToggleActive = async (item: WeirdCase) => {
    try {
      const res = await fetch(API_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: item.input,
          output: item.output,
          category: item.category,
          active: !item.active,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");

      toast({
        variant: "success",
        description: `Weird case ${item.active ? "deactivated" : "activated"}`,
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

  const activeTemplate = (rowData: WeirdCase) => (
    <Badge
      variant={rowData.active ? "default" : "destructive"}
      className="cursor-pointer"
      onClick={() => handleToggleActive(rowData)}
    >
      {rowData.active ? "Active" : "Inactive"}
    </Badge>
  );

  const actionsTemplate = (rowData: WeirdCase) => (
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
            <AlertDialogTitle>Delete Weird Case</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this weird case? This
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
        Failed to load weird cases. Please try again.
      </div>
    );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            ASR misrecognitions mapped to age values
          </p>
          <Badge variant="secondary">
            {filteredData.length}{data && filteredData.length !== data.length ? ` / ${data.length}` : ""} entries
          </Badge>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search weird cases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full sm:w-[250px]"
            />
          </div>
          {selected.length > 0 && (
            <BulkDeleteButton
              count={selected.length}
              itemNoun="weird cases"
              onConfirm={handleBulkDelete}
            />
          )}
          <BulkAddDialog
            itemNoun="Weird Cases"
            placeholder={"sexy fox | 60 | phonetic\nad2 | 82 | phonetic"}
            formatHint={
              <>
                One entry per line as{" "}
                <span className="font-mono">input | output | category</span>.
                Category is optional (defaults to <em>phonetic</em>); valid
                values: phonetic, slang, other.
              </>
            }
            parseLine={parseWeirdCaseLine}
            onSubmit={handleBulkAdd}
          />
          <Button
            onClick={openCreate}
            className="bg-gradient-to-br from-blue-600 to-purple-600 text-white hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(102,126,234,0.4)] shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Weird Case
          </Button>
        </div>
      </div>

      <div className="bg-gray-100 px-3 sm:px-6 py-4 shadow-lg dark:bg-sidebar rounded-xl border overflow-x-auto">
        <DataTable
          value={filteredData}
          scrollable
          scrollHeight="550px"
          tableStyle={{ minWidth: "600px" }}
          showGridlines
          pt={ptConfig}
          size="normal"
          removableSort
          dataKey="id"
          selectionMode="checkbox"
          selection={selected}
          onSelectionChange={(
            e: DataTableSelectionMultipleChangeEvent<WeirdCase[]>
          ) => setSelected(e.value)}
        >
          <Column
            selectionMode="multiple"
            headerStyle={{ width: "3rem" }}
            style={{ background: "transparent" }}
          />
          <Column
            field="input"
            header="Input"
            sortable
            style={{ padding: "8px", background: "transparent", width: "25%" }}
          />
          <Column
            field="output"
            header="Output (Age)"
            sortable
            style={{ padding: "8px", background: "transparent", width: "15%" }}
          />
          <Column
            field="category"
            header="Category"
            sortable
            style={{ padding: "8px", background: "transparent", width: "20%" }}
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
              {editingItem ? "Edit Weird Case" : "Add Weird Case"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="input"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Input (ASR text)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g. "sexy fox"'
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
                name="output"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Output (Age)</FormLabel>
                    <FormControl>
                      <Input placeholder='e.g. "60"' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phonetic">Phonetic</SelectItem>
                          <SelectItem value="slang">Slang</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
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
                  "Update Weird Case"
                ) : (
                  "Add Weird Case"
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
