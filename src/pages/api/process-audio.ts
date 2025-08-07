// pages/api/process-audio.ts

import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import archiver from "archiver";

const execAsync = promisify(exec);

export const config = {
  api: {
    bodyParser: false,
  },
};

interface FormidableFile extends formidable.File {
  filepath: string;
  originalFilename: string;
}

const cleanFilename = (filename: string): string => {
  // Get base name without extension
  const baseName = path.parse(filename).name;
  return baseName;
};

const processAudioFile = async (
  inputPath: string,
  outputDir: string,
  originalFilename: string,
  backgroundPath?: string,
  backgroundVolume: number = 0.15
): Promise<string> => {
  // Clean filename and add .wav extension
  const cleanName = cleanFilename(originalFilename);
  const outputFilename = `${cleanName}.wav`;
  const outputPath = path.join(outputDir, outputFilename);

  try {
    if (backgroundPath && fs.existsSync(backgroundPath)) {
      // Get duration of the input audio first
      const durationCommand = `soxi -D "${inputPath}"`;
      const { stdout: durationStr } = await execAsync(durationCommand);
      const duration = parseFloat(durationStr.trim());

      // Modified piped command: handle bit depth in final output only
      const command = `sox "${inputPath}" -r 8000 -c 1 -p | sox -m - -v ${backgroundVolume} "${backgroundPath}" -p repeat 999 | sox -p -r 8000 -c 1 -b 16 "${outputPath}" trim 0 ${duration}`;

      console.log("Executing piped command:", command);

      const { stderr } = await execAsync(command);
      if (stderr) {
        console.warn("Sox warning:", stderr);
      }
    } else {
      // No background audio, just convert the main audio
      const command = `sox "${inputPath}" -r 8000 -c 1 -b 16 "${outputPath}"`;
      console.log("Converting without background:", command);

      const { stderr } = await execAsync(command);
      if (stderr) {
        console.warn("Sox warning:", stderr);
      }
    }

    return outputFilename;
  } catch (error) {
    console.error(`Error processing ${originalFilename}:`, error);
    throw new Error(
      `Failed to process ${originalFilename}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

const getBackgroundAudioPath = (
  backgroundType: string = "default"
): string | null => {
  // Define your background audio files in the public folder
  const backgroundFiles = {
    default: "audio/call_center_ambience.wav",
    office: "audio/office_chatter.wav",
    busy: "audio/busy_call_center.wav",
    quiet: "audio/quiet_office.wav",
    none: null,
  };

  const bgPath =
    backgroundFiles[backgroundType as keyof typeof backgroundFiles] ||
    backgroundFiles["default"];

  if (!bgPath) return null;

  // In Next.js, public folder is served from the root, so we join with public
  const fullPath = path.join(process.cwd(), "public", bgPath);
  return fs.existsSync(fullPath) ? fullPath : null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Create unique temporary directory
  const tempDir = path.join(process.cwd(), "temp", Date.now().toString());
  const outputDir = path.join(tempDir, "output");

  try {
    // Create directories
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });

    // Parse incoming files
    const form = formidable({
      uploadDir: tempDir,
      keepExtensions: true,
      maxFileSize: 100 * 1024 * 1024, // 100MB limit
    });

    // Parse form data
    const [fields, files] = await new Promise<
      [formidable.Fields, formidable.Files]
    >((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Get background audio settings from form fields
    const backgroundType = Array.isArray(fields.backgroundType)
      ? fields.backgroundType[0]
      : fields.backgroundType || "default";

    const backgroundVolume = parseFloat(
      Array.isArray(fields.backgroundVolume)
        ? fields.backgroundVolume[0]
        : fields.backgroundVolume || "0"
    );

    const backgroundPath = getBackgroundAudioPath(backgroundType);

    if (backgroundType !== "none" && !backgroundPath) {
      console.warn(
        `Background audio type '${backgroundType}' not found, processing without background`
      );
    }

    const fileArray = Array.isArray(files.files) ? files.files : [files.files];
    const processedFiles: string[] = [];

    // Process each file
    for (const file of fileArray as FormidableFile[]) {
      if (!file) continue;

      try {
        const outputFilename = await processAudioFile(
          file.filepath,
          outputDir,
          file.originalFilename || "unknown_file",
          backgroundPath || undefined,
          backgroundVolume
        );
        processedFiles.push(outputFilename);
      } catch (error) {
        console.error("Error processing file:", error);
      }
    }

    if (processedFiles.length === 0) {
      throw new Error("No files were processed successfully");
    }

    // Create zip containing processed files
    const zipPath = path.join(tempDir, "converted_audio.zip");
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    await new Promise<void>((resolve, reject) => {
      output.on("close", () => resolve()); // Call resolve() with no arguments
      archive.on("error", reject);
      archive.pipe(output);

      // Add each processed file to the zip
      processedFiles.forEach((filename) => {
        const filePath = path.join(outputDir, filename);
        archive.file(filePath, { name: filename });
      });

      archive.finalize();
    });

    // Stream the zip file to client
    const zipStream = fs.createReadStream(zipPath);
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=converted_wav_files.zip`
    );

    zipStream.pipe(res);

    // Clean up after streaming
    zipStream.on("end", () => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error("Error cleaning up:", error);
      }
    });
  } catch (error) {
    // Clean up on error
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error("Error cleaning up:", cleanupError);
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    res.status(500).json({ error: errorMessage });
  }
}
