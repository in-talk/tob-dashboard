import { NextApiRequest, NextApiResponse } from "next";
import { authAdmin, dbAdmin } from "@/firebase/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { email, password, name, role } = req.body;

    // Create user in Firebase Auth
    const userRecord = await authAdmin.createUser({
      email,
      password,
      displayName: name,
    });

    // Store user details in Firestore
    await dbAdmin.collection("users").doc(userRecord.uid).set({
      email,
      name,
      role,
    });

    res.status(201).json({ message: "User created successfully", userId: userRecord.uid });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
}