"use client";

import { useEffect, useState, useRef } from "react";
import { mutate } from "swr";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

import CustomLoader from "./ui/CustomLoader";
import { toast } from "@/hooks/use-toast";

const createCampaignSchema = z.object({
  campaign_name: z.string().min(1, "Campaign name is required"),
  campaign_description: z.string().optional(),
  greeting_label: z.string().optional(),
  no_transcription_label: z.string().optional(),
  isactive: z.boolean().default(true),
  campaign_code: z.string().optional(),
  extension: z.string().optional(),
});

type CreateCampaignValues = z.infer<typeof createCampaignSchema>;

type CreateOrUpdateCampaignProps = {
  mode?: "create" | "update";
  initialData?: Partial<CreateCampaignValues>;
  campaignId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function CreateUpdateCampaign({
  mode = "create",
  initialData,
  campaignId,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: CreateOrUpdateCampaignProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isDialogOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setDialogOpen =
    externalOnOpenChange !== undefined ? externalOnOpenChange : setInternalOpen;

  const form = useForm<CreateCampaignValues>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: initialData ?? {
      campaign_name: "",
      campaign_description: "",
      greeting_label: "",
      no_transcription_label: "",
      isactive: true,
      campaign_code: "",
      extension: "",
    },
  });

  const lastResetData = useRef<string>("");

  useEffect(() => {
    if (isDialogOpen && initialData) {
      const currentDataStr = JSON.stringify(initialData);
      if (currentDataStr !== lastResetData.current) {
        form.reset(initialData);
        lastResetData.current = currentDataStr;
      }
    } else if (!isDialogOpen) {
      lastResetData.current = "";
    }
  }, [isDialogOpen, initialData, form]);

  const onSubmit = async (data: CreateCampaignValues) => {
    const payload = {
      ...data,
      campaign_code:
        data.campaign_code === "" || data.campaign_code === undefined
          ? null
          : Number(data.campaign_code),
      campaign_id: campaignId,
    };

    const res = await fetch(`/api/campaigns`, {
      method: mode === "update" ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!result.ok) {
      toast({
        variant: "destructive",
        description: result.error || "Something went wrong",
      });
      return;
    }

    toast({
      variant: "success",
      description:
        result.message ||
        (mode === "update"
          ? "Campaign updated successfully"
          : "Campaign created successfully"),
    });

    mutate("/api/campaigns");
    mutate("/api/fetchCampaigns");

    if (mode === "create") {
      form.reset();
    }
    setDialogOpen(false);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button>
          <Edit className={`${mode === "update" ? "mr-0" : "mr-2"} h-4 w-4`} />
          {mode === "update" ? "" : "Create Campaign"}
        </Button>
      </DialogTrigger>

      <DialogContent
        aria-describedby="Campaign form"
        className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>
            {mode === "update" ? "Update Campaign" : "Create Campaign"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="campaign_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter campaign name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="campaign_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Code</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter campaign code"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="extension"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Extension</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter extension"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="greeting_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Greeting Label</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter greeting label"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="no_transcription_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No Transcription Label</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter no transcription label"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="campaign_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter campaign description"
                        rows={3}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isactive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(val) => field.onChange(Boolean(val))}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Is Active</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <span className="mr-5">
                      {mode === "update" ? "Updating..." : "Creating..."}
                    </span>
                    <CustomLoader />
                  </>
                ) : mode === "update" ? (
                  "Update Campaign"
                ) : (
                  "Create Campaign"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
