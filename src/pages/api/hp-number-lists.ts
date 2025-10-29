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
      const hpNumbersDocs = await hpNumbersCollection.find({}).toArray();
      const hpNumbersTempDocs = await hpNumbersTempCollection
        .find({})
        .toArray();

      const hpNumbersList = hpNumbersDocs.map((doc) => doc.number);
      const hpNumbersTempList = hpNumbersTempDocs.map((doc) => doc.number);

      return res.status(200).json({
        hpNumbersList,
        hpNumbersTempList,
      });
    }

    if (req.method === "POST") {
      const { hp_numbers = [], hp_numbers_temp = [] } = req.body;

      if (!Array.isArray(hp_numbers) || !Array.isArray(hp_numbers_temp)) {
        return res.status(400).json({ error: "Invalid data format" });
      }

      try {
        const client = await clientPromise;
        const db = client.db();

        const hpNumbersCollection = db.collection("hp_numbers");
        const hpNumbersTempCollection = db.collection("hp_numbers_temp");

        await hpNumbersCollection.deleteMany({});
        if (hp_numbers.length > 0) {
          await hpNumbersCollection.insertMany(
            hp_numbers.map((num) => ({ number: num }))
          );
        }

        await hpNumbersTempCollection.deleteMany({});
        if (hp_numbers_temp.length > 0) {
          await hpNumbersTempCollection.insertMany(
            hp_numbers_temp.map((num) => ({ number: num }))
          );
        }

        return res.status(200).json({
          message: "HP numbers & HP numbers temp updated successfully",
        });
      } catch (error) {
        console.error("Error updating collections:", error);
        return res.status(500).json({ error: "Internal server error" });
      }
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error handling request:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
