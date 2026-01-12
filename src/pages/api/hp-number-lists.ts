import clientPromise from "@/lib/mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const client = await clientPromise;
  const db = client.db();

  const hpNumbersCollection = db.collection("hp_numbers");
  const hpNumbersTempCollection = db.collection("hp_numbers_temp");

  try {
    if (req.method === "GET") {
      const { page = "1", pageSize = "10", search = "" } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limit = parseInt(pageSize as string, 10);
      const skip = (pageNum - 1) * limit;

      const searchQuery = search
        ? { number: { $regex: search as string, $options: "i" } }
        : {};

      // Fetch paginated HP numbers
      const hpNumbersDocs = await hpNumbersCollection
        .find(searchQuery)
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const totalCount = await hpNumbersCollection.countDocuments(searchQuery);

      // Fetch ALL Temp numbers (assuming they are fewer, as per current logic)
      const hpNumbersTempDocs = await hpNumbersTempCollection
        .find({})
        .toArray();

      const hpNumbersList = hpNumbersDocs.map((doc) => doc.number);
      const hpNumbersTempList = hpNumbersTempDocs.map((doc) => doc.number);

      return res.status(200).json({
        hpNumbersList,
        hpNumbersTempList,
        pagination: {
          totalCount,
          page: pageNum,
          pageSize: limit,
          totalPages: Math.ceil(totalCount / limit),
        }
      });
    }

    if (req.method === "POST") {
      const { hp_numbers, hp_numbers_temp, operation } = req.body;

      if (operation === "bulk_add") {
        if (!Array.isArray(hp_numbers) || hp_numbers.length === 0) {
          return res.status(400).json({ error: "No numbers provided for bulk add" });
        }

        // Filter out existing numbers to avoid duplicates if necessary, 
        // or just insert. The user said "add them".
        const existing = await hpNumbersCollection.find({ number: { $in: hp_numbers } }).toArray();
        const existingSet = new Set(existing.map(doc => doc.number));
        const newNumbers = hp_numbers.filter(num => !existingSet.has(num));

        if (newNumbers.length > 0) {
          await hpNumbersCollection.insertMany(
            newNumbers.map((num) => ({ number: num }))
          );
        }

        return res.status(200).json({
          message: `Successfully added ${newNumbers.length} new numbers. ${existing.length} were already present.`,
        });
      }

      // Default save behavior (replaces everything)
      // Note: This might be dangerous with pagination if the frontend doesn't have the full list.
      // However, the user might still want to "Save Changes" for the current view or temp list.
      // If we are doing server-side pagination, we should probably change how "Save" works.
      // But for now, let's keep the user's existing logic for the temp list and manual additions.

      if (hp_numbers !== undefined) {
        // If we are paginating, we shouldn't delete everything unless we have the full list.
        // But the current frontend logic sends the whole array.
        // If the frontend only has 10 items, it will delete the rest!
        // We need to be careful here.

        // Let's only update if the full lists are provided.
        await hpNumbersCollection.deleteMany({});
        if (hp_numbers.length > 0) {
          await hpNumbersCollection.insertMany(
            hp_numbers.map((num: number) => ({ number: num }))
          );
        }
      }

      if (hp_numbers_temp !== undefined) {
        await hpNumbersTempCollection.deleteMany({});
        if (hp_numbers_temp.length > 0) {
          await hpNumbersTempCollection.insertMany(
            hp_numbers_temp.map((num: number) => ({ number: num }))
          );
        }
      }

      return res.status(200).json({
        message: "REC numbers updated successfully",
      });
    }

    if (req.method === "DELETE") {
      const { number } = req.query;
      if (!number) return res.status(400).json({ error: "Number is required" });

      await hpNumbersCollection.deleteOne({ number: number as string });
      return res.status(200).json({ message: "Number deleted successfully" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error handling request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
