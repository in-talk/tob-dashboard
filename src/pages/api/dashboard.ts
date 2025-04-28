/* eslint-disable @typescript-eslint/no-explicit-any */
import clientPromise from '@/lib/mongodb';
import { labelsSchema } from '@/lib/zod';
import { ObjectId } from 'mongodb';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection('labels_10000');

    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, collection);
      case 'POST':
        return await handlePost(req, res, collection);
      case 'DELETE':
        return await handleDelete(req, res, collection);
      case 'PUT':
        return await handlePut(req, res, collection);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'PUT']);
        return res.status(405).json({ message: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ message: 'An unexpected error occurred' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, collection: any) {
  try {
    const documents = await collection.find({}).sort({ _id: -1 }).toArray();
    return res.status(200).json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return res.status(500).json({ message: 'An unexpected error occurred' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, collection: any) {
  try {
    const body = req.body;
    const result = labelsSchema.safeParse(body);

    if (!result.success) {
      return res.status(400).json({ message: 'Invalid input', errors: result.error.errors });
    }

    const documentData = result.data;

    const existingDocument = await collection.findOne({ label: documentData.label });

    if (existingDocument) {
      return res.status(409).json({ message: `Document with label "${documentData.label}" already exists.` });
    }

    const { insertedId } = await collection.insertOne(documentData);
    const newDoc = await collection.findOne({ _id: insertedId });

    return res.status(201).json(newDoc);
  } catch (error) {
    console.error('Error adding document:', error);
    return res.status(500).json({ message: 'An unexpected error occurred' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, collection: any) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Document ID is required' });
    }

    const result = await collection.deleteOne({ _id: new ObjectId(String(id)) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    return res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({ message: 'An unexpected error occurred' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, collection: any) {
  try {
    const { id, ...rest } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'Document ID is required' });
    }

    const result = labelsSchema.safeParse(rest);
    if (!result.success) {
      return res.status(400).json({ message: 'Invalid input', errors: result.error.errors });
    }

    const documentData = result.data;

    const existingDocument = await collection.findOne({
      label: documentData.label,
      _id: { $ne: new ObjectId(String(id)) },
    });

    if (existingDocument) {
      return res.status(409).json({ message: `Label "${documentData.label}" already exists.` });
    }

    const updateResult = await collection.updateOne(
      { _id: new ObjectId(String(id)) },
      { $set: documentData }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const updatedDocument = await collection.findOne({ _id: new ObjectId(String(id)) });
    return res.status(200).json(updatedDocument);
  } catch (error) {
    console.error('Error updating document:', error);
    return res.status(500).json({ message: 'An unexpected error occurred' });
  }
}