import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getCampaignLabel } from "@/lib/utils";

// Define types for better type safety
interface UpdateKeywordsRequestBody {
  id: string;
  keywords: string[];
}

interface UpdateKeywordsQuery {
  collectionType?: string;
}

export default async function handleUpdateKeywords(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow PUT method
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id, keywords } = req.body as UpdateKeywordsRequestBody;
    const { collectionType } = req.query as UpdateKeywordsQuery;

    // Validate collection type
    if (!collectionType) {
      return res.status(400).json({ message: "Collection type is required" });
    }

    const labels = getCampaignLabel(collectionType);

    // Validate document ID
    if (!id || typeof id !== "string") {
      return res.status(400).json({ message: "Valid document ID is required" });
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid document ID format" });
    }

    // Validate keywords array
    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({ message: "Keywords must be an array" });
    }

    // Validate keywords content
    if (keywords.length === 0) {
      return res.status(400).json({ message: "Keywords array cannot be empty" });
    }

    // Validate each keyword is a string and not empty
    const invalidKeywords = keywords.filter(
      (keyword) => typeof keyword !== "string" || keyword.trim() === ""
    );

    if (invalidKeywords.length > 0) {
      return res.status(400).json({ 
        message: "All keywords must be non-empty strings" 
      });
    }

    // Optional: Limit keywords array size
    const MAX_KEYWORDS = 10000;
    if (keywords.length > MAX_KEYWORDS) {
      return res.status(400).json({ 
        message: `Maximum ${MAX_KEYWORDS} keywords allowed` 
      });
    }

    // Sanitize keywords (trim whitespace, remove duplicates)
    const sanitizedKeywords = [...new Set(keywords.map(k => k.trim()))];

    console.log("keywords=>", sanitizedKeywords)

    console.log(`Updating keywords for document ${id} in collection ${labels}`);

    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection(labels);

    // Use findOneAndUpdate for atomic operation
    // This prevents race conditions and reduces database calls
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          keywords: sanitizedKeywords,
          updatedAt: new Date() // Track when keywords were updated
        } 
      },
      { 
        returnDocument: "after" // Return the updated document
      }
    );

    // Check if document was found
    if (!result) {
      return res.status(404).json({ 
        message: "Document not found",
        id 
      });
    }

    console.log(`Keywords updated successfully for document ${id}`);

    return res.status(200).json({
      message: "Keywords updated successfully",
      updatedDocument: result,
      keywordsCount: sanitizedKeywords.length
    });

  } catch (error) {
    console.error("Error updating keywords:", error);

    // Handle specific MongoDB errors
    if (error instanceof Error) {
      // Handle invalid ObjectId
      if (error.name === "BSONError") {
        return res.status(400).json({ 
          message: "Invalid document ID format",
          error: error.message 
        });
      }

      // Handle MongoDB connection errors
      if (error.message.includes("ECONNREFUSED") || 
          error.message.includes("MongoNetworkError")) {
        return res.status(503).json({ 
          message: "Database connection failed",
          error: "Service temporarily unavailable" 
        });
      }
    }

    // Generic error response
    return res.status(500).json({ 
      message: "An unexpected error occurred while updating keywords",
      error: process.env.NODE_ENV === "development" 
        ? (error as Error).message 
        : undefined
    });
  }
}