/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/api/keywords/global-update.ts
import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import { Campaign, getCampaignLabel } from "@/lib/utils";

interface GlobalUpdateRequestBody {
    label: string;
    operation: "add" | "remove";
    keywords: string[];
}

export default async function handleGlobalUpdate(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        const { label, operation, keywords } = req.body as GlobalUpdateRequestBody;

        if (!label) {
            return res.status(400).json({ message: "Label is required" });
        }

        if (!["add", "remove"].includes(operation)) {
            return res.status(400).json({ message: "Invalid operation. Use 'add' or 'remove'." });
        }

        if (!Array.isArray(keywords) || keywords.length === 0) {
            return res.status(400).json({ message: "Keywords array is required" });
        }

        const sanitizedKeywords = [...new Set(keywords.map(k => k.trim()).filter(k => k))];

        const client = await clientPromise;
        const db = client.db();

        const results: any[] = [];
        const campaignNames = Object.keys(Campaign).filter(key => isNaN(Number(key)));

        for (const campaignName of campaignNames) {
            try {
                const collectionName = getCampaignLabel(campaignName);
                const collection = db.collection(collectionName);

                let updateOperation: any;
                if (operation === "add") {
                    updateOperation = {
                        $addToSet: { keywords: { $each: sanitizedKeywords } },
                        $set: { updatedAt: new Date() }
                    };
                } else {
                    updateOperation = {
                        $pull: { keywords: { $in: sanitizedKeywords } } as any,
                        $set: { updatedAt: new Date() }
                    };
                }

                const result = await collection.updateMany(
                    { label: label },
                    updateOperation
                );

                results.push({
                    campaign: campaignName,
                    collection: collectionName,
                    matchedCount: result.matchedCount,
                    modifiedCount: result.modifiedCount,
                    status: "success"
                });
            } catch (error) {
                results.push({
                    campaign: campaignName,
                    status: "error",
                    message: error instanceof Error ? error.message : "Unknown error"
                });
            }
        }

        return res.status(200).json({
            message: `Global ${operation} completed`,
            results
        });

    } catch (error) {
        console.error("[ERROR] Global update failed:", error);
        return res.status(500).json({
            message: "Global update failed",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
}
