"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  Upload,
  X,
  AlertCircle,
  CheckCircle,
  Volume2,
  Folder,
  FileArchive,
  File as FileIcon,
} from "lucide-react";
import JSZip from "jszip";
import type { AudioFile, ProcessingStatus } from "../types/audio";
import {
  generateUniqueId,
  formatFileSize,
  getStatusClasses,
  validateAudioFile,
} from "../utils/audioProcessing";
import { audioProcessorData } from "@/constants";

type UploadMode = "files" | "folder" | "zip";

const AUDIO_EXTENSIONS = new Set(["wav", "mp3"]);

// Vercel serverless functions cap request bodies at ~4.5 MB regardless of
// what formidable is configured to accept. 4 MB per batch leaves ~500 KB of
// multipart overhead room; going bigger risks 413s again.
const MAX_BATCH_BYTES = 7 * 1024 * 1024;

// How many batches to have in flight at once. Higher = faster wall time, but
// more concurrent load on the FastAPI ffmpeg workers and on Vercel's
// serverless concurrency budget. 4 is a good default; drop to 2 if you see
// the backend timing out under load, raise to 6 if it's clearly idle.
const MAX_PARALLEL_BATCHES = 6;
const MIME_BY_EXT: Record<string, string> = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
};

const getExtension = (name: string): string => {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
};

const isAudioFilename = (name: string): boolean =>
  AUDIO_EXTENSIONS.has(getExtension(name));

const stripZipExt = (name: string): string =>
  name.replace(/\.zip$/i, "");

