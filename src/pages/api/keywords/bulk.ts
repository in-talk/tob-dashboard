// pages/api/keywords/bulk.ts
import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getCampaignLabel } from "@/lib/utils";

interface BulkKeywordsRequestBody {
  id: string;
  operation: "add" | "remove" | "replace" | "clear";
  keywords: string[];
}

interface BulkKeywordsQuery {
  collectionType?: string;
}

export default async function handleBulkKeywords(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id, operation, keywords } = req.body as BulkKeywordsRequestBody;
    const { collectionType } = req.query as BulkKeywordsQuery;

    if (!collectionType) {
      return res.status(400).json({ message: "Collection type is required" });
    }

    const labels = getCampaignLabel(collectionType);

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }

    if (!["add", "remove", "replace", "clear"].includes(operation)) {
      return res.status(400).json({ message: "Invalid operation" });
    }

    if (operation !== "clear" && (!Array.isArray(keywords) || keywords.length === 0)) {
      return res.status(400).json({ message: "Keywords array required for this operation" });
    }

    const sanitizedKeywords = operation !== "clear" 
      ? [...new Set(keywords.map(k => k.trim()).filter(k => k))]
      : [];

    console.log(`[${new Date().toISOString()}] Bulk ${operation} operation for document ${id}`);
    console.log(`[${new Date().toISOString()}] Keywords count: ${sanitizedKeywords.length}`);

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection(labels);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let updateOperation: any;

    switch (operation) {
      case "add":
        // ✅ Add multiple keywords (only new ones)
        updateOperation = {
          $addToSet: { keywords: { $each: sanitizedKeywords } },
          $set: { updatedAt: new Date() }
        };
        break;

      case "remove":
        // ✅ Remove multiple keywords
        updateOperation = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          $pull: { keywords: { $in: sanitizedKeywords } } as any,
          $set: { updatedAt: new Date() }
        };
        break;

      case "replace":
        // ✅ Replace entire array
        updateOperation = {
          $set: { 
            keywords: sanitizedKeywords,
            updatedAt: new Date()
          }
        };
        break;

      case "clear":
        // ✅ Clear all keywords
        updateOperation = {
          $set: { 
            keywords: [],
            updatedAt: new Date()
          }
        };
        break;
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      updateOperation,
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(404).json({ message: "Document not found", id });
    }

    console.log(`[${new Date().toISOString()}] Bulk ${operation} completed. Total keywords: ${result.keywords?.length || 0}`);

    return res.status(200).json({
      message: `Bulk ${operation} completed successfully`,
      operation,
      updatedDocument: result,
      keywordsCount: result.keywords?.length || 0
    });

  } catch (error) {
    console.error("[ERROR] Error in bulk operation:", error);

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
      message: "Bulk operation failed",
      error: process.env.NODE_ENV === "development" 
        ? (error as Error).message 
        : undefined
    });
  }
}