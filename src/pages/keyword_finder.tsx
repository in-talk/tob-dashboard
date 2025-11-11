"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scrollArea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Textarea } from "@/components/ui/textarea";
import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { keywordFinderPageData } from "@/constants";
import { GetServerSideProps } from "next";
import { withAuth } from "@/utils/auth";

export type Campaign = {
  campaign_id: number;
  campaign_name: string;
  campaign_code: number;
};

export default function KeywordFinder() {
  const [transcript, setTranscript] = useState("");
  const [turn, setTurn] = useState(1);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState<string | undefined>(undefined);
  const [excludeLabels, setExcludeLabels] = useState<string | undefined>(
    "POS,NEG"
  );
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/fetchCampaigns`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch campaigns");
        }

        const data = await res.json();
        setCampaigns(data);
        setLoading(false);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Something went wrong");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResponse(null);
    try {
      const res = await fetch("/api/keyword-proxy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript,
          turn,
          campaign_id: campaignId,
          exclude_labels: excludeLabels?.split(',').map(i => i.trim()) || [],
        }),
        next: { revalidate: 0 },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch keywords");
      }

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const prettyJson = JSON.stringify(response, null, 2);

  return (
    <div className="p-6 space-y-6 overflow-x-hidden">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[170px]">
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              required
              className="h-10 resize-none w-[550px] py-7"
              placeholder={keywordFinderPageData.transcriptPlaceholder}
            />
            
          </div>
          <div className="w-40 min-w-[8rem]">
            <Input
              type="text"
              placeholder="comma separated exclude labels like POS,NEG"
              value={excludeLabels}
              onChange={(e) => setExcludeLabels(e.target.value)}
            />
          </div>

          <div className="w-40 min-w-[8rem]">
            <Input
              type="number"
              placeholder={keywordFinderPageData.turnPlaceholder}
              value={turn}
              onChange={(e) => setTurn(Number(e.target.value))}
              required
              className="text-center py-7 w-full"
            />
          </div>

          <div className="w-40 min-w-[8rem]">
            <Select
              value={campaignId}
              onValueChange={(value) => setCampaignId(value)}
            >
              <SelectTrigger className="py-7 w-full">
                <SelectValue
                  placeholder={keywordFinderPageData.campaignSelectPlaceholder}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {campaigns?.map((campaign) => (
                    <SelectItem
                      key={campaign.campaign_id}
                      value={`${campaign.campaign_code}`}
                    >
                      {campaign.campaign_name} - {campaign.campaign_code}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="py-7 px-6 flex flex-col items-center gap-1"
          >
            <span className="text-xs">
              {keywordFinderPageData.findKeywordButton}
            </span>
          </Button>
        </div>
      </form>

      <div className="border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b">
          <h2 className="text-xl font-semibold">
            {keywordFinderPageData.resultHeading}
          </h2>
        </div>

        <div className="p-4 min-h-[400px]">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <span className="text-muted-foreground">
                  {keywordFinderPageData.processingText}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <div className="text-destructive font-medium">
                {keywordFinderPageData.errorPrefix} {error}
              </div>
            </div>
          )}

          {response && !loading && (
            <ScrollArea className="h-[450px] font-mono">
              <div className="whitespace-pre-wrap break-words text-sm overflow-auto">
                <code>{prettyJson}</code>
              </div>
            </ScrollArea>
          )}

          {!response && !loading && !error && (
            <div className="text-center py-20">
              <SearchIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {keywordFinderPageData.noResultsHeading}
              </h3>
              <p className="text-muted-foreground">
                {keywordFinderPageData.noResultsDescription}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);