"use client";

import { useState } from "react";
import { RefreshCw, Info } from "lucide-react";
import { GetServerSideProps } from "next";

import { withAuth } from "@/utils/auth";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import WeirdCases from "@/components/age-mechanism/WeirdCases";
import TypoCorrections from "@/components/age-mechanism/TypoCorrections";
import NonAgePatterns from "@/components/age-mechanism/NonAgePatterns";
import AgeUnsureKeywords from "@/components/age-mechanism/AgeUnsureKeywords";
import PositiveNegativePatterns from "@/components/age-mechanism/PositiveNegativePatterns";

type TabInfo = {
  matchType: string;
  description: string;
  example: string;
  notes?: string;
};

const TAB_INFO: Record<string, TabInfo> = {
  "weird-cases": {
    matchType: "Exact whole-utterance override",
    description:
      "Replaces the entire cleaned transcript only when it exactly equals a key. Used to correct known STT mis-hearings where the mangled output is the whole thing the user said.",
    example:
      "Add ad2 → 82. User says only 'ad2' → replaced with '82'. User says 'i am ad2' → NO match, left unchanged.",
    notes:
      "Input/output are lowercased and stripped of most punctuation before storage.",
  },
  "typo-corrections": {
    matchType: "Word-boundary find & replace (anywhere in text)",
    description:
      "Every key is substituted anywhere it appears in the transcript as a standalone word. Runs on every utterance during age extraction.",
    example:
      "Add four to → forty. 'i am four to two' → 'i am forty two'. Won't match inside larger words like 'fourtown'.",
    notes: "Case-insensitive. Applied iteratively to the whole transcript.",
  },
  "non-age-patterns": {
    matchType: "Exact whole-utterance classifier",
    description:
      "If the cleaned + typo-corrected transcript exactly equals a key, it is classified as NO or UNSURE with confidence 0.9.",
    example:
      "Add maybe → UNSURE. User says only 'maybe' → classified UNSURE. User says 'well maybe yes' → NO match, falls through to normal age logic.",
    notes: "Classification must be either NO or UNSURE.",
  },
  "age-unsure-keywords": {
    matchType: "Word-boundary substring match, anywhere in transcript",
    description:
      "Every keyword is searched for anywhere in the transcript on word boundaries. Each hit adds +1 to that label's score; the highest-scoring label wins.",
    example:
      "Add 'stop calling' under DNC. User says 'please stop calling me' → DNC scores +1 and wins.",
    notes:
      "Case-insensitive. Label must be DNC, AH, NI, or IDL. Used to route calls before age qualification.",
  },
  "pos-neg-patterns": {
    matchType: "Exact whole-utterance match (yes/no context only)",
    description:
      "Only runs when the current turn is a yes/no question. If the cleaned transcript exactly equals a key, the answer resolves to YES or NO with confidence 0.95.",
    example:
      "Add yeah → YES. User says only 'yeah' → resolved to YES. User says 'i think yeah' → NO match, falls through.",
    notes: "Label must be YES or NO.",
  },
};

function TabLabel({ label, tabKey }: { label: string; tabKey: string }) {
  const info = TAB_INFO[tabKey];
  return (
    <span className="flex items-center gap-1.5">
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            role="button"
            tabIndex={0}
            aria-label={`How ${label} works`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex cursor-help text-muted-foreground hover:text-foreground"
          >
            <Info className="h-3.5 w-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-xs whitespace-normal text-left leading-relaxed"
        >
          <div className="space-y-1.5">
            <div className="font-semibold">{info.matchType}</div>
            <div>{info.description}</div>
            <div>
              <span className="font-semibold">Example: </span>
              {info.example}
            </div>
            {info.notes ? (
              <div className="opacity-80">{info.notes}</div>
            ) : null}
          </div>
        </TooltipContent>
      </Tooltip>
    </span>
  );
}

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

      <TooltipProvider delayDuration={150}>
      <Tabs defaultValue="weird-cases" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="weird-cases">
            <TabLabel label="Weird Cases" tabKey="weird-cases" />
          </TabsTrigger>
          <TabsTrigger value="typo-corrections">
            <TabLabel label="Typo Corrections" tabKey="typo-corrections" />
          </TabsTrigger>
          <TabsTrigger value="non-age-patterns">
            <TabLabel label="Non-Age Patterns" tabKey="non-age-patterns" />
          </TabsTrigger>
          <TabsTrigger value="age-unsure-keywords">
            <TabLabel label="Unsure Keywords" tabKey="age-unsure-keywords" />
          </TabsTrigger>
          <TabsTrigger value="pos-neg-patterns">
            <TabLabel label="Pos/Neg Patterns" tabKey="pos-neg-patterns" />
          </TabsTrigger>
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
        <TabsContent value="pos-neg-patterns">
          <PositiveNegativePatterns />
        </TabsContent>
      </Tabs>
      </TooltipProvider>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);
