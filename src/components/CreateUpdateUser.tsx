"use client";

import { useEffect, useState, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useSession } from "next-auth/react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
    // Update only. false = deactivated: signed out and can't log in.
    is_active: z.boolean().optional(),
    // Update only. Clears a lockout caused by repeated wrong passwords.
    unlock: z.boolean().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

type CreateUpdateUserProps = {
    mode?: "create" | "update";
    initialData?: Partial<UserFormValues>;
    userId?: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Update mode: show the Active switch (needs users.is_active in the DB). */
    showStatus?: boolean;
    /** Update mode: when set and in the future, the account is locked out. */
    lockedUntil?: string | null;
};

export default function CreateUpdateUser({
    mode = "create",
    initialData,
    userId,
    open: externalOpen,
    onOpenChange: externalOnOpenChange,
    showStatus = false,
    lockedUntil,
}: CreateUpdateUserProps) {
    const { data: session } = useSession();
    // Admins can't deactivate or unlock their own account (the API refuses too).
    const isSelf = mode === "update" && !!userId && session?.user?.id === userId;
    const isLockedOut = !!lockedUntil && new Date(lockedUntil).getTime() > Date.now();
    const [pendingDeactivate, setPendingDeactivate] = useState<UserFormValues | null>(null);
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

    const watchedActive = useWatch({ control: form.control, name: "is_active" });
    const wasActive = initialData?.is_active !== false;

    const onSubmit = async (data: UserFormValues) => {
        // Turning an active account off signs the user out, so confirm first.
        if (mode === "update" && showStatus && !isSelf && wasActive && data.is_active === false) {
            setPendingDeactivate(data);
            return;
        }
        await save(data);
    };

    const save = async (data: UserFormValues) => {
        try {
            const payload: UserFormValues & { id?: string } = { ...data, id: userId };
            if (!showStatus || mode !== "update" || isSelf) {
                delete payload.is_active;
                delete payload.unlock;
            }

            // For creation, password is required
            if (mode === "create" && (!data.password || data.password.length < 12)) {
                form.setError("password", { message: "Password must be at least 12 characters (mix of upper, lower, digits, symbols)" });
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
                    mode === "create"
                        ? "User created successfully"
                        : payload.is_active === false && wasActive
                        ? "User deactivated and signed out"
                        : payload.is_active === true && !wasActive
                        ? "User reactivated"
                        : "User updated successfully",
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

                        {mode === "update" && showStatus && !isSelf && (
                            <FormField
                                control={form.control}
                                name="is_active"
                                render={({ field }) => (
                                    <FormItem className="rounded-md border border-input p-3 space-y-2">
                                        <div className="flex items-start gap-2 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    className="mt-0.5"
                                                    checked={field.value !== false}
                                                    onCheckedChange={(val) => field.onChange(Boolean(val))}
                                                />
                                            </FormControl>
                                            <div className="flex flex-col">
                                                <FormLabel className="!mt-0">Active</FormLabel>
                                                <span className="text-xs text-muted-foreground">
                                                    {watchedActive === false
                                                        ? "Deactivated: this user is signed out and can't log in."
                                                        : "This user can log in."}
                                                </span>
                                            </div>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {mode === "update" && isLockedOut && !isSelf && (
                            <FormField
                                control={form.control}
                                name="unlock"
                                render={({ field }) => (
                                    <FormItem className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                                        <div className="flex items-start gap-2 space-y-0">
                                            <FormControl>
                                                <Checkbox
                                                    className="mt-0.5"
                                                    checked={field.value === true}
                                                    onCheckedChange={(val) => field.onChange(Boolean(val))}
                                                />
                                            </FormControl>
                                            <div className="flex flex-col">
                                                <FormLabel className="!mt-0">Unlock account</FormLabel>
                                                <span className="text-xs text-muted-foreground">
                                                    Locked after repeated wrong passwords until{" "}
                                                    {new Date(lockedUntil as string).toLocaleString()}.
                                                </span>
                                            </div>
                                        </div>
                                    </FormItem>
                                )}
                            />
                        )}

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

            <AlertDialog
                open={pendingDeactivate !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingDeactivate(null);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate this user?</AlertDialogTitle>
                        <AlertDialogDescription>
                            They will be signed out within a few seconds and can&apos;t log in until you
                            reactivate them. Their data and settings are kept.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-700 hover:bg-red-800 text-white"
                            onClick={() => {
                                const data = pendingDeactivate;
                                setPendingDeactivate(null);
                                if (data) void save(data);
                            }}
                        >
                            Deactivate
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog>
    );
}
