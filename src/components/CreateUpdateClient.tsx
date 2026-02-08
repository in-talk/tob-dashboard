"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { mutate } from "swr";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit } from "lucide-react";

import { User } from "@/types/user";
import { Model } from "@/types/model";
import { Campaign } from "@/pages/keyword_finder";
import { createClientData } from "@/constants";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import CustomLoader from "./ui/CustomLoader";
import { toast } from "@/hooks/use-toast";

const createClientSchema = z.object({
  user_id: z.number({ invalid_type_error: "User is required" }),
  campaign_id: z.number({ invalid_type_error: "Campaign is required" }),
  model: z.number().min(1, "Model is required"),
  version: z.number().min(1, "Version is required"),
  is_active: z.boolean().default(true),
  number_of_lines: z.number().min(1, "Number of lines is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string(),
  updated_by: z.string(),
  vicidial_address: z.string(),
  vicidial_api_user: z.string(),
  vicidial_api_password: z.string(),
  transfer_group_name: z.string(),
  vicidial_transfer_address: z.string(),
  vicidial_transfer_api_user: z.string(),
  vicidial_transfer_api_pass: z.string(),
  vicidial_transfer_user: z.string(),
  vicidial_transfer_address_folder: z.string().default("vicidial"),
  vicidial_address_folder: z.string().default("vicidial"),
  age_limit: z.string().default("40-80"),
});

export type CreateClientValues = z.infer<typeof createClientSchema>;

type CreateOrUpdateClientProps = {
  mode?: "create" | "update";
  initialData?: Partial<CreateClientValues>;
  client_id?: string;
  campaigns?: Campaign[];
  users?: User[];
  models?: Model[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  sessionUser?: string;
};


export default function CreateUpdateClient({
  mode = "create",
  initialData,
  client_id,
  campaigns,
  users,
  models,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  sessionUser,
}: CreateOrUpdateClientProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isDialogOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setDialogOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setInternalOpen;
  const form = useForm<CreateClientValues>({
    resolver: zodResolver(createClientSchema),
    defaultValues: initialData ?? {
      is_active: true,
      version: 1,
      model: 1,
      updated_by: sessionUser ?? "",
    },
  });

  const lastResetData = useRef<string>("");

  useEffect(() => {
    if (isDialogOpen && initialData) {
      const currentDataStr = JSON.stringify(initialData);
      if (currentDataStr !== lastResetData.current) {
        form.reset({
          ...initialData,
          updated_by: sessionUser ?? initialData?.updated_by ?? "",
        });
        lastResetData.current = currentDataStr;
      }
    } else if (!isDialogOpen) {
      lastResetData.current = "";
    }
  }, [isDialogOpen, initialData, form, sessionUser]);

  // Watch campaign_id to filter models
  const watchedCampaignId = useWatch({ control: form.control, name: "campaign_id" });

  const filteredModels = useMemo(() => {
    if (!models || !watchedCampaignId) return [];
    return models.filter(
      (m) => m.campaign_id?.toString() === watchedCampaignId.toString()
    );
  }, [models, watchedCampaignId]);

  // Reset model when campaign changes (only in create mode or when user actively changes)
  const prevCampaignId = useRef<number | undefined>(initialData?.campaign_id);
  useEffect(() => {
    if (watchedCampaignId && watchedCampaignId !== prevCampaignId.current) {
      // Only reset if it's not the initial load with existing data
      if (prevCampaignId.current !== undefined) {
        form.setValue("model", 0);
      }
      prevCampaignId.current = watchedCampaignId;
    }
  }, [watchedCampaignId, form]);

  const onSubmit = async (data: CreateClientValues) => {
    const payload = { ...data, metadata: {}, client_id };

    const res = await fetch(`/api/clients/`, {
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
          ? "Client updated successfully"
          : createClientData.message.success),
    });

    if (mode === "create") {
      setTimeout(() => {
        toast({
          variant: "default",
          title: "⚠️ Assign Agents",
          description:
            "Please assign agents to this client for it to work. Go to Forms → Client Agents to manage assignments.",
          duration: 8000,
        });
      }, 500);
    }

    mutate("/api/clients");

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
          {mode === "update" ? "" : createClientData.trigger.button}
        </Button>
      </DialogTrigger>

      <DialogContent
        aria-describedby="Client form"
        className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>
            {mode === "update"
              ? "Update Client"
              : createClientData.dialog.title}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
              <div className="flex flex-col justify-between">
                <FormField
                  control={form.control}
                  name="updated_by"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Updated by</FormLabel>
                      <FormControl>
                        <Input
                          className="!mt-0"
                          {...field}
                          readOnly
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input className="!mt-0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(val) =>
                            field.onChange(Boolean(val))
                          }
                        />
                      </FormControl>
                      <FormLabel className="!mt-0 ">Is Active</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="age_limit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age Limit</FormLabel>
                      <FormControl>
                        <Input
                          className="!mt-0"
                          {...field}
                          value={
                            typeof field.value === "string" ||
                              typeof field.value === "number"
                              ? field.value
                              : ""
                          }
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea className="!mt-0" {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2 ">
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(val) => field.onChange(Number(val))}
                            value={field.value ? field.value.toString() : ""}
                          >
                            <SelectTrigger className="w-full !mt-0">
                              <SelectValue placeholder={
                                !watchedCampaignId
                                  ? "Select campaign first"
                                  : filteredModels.length === 0
                                    ? "No models for this campaign"
                                    : "Select model"
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredModels.map((model) => (
                                <SelectItem
                                  key={model.model_id}
                                  value={model.model_number.toString()}
                                >
                                  {model.model_name} (#{model.model_number})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {["version", "number_of_lines"].map((fieldName) => (
                    <FormField
                      key={fieldName}
                      control={form.control}
                      name={fieldName as keyof CreateClientValues}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{fieldName.replace(/_/g, " ")}</FormLabel>
                          <FormControl>
                            <Input
                              className="!mt-0"
                              type="number"
                              value={
                                field.value !== undefined &&
                                  field.value !== null
                                  ? String(field.value)
                                  : ""
                              }
                              onChange={(e) =>
                                field.onChange(
                                  e.target.value === ""
                                    ? undefined
                                    : Number(e.target.value)
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
              <FormField
                control={form.control}
                name="user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel >User</FormLabel>
                    <FormControl>
                      <Select

                        onValueChange={(val) => field.onChange(Number(val))}
                        value={field.value?.toString() ?? ""}
                      >
                        <SelectTrigger className="w-full !mt-0">
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users?.map((user) => (
                            <SelectItem
                              key={user.id}
                              value={user.id.toString()}
                            >
                              {user.name} ({user.email})
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
                name="campaign_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(val) => field.onChange(Number(val))}
                        value={field.value?.toString() ?? ""}
                      >
                        <SelectTrigger className="w-full !mt-0">
                          <SelectValue placeholder="Select campaign" />
                        </SelectTrigger>
                        <SelectContent>
                          {campaigns?.map((campaign) => (
                            <SelectItem
                              key={campaign.campaign_id}
                              value={campaign.campaign_id.toString()}
                            >
                              {campaign.campaign_name}-{campaign.campaign_code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
              <div>
                {[
                  "vicidial_address",
                  "vicidial_address_folder",
                  "vicidial_api_user",
                  "vicidial_api_password",
                  "transfer_group_name",
                ].map((fieldName) => (
                  <FormField
                    key={fieldName}
                    control={form.control}
                    name={fieldName as keyof CreateClientValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{fieldName.replace(/_/g, " ")}</FormLabel>
                        <FormControl>
                          <Input
                            className="!mt-0"
                            {...field}
                            value={
                              typeof field.value === "string" ||
                                typeof field.value === "number"
                                ? field.value
                                : ""
                            }
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <div>
                {[
                  "vicidial_transfer_address",
                  "vicidial_transfer_address_folder",
                  "vicidial_transfer_api_user",
                  "vicidial_transfer_api_pass",
                  "vicidial_transfer_user",
                ].map((fieldName) => (
                  <FormField
                    key={fieldName}
                    control={form.control}
                    name={fieldName as keyof CreateClientValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{fieldName.replace(/_/g, " ")}</FormLabel>
                        <FormControl>
                          <Input
                            className="!mt-0"
                            {...field}
                            value={
                              typeof field.value === "string" ||
                                typeof field.value === "number"
                                ? field.value
                                : ""
                            }
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <span className="mr-5">
                      {mode === "update"
                        ? "Updating..."
                        : createClientData.button.submitting}
                    </span>
                    <CustomLoader />
                  </>
                ) : mode === "update" ? (
                  "Update Client"
                ) : (
                  createClientData.button.submit
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
