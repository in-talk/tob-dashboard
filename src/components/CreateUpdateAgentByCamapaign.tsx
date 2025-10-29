"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { mutate } from "swr";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit } from "lucide-react";

import { toast } from "@/hooks/use-toast";
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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/Select";

import CustomLoader from "./ui/CustomLoader";
import { Agent } from "@/types/agent";
import { Campaign } from "@/types/campaign";
import { Checkbox } from "./ui/checkbox";

const assignAgentSchema = z.object({
  campaign_id: z.string().min(1, "Campaign is required"),
  agent_id: z.string().min(1, "Agent is required"),
  is_active: z.boolean(),
});

type AssignAgentValues = z.infer<typeof assignAgentSchema>;

type CreateUpdateAgentByCampaignProps = {
  mode?: "create" | "update";
  initialData?: Partial<AssignAgentValues>;
  recordId?: string;
  agents?: Agent[];
  campaigns?: Campaign[];
};

export default function CreateUpdateAgentByCampaign({
  mode = "create",
  initialData,
  recordId,
  agents,
  campaigns,
}: CreateUpdateAgentByCampaignProps) {
  const [isDialogOpen, setDialogOpen] = useState(false);

  const form = useForm<AssignAgentValues>({
    resolver: zodResolver(assignAgentSchema),
    defaultValues: initialData ?? {
      is_active: false,
    },
  });
  const activeAgents = agents?.filter((a) => a.is_active);
  const activeCampaigns = campaigns?.filter((c) => c.isactive);

  const onSubmit = async (data: AssignAgentValues) => {
    try {
      const payload = { ...data, id: recordId };

      const res = await fetch(`/api/agentsByCampaign`, {
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
        return;
      }

      toast({
        variant: "success",
        description:
          mode === "update"
            ? "Agent-Campaign mapping updated successfully"
            : "Agent assigned to campaign successfully",
      });

      mutate("/api/agents-by-campaign");
      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        description: "Error while saving data",
      });
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger>
        <Button>
          <Edit className={`${mode === "update" ? "mr-0" : "mr-2"} h-4 w-4`} />
          {mode === "update" ? "" : "Assign Agent"}
        </Button>
      </DialogTrigger>

      <DialogContent
        aria-describedby="Assign agent to campaign"
        className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>
            {mode === "update"
              ? "Update Assignment"
              : "Assign Agent to Campaign"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 flex flex-col gap-4"
          >
            <div className=" flex  justify-between">
              <FormField
                control={form.control}
                name="campaign_id"
                render={({ field }) => (
                  <FormItem className="w-[45%]">
                    <FormLabel>Campaign</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Campaign" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeCampaigns?.map((campaign) => (
                            <SelectItem
                              key={campaign.campaign_id}
                              value={campaign.campaign_id.toString()}
                            >
                              {campaign.campaign_name}-{campaign.campaign_id}
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
                name="agent_id"
                render={({ field }) => (
                  <FormItem className="w-[45%]">
                    <FormLabel>Agent</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeAgents?.map((agent) => (
                            <SelectItem
                              key={agent.agent_id}
                              value={agent.agent_id.toString()}
                            >
                              {agent.agent_name}
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
            <div className=" flex justify-between ">
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(val) => field.onChange(Boolean(val))}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0 ">Is Active</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <span className="mr-5">
                      {mode === "update" ? "Updating..." : "Assigning..."}
                    </span>
                    <CustomLoader />
                  </>
                ) : mode === "update" ? (
                  "Update"
                ) : (
                  "Assign"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
