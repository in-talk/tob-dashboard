// pages/api/process-audio.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import archiver from 'archiver';

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
  // Clean the filename
  return baseName
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase()
    .replace(/_+/g, '_');
};

const processAudioFile = async (inputPath: string, outputDir: string, originalFilename: string): Promise<string> => {
  // Clean filename and add .wav extension
  const cleanName = cleanFilename(originalFilename);
  const outputFilename = `${cleanName}.wav`;
  const outputPath = path.join(outputDir, outputFilename);

  try {
    // Sox command with required parameters
    const command = `sox "${inputPath}" -r 8000 -c 1 -b 16 "${outputPath}"`;
    console.log('Executing command:', command);
    
    const { stdout, stderr } = await execAsync(command);
    if (stderr) {
      console.warn('Sox warning:', stderr);
    }
    
    return outputFilename;
  } catch (error) {
    console.error(`Error processing ${originalFilename}:`, error);
    throw new Error(`Failed to process ${originalFilename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create unique temporary directory
  const tempDir = path.join(process.cwd(), 'temp', Date.now().toString());
  const outputDir = path.join(tempDir, 'output');
  
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
    const [_, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const fileArray = Array.isArray(files.files) ? files.files : [files.files];
    const processedFiles: string[] = [];

    // Process each file
    for (const file of fileArray as FormidableFile[]) {
      if (!file) continue;
      
      try {
        const outputFilename = await processAudioFile(
          file.filepath,
          outputDir,
          file.originalFilename || 'unknown_file'
        );
        processedFiles.push(outputFilename);
      } catch (error) {
        console.error('Error processing file:', error);
      }
    }

    if (processedFiles.length === 0) {
      throw new Error('No files were processed successfully');
    }

    // Create zip containing processed files
    const zipPath = path.join(tempDir, 'converted_audio.zip');
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      
      // Add each processed file to the zip
      processedFiles.forEach(filename => {
        const filePath = path.join(outputDir, filename);
        archive.file(filePath, { name: filename });
      });
      
      archive.finalize();
    });

    // Stream the zip file to client
    const zipStream = fs.createReadStream(zipPath);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=converted_wav_files.zip`);
    
    zipStream.pipe(res);
    
    // Clean up after streaming
    zipStream.on('end', () => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error('Error cleaning up:', error);
      }
    });

  } catch (error) {
    // Clean up on error
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('Error cleaning up:', cleanupError);
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ error: errorMessage });
  }
}