const AudioProcessor: React.FC = () => {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({
    message: "",
    type: "idle",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [addBackground, setAddBackground] = useState(false);
  const [backgroundVolume, setBackgroundVolume] = useState(0.15);
  const [uploadMode, setUploadMode] = useState<UploadMode>("files");
  const [folderName, setFolderName] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);

  const filesInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const resetSelection = useCallback(() => {
    setFiles([]);
    setFolderName("");
    if (filesInputRef.current) filesInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
    if (zipInputRef.current) zipInputRef.current.value = "";
  }, []);

  const addAcceptedFiles = useCallback((accepted: File[]) => {
    const newFiles: AudioFile[] = accepted.map((file) => {
      const error = validateAudioFile(file);
      return {
        file,
        id: generateUniqueId(),
        status: error ? "error" : "pending",
        error: error || undefined,
      };
    });
    setFiles((prev) => [...prev, ...newFiles]);
    setStatus({
      message: audioProcessorData.status.added(newFiles.length),
      type: "success",
    });
  }, []);

  const handleFilesSelected = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) return;
      addAcceptedFiles(Array.from(fileList));
    },
    [addAcceptedFiles]
  );

  const handleFolderSelected = useCallback(
    (fileList: FileList | null) => {
      if (!fileList?.length) return;
      const arr = Array.from(fileList);
      // First segment of webkitRelativePath is the root folder name
      const firstRel = (arr[0] as File & { webkitRelativePath?: string })
        .webkitRelativePath;
      const rootName = firstRel ? firstRel.split("/")[0] : "";
      if (rootName) setFolderName(rootName);
      // Rebuild as flat File objects so the browser sends only the base name
      // in the multipart filename (Chrome otherwise sends webkitRelativePath,
      // which makes the backend try to open a non-existent subfolder).
      const flattened = arr
        .filter((f) => isAudioFilename(f.name))
        .map(
          (f) => new File([f], f.name, { type: f.type, lastModified: f.lastModified })
        );
      if (flattened.length === 0) {
        setStatus({
          message: "No WAV or MP3 files found in the selected folder.",
          type: "error",
        });
        return;
      }
      addAcceptedFiles(flattened);
    },
    [addAcceptedFiles]
  );

  const handleZipSelected = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) return;
      const zipFile = fileList[0];
      if (getExtension(zipFile.name) !== "zip") {
        setStatus({
          message: "Please upload a .zip file.",
          type: "error",
        });
        return;
      }
      setIsExtracting(true);
      setStatus({
        message: `Extracting ${zipFile.name}...`,
        type: "processing",
      });
      try {
        const zip = await JSZip.loadAsync(zipFile);
        const extracted: File[] = [];
        const entries = Object.values(zip.files).filter(
          (e) => !e.dir && isAudioFilename(e.name)
        );
        for (const entry of entries) {
          const blob = await entry.async("blob");
          const base = entry.name.split("/").pop() || entry.name;
          const ext = getExtension(base);
          const mime = MIME_BY_EXT[ext] ?? "audio/wav";
          extracted.push(new File([blob], base, { type: mime }));
        }
        if (extracted.length === 0) {
          setStatus({
            message: "No WAV or MP3 files found inside the zip.",
            type: "error",
          });
          return;
        }
        setFolderName(stripZipExt(zipFile.name));
        addAcceptedFiles(extracted);
      } catch (err) {
        console.error("Zip extraction failed:", err);
        setStatus({
          message: `Failed to read zip: ${
            err instanceof Error ? err.message : "unknown error"
          }`,
          type: "error",
        });
      } finally {
        setIsExtracting(false);
      }
    },
    [addAcceptedFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (uploadMode === "files") handleFilesSelected(e.target.files);
      else if (uploadMode === "folder") handleFolderSelected(e.target.files);
      else if (uploadMode === "zip") handleZipSelected(e.target.files);
    },
    [uploadMode, handleFilesSelected, handleFolderSelected, handleZipSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const dropped = e.dataTransfer.files;
      if (!dropped?.length) return;
      if (uploadMode === "zip") {
        handleZipSelected(dropped);
      } else if (uploadMode === "folder") {
        // Native drag-drop of folders via webkitdirectory input isn't reliable
        // cross-browser; ask users to click when in folder mode.
        setStatus({
          message:
            "Please click the box to choose a folder (drag-and-drop of folders isn't supported here).",
          type: "error",
        });
      } else {
        handleFilesSelected(dropped);
      }
    },
    [uploadMode, handleFilesSelected, handleZipSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  }, []);

  const onModeChange = useCallback(
    (mode: UploadMode) => {
      if (mode === uploadMode) return;
      setUploadMode(mode);
      resetSelection();
      setStatus({ message: "", type: "idle" });
    },
    [uploadMode, resetSelection]
  );

  const triggerPicker = useCallback(() => {
    if (uploadMode === "files") filesInputRef.current?.click();
    else if (uploadMode === "folder") folderInputRef.current?.click();
    else if (uploadMode === "zip") zipInputRef.current?.click();
  }, [uploadMode]);

  // Slice the pending files into batches whose total size stays under the
  // Vercel/nginx body cap. Files bigger than the cap on their own get their
  // own batch — the request will likely 413, but at least the rest succeed.
  const chunkFilesBySize = useCallback((all: AudioFile[]): AudioFile[][] => {
    const batches: AudioFile[][] = [];
    let current: AudioFile[] = [];
    let currentSize = 0;
    for (const item of all) {
      const size = item.file.size;
      if (size >= MAX_BATCH_BYTES) {
        if (current.length > 0) {
          batches.push(current);
          current = [];
          currentSize = 0;
        }
        batches.push([item]);
        continue;
      }
      if (currentSize + size > MAX_BATCH_BYTES && current.length > 0) {
        batches.push(current);
        current = [];
        currentSize = 0;
      }
      current.push(item);
      currentSize += size;
    }
    if (current.length > 0) batches.push(current);
    return batches;
  }, []);

  const processFiles = async () => {
    if (files.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setStatus({
      message: audioProcessorData.status.processing,
      type: "processing",
    });

    const batches = chunkFilesBySize(files);
    const responseZips: Blob[] = [];
    const failedBatches: number[] = [];
    let completed = 0;

    const runBatch = async (batchIndex: number): Promise<void> => {
      const formData = new FormData();
      formData.append("addBackground", addBackground.toString());
      formData.append("backgroundVolume", backgroundVolume.toString());
      if (folderName) formData.append("folder_name", folderName);
      batches[batchIndex].forEach(({ file }) => {
        formData.append("files", file);
      });

      try {
        const response = await fetch("/api/audio/process-audio", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: response.statusText }));
          throw new Error(errorData.detail || `HTTP ${response.status}`);
        }
        responseZips.push(await response.blob());
      } catch (err) {
        console.error(`Batch ${batchIndex + 1} failed:`, err);
        failedBatches.push(batchIndex + 1);
      } finally {
        completed += 1;
        setStatus({
          message: `Processed ${completed} of ${batches.length} batches (${MAX_PARALLEL_BATCHES} in parallel)...`,
          type: "processing",
        });
      }
    };

    try {
      // Bounded-parallelism worker pool: at most MAX_PARALLEL_BATCHES
      // requests in flight; each worker pulls the next index and repeats.
      let nextIndex = 0;
      const worker = async (): Promise<void> => {
        while (true) {
          const i = nextIndex++;
          if (i >= batches.length) return;
          await runBatch(i);
        }
      };
      const workers = Array.from(
        { length: Math.min(MAX_PARALLEL_BATCHES, batches.length) },
        () => worker()
      );
      await Promise.all(workers);

      if (responseZips.length === 0) {
        throw new Error(
          `All ${batches.length} batches failed. Nothing to download.`
        );
      }

      // Merge every returned zip into one final archive.
      setStatus({
        message: `Merging ${responseZips.length} zip(s)...`,
        type: "processing",
      });
      const mergedZip = new JSZip();
      let mergedCount = 0;
      for (const zipBlob of responseZips) {
        const sub = await JSZip.loadAsync(zipBlob);
        for (const entry of Object.values(sub.files)) {
          if (entry.dir) continue;
          const base = entry.name.split("/").pop() || entry.name;
          // If two batches produce the same filename, suffix to avoid collision.
          const name = mergedZip.file(base) ? `${mergedCount}_${base}` : base;
          mergedZip.file(name, await entry.async("blob"));
          mergedCount += 1;
        }
      }

      const finalBlob = await mergedZip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(finalBlob);
      const link = document.createElement("a");
      const downloadName = folderName
        ? `${folderName}.zip`
        : "processed_audio.zip";
      link.href = url;
      link.setAttribute("download", downloadName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      if (failedBatches.length > 0) {
        setStatus({
          message: `Downloaded ${mergedCount} files. ${failedBatches.length} batch(es) failed (${failedBatches.join(", ")}).`,
          type: "error",
        });
      } else {
        setStatus({
          message: audioProcessorData.status.success,
          type: "success",
        });
        resetSelection();
      }
    } catch (error) {
      setStatus({
        message: audioProcessorData.status.error(
          error instanceof Error ? error.message : undefined
        ),
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    resetSelection();
    setStatus({ message: "", type: "idle" });
    setAddBackground(false);
    setBackgroundVolume(0.15);
  };

  const modeButtonClass = (mode: UploadMode) =>
    `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
      uploadMode === mode
        ? "bg-blue-500 text-white border-blue-500"
        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
    }`;

  const dropzoneLabel = (() => {
    if (uploadMode === "folder")
      return "Click to select a folder of audio files";
    if (uploadMode === "zip")
      return "Drop a .zip file here or click to upload";
    return audioProcessorData.upload.dropOrClick;
  })();

  const dropzoneSubtext = (() => {
    if (uploadMode === "folder")
      return "The folder name is used to name the downloaded archive.";
    if (uploadMode === "zip")
      return "Zip should contain WAV or MP3 files (any subfolder depth).";
    return audioProcessorData.upload.supportedFormats;
  })();

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{audioProcessorData.title}</h1>
          {files.length > 0 && (
            <button
              onClick={handleReset}
              className="text-gray-600 hover:text-gray-800"
            >
              {audioProcessorData.clearAll}
            </button>
          )}
        </div>

        {/* Upload mode selector */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={modeButtonClass("files")}
            onClick={() => onModeChange("files")}
          >
            <FileIcon size={16} />
            Files
          </button>
          <button
            type="button"
            className={modeButtonClass("folder")}
            onClick={() => onModeChange("folder")}
          >
            <Folder size={16} />
            Folder
          </button>
          <button
            type="button"
            className={modeButtonClass("zip")}
            onClick={() => onModeChange("zip")}
          >
            <FileArchive size={16} />
            Zip
          </button>
        </div>

        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={triggerPicker}
        >
          <input
            ref={filesInputRef}
            type="file"
            multiple
            accept="audio/*"
            onChange={handleInputChange}
            className="hidden"
          />
          <input
            ref={folderInputRef}
            type="file"
            // @ts-expect-error -- non-standard but widely supported directory picker attrs
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleInputChange}
            className="hidden"
          />
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={handleInputChange}
            className="hidden"
          />
          <div className="flex flex-col items-center">
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <span className="text-gray-600">{dropzoneLabel}</span>
            <span className="text-gray-400 text-sm mt-2">
              {dropzoneSubtext}
            </span>
            {folderName && (
              <span className="text-blue-600 text-sm mt-2">
                Source: <span className="font-medium">{folderName}</span> —
                download will be <span className="font-medium">{folderName}.zip</span>
              </span>
            )}
            {isExtracting && (
              <span className="text-blue-600 text-sm mt-2">
                Reading zip contents...
              </span>
            )}
          </div>
        </div>

        {/* Background Audio Options */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="addBackground"
              checked={addBackground}
              onChange={(e) => setAddBackground(e.target.checked)}
              className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="addBackground"
              className="flex items-center space-x-2 text-sm font-medium text-gray-700 cursor-pointer"
            >
              <Volume2 size={18} />
              <span>Add Background Noise</span>
            </label>
          </div>

          {addBackground && (
            <div className="ml-7 space-y-2">
              <label
                htmlFor="backgroundVolume"
                className="block text-sm text-gray-600"
              >
                Background Volume: {backgroundVolume.toFixed(2)}
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  id="backgroundVolume"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={backgroundVolume}
                  onChange={(e) =>
                    setBackgroundVolume(parseFloat(e.target.value))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <input
                  type="number"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={backgroundVolume}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (value >= 0.01 && value <= 0.5) {
                      setBackgroundVolume(value);
                    }
                  }}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md"
                />
              </div>
              <p className="text-xs text-gray-500">
                Recommended: 0.10 - 0.20 for subtle background noise
              </p>
            </div>
          )}
        </div>

        {files.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              {audioProcessorData.files.heading(files.length)}
            </h2>
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {files.map(({ file, id, status: fileStatus, error }) => (
                <li
                  key={id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
                >
                  <div className="flex items-center space-x-3">
                    {fileStatus === "error" ? (
                      <AlertCircle
                        className="text-red-500"
                        size={20}
                        aria-label={audioProcessorData.files.errorIconLabel}
                      />
                    ) : fileStatus === "completed" ? (
                      <CheckCircle
                        className="text-green-500"
                        size={20}
                        aria-label={audioProcessorData.files.completedIconLabel}
                      />
                    ) : null}
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                      {error && (
                        <p className="text-xs text-red-500 mt-1">{error}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(id)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label={audioProcessorData.files.removeButton}
                  >
                    <X size={20} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={processFiles}
          disabled={
            isProcessing ||
            isExtracting ||
            files.length === 0 ||
            files.some((f) => f.status === "error")
          }
          className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors
            ${
              isProcessing ||
              isExtracting ||
              files.length === 0 ||
              files.some((f) => f.status === "error")
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
        >
          {isProcessing
            ? audioProcessorData.buttons.processing
            : audioProcessorData.buttons.process}
        </button>

        {status.message && (
          <div
            className={`mt-4 p-4 rounded-md border ${getStatusClasses(
              status.type
            )}`}
          >
            <p className="text-sm">{status.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioProcessor;
