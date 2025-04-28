import { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/firebase/client";
import { doc, setDoc } from "firebase/firestore"; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, role } = req.body;

  if (!userId || !role) {
    return res.status(400).json({ error: "Missing userId or role" });
  }

  try {
    await setDoc(doc(db, "users", userId), { role }, { merge: true });
    return res.status(200).json({ message: "Role updated successfully" });
  } catch (error) {
    console.error("Error updating user role:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}