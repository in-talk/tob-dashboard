import AWS from 'aws-sdk';
import { NextApiRequest, NextApiResponse } from 'next';

// Configure Wasabi S3 client
const s3 = new AWS.S3({
  endpoint: 'https://s3.wasabisys.com',
  accessKeyId: process.env.WASABI_ACCESS_KEY,
  secretAccessKey: process.env.WASABI_SECRET_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { path } = req.query;    
    const bucketName = process.env.WASABI_BUCKET_NAME;
    

    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: bucketName,
      Key: `call-recordings/${path}.wav`,
      Expires: 3600 
    });

    res.status(200).json({ url: signedUrl });
    
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ error: 'Failed to generate audio URL' });
  }
}