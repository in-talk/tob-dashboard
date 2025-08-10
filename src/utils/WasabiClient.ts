import AWS from "aws-sdk";

let s3Client: AWS.S3 | null = null;

if (
  process.env.NEXT_PUBLIC_WASABI_VIEW_ACCESS_KEY &&
  process.env.NEXT_PUBLIC_WASABI_VIEW_SECRET_KEY &&
  process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME
) {
  s3Client = new AWS.S3({
    endpoint: "https://s3.wasabisys.com",
    accessKeyId: process.env.NEXT_PUBLIC_WASABI_VIEW_ACCESS_KEY,
    secretAccessKey: process.env.NEXT_PUBLIC_WASABI_VIEW_SECRET_KEY,
    region: "us-east-1", // Add region for better compatibility
    s3ForcePathStyle: true, // Required for some S3-compatible services
  });
} else {
  console.error("❌ Wasabi environment variables are not fully configured.");
}

// Option 1: Make it async (Recommended)
export const generateAudioUrl = async (
  audioPath: string
): Promise<string | null> => {
  if (!s3Client) {
    console.error("❌ Wasabi client is not initialized.");
    return null;
  }

  if (!audioPath) {
    console.error("❌ Audio path is empty or null.");
    return null;
  }

  try {
    const params = {
      Bucket: process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME!,
      Key: `call-recordings/${audioPath}.wav`,
      Expires: 3600,
    };

    // Use the promise-based version
    const url = await s3Client.getSignedUrlPromise("getObject", params);
    console.log("✅ Generated signed URL for:", audioPath);
    return url;
  } catch (err) {
    console.error("❌ Error generating signed URL:", err);
    return null;
  }
};

// Option 2: Keep it synchronous but with better error handling
export const generateAudioUrlSync = (audioPath: string): string | null => {
  if (!s3Client) {
    console.error("❌ Wasabi client is not initialized.");
    return null;
  }

  if (!audioPath) {
    console.error("❌ Audio path is empty or null.");
    return null;
  }

  try {
    const params = {
      Bucket: process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME!,
      Key: `call-recordings/${audioPath}.wav`,
      Expires: 3600,
    };

    const url = s3Client.getSignedUrl("getObject", params);
    return url;
  } catch (err) {
    console.error("❌ Error generating signed URL for", err);
    return null;
  }
};

// Option 3: More robust version with file extension detection
export const generateAudioUrlRobust = async (
  audioPath: string,
  fileExtension: string = "wav"
): Promise<string | null> => {
  if (!s3Client) {
    console.error("❌ Wasabi client is not initialized.");
    return null;
  }

  if (!audioPath) {
    console.error("❌ Audio path is empty or null.");
    return null;
  }

  try {
    // Handle different file extensions
    const extension = fileExtension.startsWith(".")
      ? fileExtension
      : `.${fileExtension}`;
    const key = `call-recordings/${audioPath}${extension}`;

    const params = {
      Bucket: process.env.NEXT_PUBLIC_WASABI_BUCKET_NAME!,
      Key: key,
      Expires: 3600,
    };

    // First check if the object exists (optional)
    try {
      await s3Client
        .headObject({
          Bucket: params.Bucket,
          Key: params.Key,
        })
        .promise();
    } catch (headErr) {
      console.error("❌ Audio file does not exist:", key, headErr);
      return null;
    }

    const url = await s3Client.getSignedUrlPromise("getObject", params);
    console.log("✅ Generated signed URL for:", key);
    return url;
  } catch (err) {
    console.error("❌ Error generating signed URL for", err);
    return null;
  }
};
