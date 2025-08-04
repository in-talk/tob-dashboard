"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scrollArea";
import { Textarea } from "@/components/ui/textarea";
import { SearchIcon } from "lucide-react";
import { useState } from "react";

export default function KeywordFinder() {
  const [transcript, setTranscript] = useState("");
  const [turn, setTurn] = useState(1);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_KEYWORD_API_URL}/testkeyword`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ transcript, turn }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch keywords");
      }

      const data = await res.json();
      setResponse(data);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const prettyJson = JSON.stringify(response, null, 2);

  return (
    <div className="p-6 space-y-6">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              required
              className="h-10 resize-none"
              placeholder="Enter your transcript here..."
            />
          </div>

          <div className="w-40">
            <Input
              type="number"
              placeholder="Turn"
              value={turn}
              onChange={(e) => setTurn(Number(e.target.value))}
              required
              className="text-center py-7"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="py-7 px-6 flex flex-col items-center gap-1"
          >
            <span className="text-xs">
              {loading ? "Finding..." : "Find Keyword"}
            </span>
          </Button>
        </div>
      </form>

      <div className="border rounded-lg">
        <div className="px-4 py-3 border-b">
          <h2 className="text-xl font-semibold">Result</h2>
        </div>

        <div className="p-4 min-h-[400px]">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <span className="text-muted-foreground">Processing ...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <div className="text-destructive font-medium">Error: {error}</div>
            </div>
          )}

          {response && !loading && (
            <ScrollArea className="h-[450px] font-mono whitespace-pre text">
              <code>{prettyJson}</code>
            </ScrollArea>
          )}

          {!response && !loading && !error && (
            <div className="text-center py-20">
              <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No results yet</h3>
              <p className="text-muted-foreground">
                Enter a transcript and click `Find Keyword` to see results here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
