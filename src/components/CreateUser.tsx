"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Edit2Icon } from "lucide-react";
import { useForm } from "react-hook-form";

interface CreateUserFormValues {
  email: string;
  password: string;
  name: string;
  role: "superAdmin" | "admin" | "user";
}

export default function CreateUser() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateUserFormValues>();

  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (data: CreateUserFormValues) => {
    setMessage(null);
    try {
      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create user");
      }

      setMessage("User created successfully");
      reset();
    } catch (error) {
      setMessage("Failed to create user");
      console.error(error);
    }
  };

  return (
    <Dialog>
      <DialogTrigger className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0">
        <Edit2Icon />
        <span className="text-sm">Create User</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>

        <DialogDescription>
          {message && (
            <p className="mb-4 text-sm font-medium text-[#3b65f5]">{message}</p>
          )}
        </DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              {...register("email", { required: "Email is required" })}
              className="mt-1 p-2 w-full border rounded"
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Password</label>
            <input
              type="password"
              {...register("password", {
                required: "Password is required",
                minLength: 6,
              })}
              className="mt-1 p-2 w-full border rounded"
            />
            {errors.password && (
              <p className="text-red-500 text-sm">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              type="text"
              {...register("name", { required: "Name is required" })}
              className="mt-1 p-2 w-full border rounded"
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium">Role</label>
            <select
              {...register("role")}
              className="mt-1 p-2 w-full border rounded"
            >
              <option value="superAdmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#3b65f5] text-white p-2 rounded mt-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create User"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
