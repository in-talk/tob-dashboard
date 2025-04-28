import { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handleUpdateKeywords(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { id, keywords } = req.body;

    // Validate inputs
    if (!id) {
      return res.status(400).json({ message: "Document ID is required" });
    }

    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({ message: "Invalid or missing keywords" });
    }

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection("labels_10000");

    const result = await collection.updateOne(
      {_id: { $ne: new ObjectId(String(id)) }, },
      { $set: { keywords } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Document not found" });
    }

    const updatedDocument = await collection.findOne({_id: { $ne: new ObjectId(String(id)) }, });

    return res.status(200).json({
      message: "Keywords updated successfully",
      updatedDocument,
    });
  } catch (error) {
    console.error("Error updating keywords:", error);
    return res.status(500).json({ message: "An unexpected error occurred" });
  }
}