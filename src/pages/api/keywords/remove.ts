// pages/api/keywords/remove.ts
import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import { getCampaignLabel } from "@/lib/utils";
import { ObjectId } from "mongodb";

export interface KeywordDocument {
  _id: ObjectId;
  label: string;
  keywords: string[];
  active_turns?: number[];
  file_name?: string;
  check_on_all_turns?: boolean;
  updatedAt?: Date;
  createdAt?: Date;
}

interface RemoveKeywordRequestBody {
  id: string;
  keyword: string;
}

interface RemoveKeywordQuery {
  collectionType?: string;
}

export default async function handleRemoveKeyword(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id, keyword } = req.body as RemoveKeywordRequestBody;
    const { collectionType } = req.query as RemoveKeywordQuery;

    if (!collectionType) {
      return res.status(400).json({ message: "Collection type is required" });
    }

    const labels = getCampaignLabel(collectionType);

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }

    if (!keyword || typeof keyword !== "string") {
      return res.status(400).json({ message: "Valid keyword required" });
    }

    console.log(`[${new Date().toISOString()}] Removing keyword from document ${id}`);

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection<KeywordDocument>(labels); // ✅ Add generic type

    // ✅ Now TypeScript knows the structure
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $pull: { keywords: keyword },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(404).json({ message: "Document not found", id });
    }

    console.log(`[${new Date().toISOString()}] Keyword removed. Remaining: ${result.keywords.length}`);

    return res.status(200).json({
      message: "Keyword removed successfully",
      updatedDocument: result,
      keywordsCount: result.keywords.length
    });

  } catch (error) {
    console.error("[ERROR] Error removing keyword:", error);

    if (error instanceof Error) {
      if (error.name === "BSONError") {
        return res.status(400).json({ 
          message: "Invalid document ID format",
          error: error.message 
        });
      }

      if (error.message.includes("ECONNREFUSED") || 
          error.message.includes("MongoNetworkError")) {
        return res.status(503).json({ 
          message: "Database connection failed",
          error: "Service temporarily unavailable" 
        });
      }
    }

    return res.status(500).json({ 
      message: "Failed to remove keyword",
      error: process.env.NODE_ENV === "development" 
        ? (error as Error).message 
        : undefined
    });
  }
}