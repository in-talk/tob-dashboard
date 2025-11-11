// pages/api/keywords/add.ts
import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getCampaignLabel } from "@/lib/utils";
import { KeywordDocument } from "./remove";

interface AddKeywordRequestBody {
  id: string;
  keyword: string;
}

interface AddKeywordQuery {
  collectionType?: string;
}

export default async function handleAddKeyword(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id, keyword } = req.body as AddKeywordRequestBody;
    const { collectionType } = req.query as AddKeywordQuery;

    if (!collectionType) {
      return res.status(400).json({ message: "Collection type is required" });
    }

    const labels = getCampaignLabel(collectionType);

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }

    if (!keyword || typeof keyword !== "string" || keyword.trim() === "") {
      return res.status(400).json({ message: "Valid keyword required" });
    }

    const sanitizedKeyword = keyword.trim();

    console.log(`[${new Date().toISOString()}] Adding keyword to document ${id}`);

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection<KeywordDocument>(labels); // ✅ Add generic type

    // ✅ TypeScript now understands the structure
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $addToSet: { keywords: sanitizedKeyword },
        $set: { updatedAt: new Date() }
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(404).json({ message: "Document not found", id });
    }

    console.log(`[${new Date().toISOString()}] Keyword added. Total: ${result.keywords.length}`);

    return res.status(200).json({
      message: "Keyword added successfully",
      updatedDocument: result,
      keywordsCount: result.keywords.length
    });

  } catch (error) {
    console.error("[ERROR] Error adding keyword:", error);

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
      message: "Failed to add keyword",
      error: process.env.NODE_ENV === "development" 
        ? (error as Error).message 
        : undefined
    });
  }
}