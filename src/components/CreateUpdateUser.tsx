"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { mutate } from "swr";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, UserPlus } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "./ui/Select";

import CustomLoader from "./ui/CustomLoader";

const userSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().optional().or(z.literal("")),
    name: z.string().min(1, "Name is required"),
    role: z.string().min(1, "Role is required"),
});

type UserFormValues = z.infer<typeof userSchema>;

type CreateUpdateUserProps = {
    mode?: "create" | "update";
    initialData?: Partial<UserFormValues>;
    userId?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
};

export default function CreateUpdateUser({
    mode = "create",
    initialData,
    userId,
    open: externalOpen,
    onOpenChange: externalOnOpenChange,
}: CreateUpdateUserProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isDialogOpen = externalOpen !== undefined ? externalOpen : internalOpen;
    const setDialogOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setInternalOpen;

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues: initialData ?? {
            email: "",
            password: "",
            name: "",
            role: "user",
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

    const onSubmit = async (data: UserFormValues) => {
        try {
            const payload = { ...data, id: userId };

            // For creation, password is required
            if (mode === "create" && (!data.password || data.password.length < 6)) {
                form.setError("password", { message: "Password must be at least 6 characters" });
                return;
            }

            const res = await fetch(`/api/users`, {
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
                        ? "User updated successfully"
                        : "User created successfully",
            });

            mutate("/api/users");
            mutate("/api/get-users"); // Also mutate the old endpoint just in case
            setDialogOpen(false);
            if (mode === "create") form.reset();
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
                {mode === "update" ? (
                    <Button variant="ghost" className="bg-gray-700 hover:bg-gray-600 text-white py-1 px-3 rounded-md">
                        <Edit className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button className="bg-gradient-to-br from-blue-600 to-purple-600 text-white hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(102,126,234,0.4)]">
                        <UserPlus className="mr-2 h-4 w-4" /> Add User
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {mode === "update" ? "Update User" : "Create New User"}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Full Name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="email@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {mode === "update" ? "New Password (leave blank to keep current)" : "Password"}
                                    </FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="******" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Role</FormLabel>
                                    <FormControl>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="user">User</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? (
                                <>
                                    <span className="mr-5">
                                        {mode === "update" ? "Updating..." : "Creating..."}
                                    </span>
                                    <CustomLoader />
                                </>
                            ) : mode === "update" ? (
                                "Update User"
                            ) : (
                                "Create User"
                            )}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
