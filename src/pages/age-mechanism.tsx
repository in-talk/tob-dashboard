"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { GetServerSideProps } from "next";

import { withAuth } from "@/utils/auth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WeirdCases from "@/components/age-mechanism/WeirdCases";
import TypoCorrections from "@/components/age-mechanism/TypoCorrections";
import NonAgePatterns from "@/components/age-mechanism/NonAgePatterns";
import AgeUnsureKeywords from "@/components/age-mechanism/AgeUnsureKeywords";

const API_BASE = process.env.NEXT_PUBLIC_KEYWORD_API_URL || "";

export default function AgeMechanism() {
  const [resetting, setResetting] = useState(false);

  const handleResetCache = async () => {
    setResetting(true);
    try {
      const res = await fetch(`${API_BASE}/age-classifier/reset-cache`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to reset cache");

      toast({ variant: "success", description: "Cache reset successfully" });
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", description: "Failed to reset cache" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="px-3 sm:px-6 py-4 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Age Mechanism</h1>
          <p className="text-sm text-muted-foreground">
            Manage age classification rules, typo corrections, and non-age
            patterns
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleResetCache}
          disabled={resetting}
          className="shrink-0"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${resetting ? "animate-spin" : ""}`}
          />
          {resetting ? "Resetting..." : "Reset Cache"}
        </Button>
      </div>

      <Tabs defaultValue="weird-cases" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="weird-cases">Weird Cases</TabsTrigger>
          <TabsTrigger value="typo-corrections">Typo Corrections</TabsTrigger>
          <TabsTrigger value="non-age-patterns">Non-Age Patterns</TabsTrigger>
          <TabsTrigger value="age-unsure-keywords">Unsure Keywords</TabsTrigger>
        </TabsList>
        <TabsContent value="weird-cases">
          <WeirdCases />
        </TabsContent>
        <TabsContent value="typo-corrections">
          <TypoCorrections />
        </TabsContent>
        <TabsContent value="non-age-patterns">
          <NonAgePatterns />
        </TabsContent>
        <TabsContent value="age-unsure-keywords">
          <AgeUnsureKeywords />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);
