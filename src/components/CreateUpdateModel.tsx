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

import CustomLoader from "./ui/CustomLoader";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/Select";
import { Campaign } from "@/types/campaign";

const createModelSchema = z.object({
  model_name: z.string().min(1, "Model name is required"),
  campaign_id: z.string().min(1, "Campaign selection is required"),
  description: z.string().optional(),
  model_number: z.string().min(1, "Model number is required"),
});

type CreateModelValues = z.infer<typeof createModelSchema>;

type CreateOrUpdateModelProps = {
  mode?: "create" | "update";
  initialData?: Partial<CreateModelValues>;
  modelId?: string;
  campaigns?: Campaign[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function CreateUpdateModel({
  mode = "create",
  initialData,
  modelId,
  campaigns = [],
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: CreateOrUpdateModelProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isDialogOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setDialogOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setInternalOpen;

  const form = useForm<CreateModelValues>({
    resolver: zodResolver(createModelSchema),
    defaultValues: initialData ?? {
      model_name: "",
      campaign_id: "",
      description: "",
      model_number: "1",
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

  const onSubmit = async (data: CreateModelValues) => {
    const payload = { ...data, model_id: modelId };

    const res = await fetch(`/api/models`, {
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
          ? "Model updated successfully"
          : "Model created successfully"),
    });

    mutate("/api/models");

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
          {mode === "update" ? "" : "Create Model"}
        </Button>
      </DialogTrigger>

      <DialogContent
        aria-describedby="Model form"
        className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>
            {mode === "update" ? "Update Model" : "Create Model"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col gap-4">
              {/* Model Name */}
              <FormField
                control={form.control}
                name="model_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter model name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campaign Dropdown */}
              <FormField
                control={form.control}
                name="campaign_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
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

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter model description"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Model Number */}
              <FormField
                control={form.control}
                name="model_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model Number</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select model number" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <span className="mr-5">
                      {mode === "update" ? "Updating..." : "Creating..."}
                    </span>
                    <CustomLoader />
                  </>
                ) : mode === "update" ? (
                  "Update Model"
                ) : (
                  "Create Model"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
