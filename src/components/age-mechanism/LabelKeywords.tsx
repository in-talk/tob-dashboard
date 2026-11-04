"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR, { mutate } from "swr";
import { Edit, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import {
  DataTable,
  type DataTableSelectionMultipleChangeEvent,
} from "primereact/datatable";
import { Column } from "primereact/column";

import {
  type KeywordMatchType,
  type LabelDefinition,
  type LabelKeyword,
} from "@/types/ageMechanism";
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

const API_ROUTE = "/api/label-keywords";
const LABELS_ROUTE = "/api/label-keywords/labels";
const SYNC_ROUTE = "/api/label-keywords/sync-defaults";

const MATCH_TYPES: KeywordMatchType[] = ["word", "exact", "regex"];

const MATCH_TYPE_INFO: Record<KeywordMatchType, string> = {
  word: "Word — phrase anywhere in the transcript",
  exact: "Exact — the whole utterance equals it",
  regex: "Regex — regular expression, case-insensitive",
};

const keywordSchema = z.object({
  keyword: z.string().trim().min(1, "Keyword is required"),
  label: z.string().min(1, "Label is required"),
  match_type: z.enum(["word", "exact", "regex"]),
  active: z.boolean(),
});

type KeywordFormValues = z.infer<typeof keywordSchema>;

/** "T1", "T1, T2" or "any turn" for an early-hangup label. */
const turnsText = (def?: LabelDefinition) =>
  def?.turns?.length ? def.turns.map((t) => `T${t}`).join(", ") : "any turn";

export default function LabelKeywords() {
  const { data, error, isLoading } = useSWR<LabelKeyword[]>(API_ROUTE, fetcher);
  const { data: labelDefs } = useSWR<LabelDefinition[]>(LABELS_ROUTE, fetcher);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LabelKeyword | null>(null);
  const [search, setSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState<string>("all");
  const [selected, setSelected] = useState<LabelKeyword[]>([]);
  const [syncing, setSyncing] = useState(false);

  const defsByLabel = useMemo(
    () => new Map((labelDefs ?? []).map((d) => [d.label, d])),
    [labelDefs]
  );
  // Registered labels first (brain order), then any label only seen in data.
  const labelOptions = useMemo(() => {
    const labels = (labelDefs ?? []).map((d) => d.label);
    for (const item of data ?? []) {
      if (!labels.includes(item.label)) labels.push(item.label);
    }
    return labels;
  }, [labelDefs, data]);

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

  const emptyForm = (): KeywordFormValues => ({
    keyword: "",
    label: labelOptions[0] ?? "DNC",
    match_type: "word",
    active: true,
  });

  const form = useForm<KeywordFormValues>({
    resolver: zodResolver(keywordSchema),
    defaultValues: emptyForm(),
  });

  const openCreate = () => {
    setEditingItem(null);
    form.reset(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (item: LabelKeyword) => {
    setEditingItem(item);
    form.reset({
      keyword: item.keyword,
      label: item.label,
      match_type: item.match_type ?? "word",
      active: item.active,
    });
    setDialogOpen(true);
  };

  const postKeyword = async (values: KeywordFormValues) => {
    const res = await fetch(API_ROUTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.detail || body?.error || "Failed to save");
    }
  };

  const onSubmit = async (values: KeywordFormValues) => {
    try {
      await postKeyword(values);
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

  const parseKeywordLine = (parts: string[]): ParsedLine<KeywordFormValues> => {
    if (parts.length < 2) {
      return { ok: false, error: "expected: keyword | label [| match type]" };
    }
    const [keyword, rawLabel, rawMatch = "word"] = parts;
    if (!keyword) return { ok: false, error: "keyword is required" };
    const label = rawLabel.toUpperCase();
    if (!labelOptions.includes(label)) {
      return {
        ok: false,
        error: `label must be one of ${labelOptions.join(", ")} (got "${rawLabel}")`,
      };
    }
    const match_type = rawMatch.toLowerCase() as KeywordMatchType;
    if (!MATCH_TYPES.includes(match_type)) {
      return {
        ok: false,
        error: `match type must be word, exact or regex (got "${rawMatch}")`,
      };
    }
    return { ok: true, value: { keyword, label, match_type, active: true } };
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

  const handleToggleActive = async (item: LabelKeyword) => {
    try {
      // Send match_type too — the upsert would otherwise reset it to "word".
      await postKeyword({
        keyword: item.keyword,
        label: item.label,
        match_type: item.match_type ?? "word",
        active: !item.active,
      });
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

  const handleSyncDefaults = async () => {
    setSyncing(true);
    try {
      const res = await fetch(SYNC_ROUTE, { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      const result: { inserted: number; missing_labels: string[] } =
        await res.json();
      toast({
        variant: "success",
        description: result.inserted
          ? `Added ${result.inserted} default keyword${result.inserted === 1 ? "" : "s"} (${result.missing_labels.join(", ")})`
          : "All default keywords are already present",
      });
      mutate(API_ROUTE);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", description: "Failed to sync defaults" });
    } finally {
      setSyncing(false);
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

  const labelTemplate = (rowData: LabelKeyword) => {
    const def = defsByLabel.get(rowData.label);
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant={def?.early_hangup ? "destructive" : "secondary"}
          title={def?.description}
        >
          {rowData.label}
        </Badge>
        {def?.early_hangup && (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            hangup · {turnsText(def)}
          </span>
        )}
      </div>
    );
  };

  const matchTypeTemplate = (rowData: LabelKeyword) => (
    <span className="font-mono text-xs">{rowData.match_type ?? "word"}</span>
  );

  const activeTemplate = (rowData: LabelKeyword) => (
    <Badge
      variant={rowData.active ? "default" : "destructive"}
      className="cursor-pointer"
      onClick={() => handleToggleActive(rowData)}
    >
      {rowData.active ? "Active" : "Inactive"}
    </Badge>
  );

  const actionsTemplate = (rowData: LabelKeyword) => (
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
        Failed to load label keywords. Please try again.
      </div>
    );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Keywords per label — early hangup (RI, REC, FAS, DNC, AM) and
            campaign routing (AH, NI, IDL, …)
          </p>
          <Badge variant="secondary">
            {filteredData.length}
            {data && filteredData.length !== data.length
              ? ` / ${data.length}`
              : ""}{" "}
            entries
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Select value={labelFilter} onValueChange={setLabelFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {labelOptions.map((label) => (
                <SelectItem key={label} value={label}>
                  {label}
                </SelectItem>
              ))}
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
          <Button
            variant="outline"
            onClick={handleSyncDefaults}
            disabled={syncing}
            title="Add any built-in default keywords that are missing. Existing keywords are not changed."
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Sync defaults
          </Button>
          <BulkAddDialog
            itemNoun="Keywords"
            placeholder={"stop calling | DNC\nleave a voice message | AM | exact\n^press \\d+$ | AM | regex"}
            formatHint={
              <>
                One entry per line as{" "}
                <span className="font-mono">keyword | label | match type</span>.
                Match type is optional (word, exact or regex; default word).
                Label must be one of {labelOptions.join(", ")}.
              </>
            }
            columns={[
              { name: "keyword", required: true, hint: "Text to match (a pattern for regex)" },
              { name: "label", required: true, hint: labelOptions.join(", ") },
              { name: "match_type", hint: "word (default), exact or regex" },
            ]}
            parseCells={parseKeywordLine}
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
          tableStyle={{ minWidth: "600px" }}
          showGridlines
          pt={ptConfig}
          size="normal"
          removableSort
          dataKey="id"
          selectionMode="checkbox"
          selection={selected}
          onSelectionChange={(
            e: DataTableSelectionMultipleChangeEvent<LabelKeyword[]>
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
            style={{ padding: "8px", background: "transparent", width: "20%" }}
          />
          <Column
            header="Match"
            body={matchTypeTemplate}
            sortable
            field="match_type"
            style={{ padding: "8px", background: "transparent", width: "10%" }}
          />
          <Column
            header="Status"
            body={activeTemplate}
            style={{ padding: "8px", background: "transparent", width: "12%" }}
          />
          <Column
            header="Actions"
            body={actionsTemplate}
            align="center"
            style={{ padding: "8px", background: "transparent", width: "18%" }}
          />
        </DataTable>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[420px] max-h-[90vh] overflow-y-auto">
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select label" />
                        </SelectTrigger>
                        <SelectContent>
                          {labelOptions.map((label) => {
                            const def = defsByLabel.get(label);
                            return (
                              <SelectItem key={label} value={label}>
                                {label}
                                {def ? ` (${def.description})` : ""}
                                {def?.early_hangup
                                  ? ` — hangup, ${turnsText(def)}`
                                  : ""}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="match_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Match type</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MATCH_TYPES.map((mt) => (
                            <SelectItem key={mt} value={mt}>
                              {MATCH_TYPE_INFO[mt]}
                            </SelectItem>
                          ))}
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
