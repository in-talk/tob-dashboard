import prisma from "@/lib/prisma";
import { NextApiRequest, NextApiResponse } from "next";

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

        // Update only the keywords field
        const updatedDocument = await prisma.labels.update({
            where: { id },
            data: { keywords },
        });

        if (!updatedDocument) {
            return res.status(404).json({ message: "Document not found" });
        }

        return res.status(200).json({ message: "Keywords updated successfully", updatedDocument });
    } catch (error) {
        console.error("Error updating keywords:", error);
        return res.status(500).json({ message: "An unexpected error occurred" });
    }
}