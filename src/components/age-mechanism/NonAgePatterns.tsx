"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR, { mutate } from "swr";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

import { NonAgePattern } from "@/types/ageMechanism";
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

const API_ROUTE = "/api/age-classifier/non-age-patterns";

const nonAgeSchema = z.object({
  text: z.string().min(1, "Text is required"),
  classification: z.enum(["NO", "UNSURE"], {
    required_error: "Classification is required",
  }),
  active: z.boolean(),
});

type NonAgeFormValues = z.infer<typeof nonAgeSchema>;

export default function NonAgePatterns() {
  const { data, error, isLoading } = useSWR<NonAgePattern[]>(
    API_ROUTE,
    fetcher
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NonAgePattern | null>(null);
  const [search, setSearch] = useState("");

  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (item) =>
        item.text.toLowerCase().includes(q) ||
        item.classification.toLowerCase().includes(q)
    );
  }, [data, search]);

  const form = useForm<NonAgeFormValues>({
    resolver: zodResolver(nonAgeSchema),
    defaultValues: { text: "", classification: "NO", active: true },
  });

  const openCreate = () => {
    setEditingItem(null);
    form.reset({ text: "", classification: "NO", active: true });
    setDialogOpen(true);
  };

  const openEdit = (item: NonAgePattern) => {
    setEditingItem(item);
    form.reset({
      text: item.text,
      classification: item.classification,
      active: item.active,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: NonAgeFormValues) => {
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
        description: editingItem
          ? "Non-age pattern updated"
          : "Non-age pattern added",
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

      toast({ variant: "success", description: "Non-age pattern deleted" });
      mutate(API_ROUTE);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", description: "Failed to delete" });
    }
  };

  const handleToggleActive = async (item: NonAgePattern) => {
    try {
      const res = await fetch(API_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: item.text,
          classification: item.classification,
          active: !item.active,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");

      toast({
        variant: "success",
        description: `Non-age pattern ${item.active ? "deactivated" : "activated"}`,
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

  const classificationTemplate = (rowData: NonAgePattern) => (
    <Badge variant={rowData.classification === "NO" ? "destructive" : "secondary"}>
      {rowData.classification}
    </Badge>
  );

  const activeTemplate = (rowData: NonAgePattern) => (
    <Badge
      variant={rowData.active ? "default" : "destructive"}
      className="cursor-pointer"
      onClick={() => handleToggleActive(rowData)}
    >
      {rowData.active ? "Active" : "Inactive"}
    </Badge>
  );

  const actionsTemplate = (rowData: NonAgePattern) => (
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
            <AlertDialogTitle>Delete Non-Age Pattern</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this non-age pattern?
              This action cannot be undone.
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
        Failed to load non-age patterns. Please try again.
      </div>
    );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Text patterns classified as non-age responses (NO or UNSURE)
          </p>
          <Badge variant="secondary">
            {filteredData.length}{data && filteredData.length !== data.length ? ` / ${data.length}` : ""} entries
          </Badge>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search non-age patterns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full sm:w-[250px]"
            />
          </div>
          <Button
            onClick={openCreate}
            className="bg-gradient-to-br from-blue-600 to-purple-600 text-white hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(102,126,234,0.4)] shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Non-Age Pattern
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
        >
          <Column
            field="text"
            header="Text Pattern"
            sortable
            style={{ padding: "8px", background: "transparent", width: "35%" }}
          />
          <Column
            header="Classification"
            body={classificationTemplate}
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
              {editingItem ? "Edit Non-Age Pattern" : "Add Non-Age Pattern"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Text Pattern</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='e.g. "put me on do not call list"'
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
                name="classification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classification</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select classification" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NO">NO</SelectItem>
                          <SelectItem value="UNSURE">UNSURE</SelectItem>
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
                  "Update Non-Age Pattern"
                ) : (
                  "Add Non-Age Pattern"
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
