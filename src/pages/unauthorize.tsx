"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { unauthorizedPageData } from "@/constants";

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-lg font-bold">
          {unauthorizedPageData.heading}
        </h1>
        <p>{unauthorizedPageData.description}</p>
        <Button
          variant="default"
          onClick={() => router.push("/signin")}
        >
          {unauthorizedPageData.loginButtonText}
        </Button>
      </div>
    </main>
  );
}