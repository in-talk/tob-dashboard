import AWS from 'aws-sdk';

let s3Client: AWS.S3 | null = null;

if (
  process.env.NEXT_PUBLIC_WASABI_VIEW_ACCESS_KEY &&
  process.env.NEXT_PUBLIC_WASABI_VIEW_SECRET_KEY &&
  process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME
) {
  s3Client = new AWS.S3({
    endpoint: 'https://s3.wasabisys.com',
    accessKeyId: process.env.NEXT_PUBLIC_WASABI_VIEW_ACCESS_KEY,
    secretAccessKey: process.env.NEXT_PUBLIC_WASABI_VIEW_SECRET_KEY,
  });
} else {
  console.error('❌ Wasabi environment variables are not fully configured.');
}

export const generateAudioUrl = (audioPath: string): string | null => {
  if (!s3Client) {
    console.error('❌ Wasabi client is not initialized.');
    return null;
  }

  try {
    return s3Client.getSignedUrl('getObject', {
      Bucket: process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME,
      Key: `call-recordings/${audioPath}.wav`,
      Expires: 3600, 
    });
  } catch (err) {
    console.error('❌ Error generating signed URL:', err);
    return null;
  }
};