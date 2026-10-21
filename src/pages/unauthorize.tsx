import { Button } from "@/components/ui/button";
import { useRouter } from "next/router";
import { signOut } from "next-auth/react";
import { unauthorizedPageData } from "@/constants";

export default function UnauthorizedPage() {
  const router = useRouter();
  const forbidden = router.query.reason === "forbidden";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-lg font-bold">
          {forbidden ? "403 - Forbidden" : unauthorizedPageData.heading}
        </h1>
        <p>
          {forbidden
            ? "Your account doesn't have access to this page."
            : unauthorizedPageData.description}
        </p>
        <div className="flex gap-2">
          {forbidden && (
            <Button variant="outline" onClick={() => router.push("/")}>
              Go to dashboard
            </Button>
          )}
          <Button
            variant="default"
            onClick={() =>
              forbidden ? signOut({ callbackUrl: "/signin" }) : router.push("/signin")
            }
          >
            {forbidden ? "Sign in as someone else" : unauthorizedPageData.loginButtonText}
          </Button>
        </div>
      </div>
    </main>
  );
}
