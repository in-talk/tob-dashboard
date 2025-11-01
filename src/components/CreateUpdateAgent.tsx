"use client";

import { useState } from "react";
import { mutate } from "swr";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit } from "lucide-react";

import { createAgentData } from "@/constants";

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
import { Checkbox } from "@/components/ui/checkbox";

import CustomLoader from "./ui/CustomLoader";
import { toast } from "@/hooks/use-toast";

const createAgentSchema = z.object({
  is_active: z.boolean().default(true),
  agent_name: z.string().min(1, "Agent Name is required"),
});

export type CreateAgentValues = z.infer<typeof createAgentSchema>;

type CreateOrUpdateAgentProps = {
  mode?: "create" | "update";
  initialData?: Partial<CreateAgentValues>;
  agentId?: string;
};

export default function CreateUpdateAgent({
  mode = "create",
  initialData,
  agentId,
}: CreateOrUpdateAgentProps) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const form = useForm<CreateAgentValues>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: initialData ?? {
      is_active: true,
      agent_name: "",
    },
  });

  const onSubmit = async (data: CreateAgentValues) => {
    const payload = { ...data, metadata: {}, agent_id: agentId };

    const res = await fetch(`/api/agents/`, {
      method: mode === "update" ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      toast({
        variant: "destructive",
        description: result.error || "Something went wrong",
      });
    }

    toast({
      variant: "success",
      description:
        result.message ||
        (mode === "update"
          ? "Agent updated successfully"
          : createAgentData.message.success),
    });

    mutate("/api/agents");

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
          {mode === "update" ? "" : createAgentData.trigger.button}
        </Button>
      </DialogTrigger>

      <DialogContent
        aria-describedby="Client form"
        className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>
            {mode === "update" ? "Update Agent" : createAgentData.dialog.title}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col  gap-4">
              <div className="flex gap-3 justify-between items-end">
                <FormField
                  control={form.control}
                  name="agent_name"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Agent Name</FormLabel>
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
              </div>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <span className="mr-5">
                      {mode === "update"
                        ? "Updating..."
                        : createAgentData.button.submitting}
                    </span>
                    <CustomLoader />
                  </>
                ) : mode === "update" ? (
                  "Update Agent"
                ) : (
                  createAgentData.button.submit
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
