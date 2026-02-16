"use client";

import { useEffect, useState } from "react";
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
import { Client } from "@/types/client";
import { User } from "@/types/user";

const assignClientSchema = z.object({
    client_id: z.string().min(1, "Client is required"),
    user_id: z.string().min(1, "User is required"),
});

type AssignClientValues = z.infer<typeof assignClientSchema>;

type CreateUpdateClientByUserProps = {
    mode?: "create" | "update";
    initialData?: Partial<AssignClientValues>;
    recordId?: string;
    clients?: Client[];
    users?: User[];
};

export default function CreateUpdateClientByUser({
    mode = "create",
    initialData,
    recordId,
    clients,
    users,
}: CreateUpdateClientByUserProps) {
    const [isDialogOpen, setDialogOpen] = useState(false);

    const form = useForm<AssignClientValues>({
        resolver: zodResolver(assignClientSchema),
        defaultValues: initialData ?? {},
    });

    useEffect(() => {
        if (isDialogOpen) {
            form.reset(initialData);
        }
    }, [form, initialData, isDialogOpen]);

    const onSubmit = async (data: AssignClientValues) => {
        try {
            const payload = { ...data, id: recordId };

            const res = await fetch(`/api/clients-by-user`, {
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
                    mode === "update"
                        ? "Client-User mapping updated successfully"
                        : "Client assigned to user successfully",
            });

            mutate("/api/clients-by-user");
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
            <DialogTrigger asChild>
                <Button>
                    <Edit className={`${mode === "update" ? "mr-0" : "mr-2"} h-4 w-4`} />
                    {mode === "update" ? "" : "Assign Client"}
                </Button>
            </DialogTrigger>

            <DialogContent
                aria-describedby="Assign client to user"
                className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto"
            >
                <DialogHeader>
                    <DialogTitle>
                        {mode === "update"
                            ? "Update Assignment"
                            : "Assign Client to User"}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-6 flex flex-col gap-4"
                    >
                        <div className="flex flex-col gap-4">
                            <FormField
                                control={form.control}
                                name="user_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>User</FormLabel>
                                        <FormControl>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select User" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[200px]">
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
                                name="client_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Client</FormLabel>
                                        <FormControl>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value}
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select Client" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[200px]">
                                                    {clients?.map((client) => (
                                                        <SelectItem
                                                            key={client.client_id}
                                                            value={client.client_id?.toString() || ""}
                                                        >
                                                            {client.name}
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
                        <div className="flex justify-end">
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
