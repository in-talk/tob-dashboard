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
import CustomLoader from "./ui/CustomLoader";
import { createUserData } from "@/constants";

interface CreateUserFormValues {
  email: string;
  password: string;
  name: string;
  role: "admin" | "user";
  client_id?: number;
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
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Something went wrong");
      }

      setMessage(result.message || createUserData.message.success);
      reset();
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage(createUserData.message.error);
      }
    }
  };

  return (
    <Dialog>
      <DialogTrigger className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0">
        <span className="px-5 py-2 rounded-lg cursor-pointer text-sm font-medium transition-all duration-300 flex items-center gap-2 bg-gradient-to-br from-blue-600 to-purple-600 text-white hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(102,126,234,0.4)]">
          <Edit2Icon /> {createUserData.trigger.button}
        </span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-sidebar">
        <DialogHeader>
          <DialogTitle>{createUserData.dialog.title}</DialogTitle>
        </DialogHeader>

        <DialogDescription>
          {message && (
            <p className="mb-4 text-sm font-medium text-[#3b65f5]">{message}</p>
          )}
        </DialogDescription>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium">
              {createUserData.form.email.label}
            </label>
            <input
              type="email"
              {...register("email", {
                required: createUserData.form.email.required,
              })}
              className="mt-1 p-2 w-full border bg-transparent rounded dark:border-white"
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium">
              {createUserData.form.password.label}
            </label>
            <input
              type="password"
              {...register("password", {
                required: createUserData.form.password.required,
                minLength: {
                  value: 6,
                  message: createUserData.form.password.minLength,
                },
              })}
              className="mt-1 p-2 w-full border bg-transparent rounded dark:border-white"
            />
            {errors.password && (
              <p className="text-red-500 text-sm">{errors.password.message}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium">
              {createUserData.form.name.label}
            </label>
            <input
              type="text"
              {...register("name", {
                required: createUserData.form.name.required,
              })}
              className="mt-1 p-2 w-full border bg-transparent rounded dark:border-white"
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name.message}</p>
            )}
          </div>
          <div>
            {/* Client ID */}
            <label className="block text-sm font-medium">
              {createUserData.form.clientId.label}
            </label>
            <input
              type="text"
              {...register("client_id")}
              className="mt-1 p-2 w-full border bg-transparent rounded dark:border-white"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium">
              {createUserData.form.role.label}
            </label>
            <select
              {...register("role")}
              className="mt-1 p-2 w-full border bg-transparent rounded dark:border-white"
            >
              <option value="admin">
                {createUserData.form.role.options.admin}
              </option>
              <option value="user">
                {createUserData.form.role.options.user}
              </option>
            </select>
          </div>


          {/* Submit Button */}
          <Button
            type="submit"
            variant="default"
            className="w-full  p-4 mt-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="mr-5">{createUserData.button.submitting}</span>{" "}
                <CustomLoader />
              </>
            ) : (
              createUserData.button.submit
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
