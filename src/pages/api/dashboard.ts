import prisma from '@/lib/prisma';
import { labelsSchema } from '@/lib/zod';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        switch (req.method) {
            case 'GET':
                return await handleGet(req, res);
            case 'POST':
                return await handlePost(req, res);
            case 'DELETE':
                return await handleDelete(req, res);
            case 'PUT':
                return await handlePut(req, res);
            default:
                res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'PUT']);
                return res.status(405).json({ message: `Method ${req.method} not allowed` });
        }
    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({ message: 'An unexpected error occurred' });
    }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    try {
        const documents = await prisma.labels.findMany({
            orderBy: {
                id: 'desc',
            },
        });
        return res.status(200).json(documents);
    } catch (error) {
        console.error('Error fetching documents:', error);
        return res.status(500).json({ message: 'An unexpected error occurred' });
    }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
    try {
        const body = req.body;
        const result = labelsSchema.safeParse(body);

        if (!result.success) {
            return res.status(400).json({ message: 'Invalid input', errors: result.error.errors });
        }

        const documentData = result.data;

        const newDocument = await prisma.labels.create({
            data: {
                label: documentData.label,
                keywords: documentData.keywords || [],
                active_turns: documentData.active_turns || [],
                file_name: documentData.file_name,
                check_on_all_turns: documentData.check_on_all_turns || false,
            },
        });

        return res.status(201).json(newDocument);
    } catch (error) {
        console.error('Error adding document:', error);
        return res.status(500).json({ message: 'An unexpected error occurred' });
    }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { id } = req.query;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ message: 'Document ID is required' });
        }

        const deletedDocument = await prisma.labels.delete({
            where: { id },
        });

        if (!deletedDocument) {
            return res.status(404).json({ message: 'Document not found' });
        }

        return res.status(200).json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Error deleting document:', error);
        return res.status(500).json({ message: 'An unexpected error occurred' });
    }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
    try {
        const body = req.body;
        const { id, ...rest } = body;

        const result = labelsSchema.safeParse(rest);

        if (!result.success) {
            return res.status(400).json({ message: 'Invalid input', errors: result.error.errors });
        }

        const documentData = result.data;

        if (!id) {
            return res.status(400).json({ message: 'Document ID is required' });
        }

        const updatedDocument = await prisma.labels.update({
            where: { id },
            data: {
                label: documentData.label,
                keywords: documentData.keywords,
                active_turns: documentData.active_turns,
                file_name: documentData.file_name,
                check_on_all_turns: documentData.check_on_all_turns,
            },
        });

        if (!updatedDocument) {
            return res.status(404).json({ message: 'Document not found' });
        }

        return res.status(200).json(updatedDocument);
    } catch (error) {
        console.error('Error updating document:', error);
        return res.status(500).json({ message: 'An unexpected error occurred' });
    }
}