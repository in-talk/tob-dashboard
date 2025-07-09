// components/AudioProcessor.tsx

import React, { useState, useCallback, useRef } from "react";
import { Upload, X, AlertCircle, CheckCircle } from "lucide-react";
import type { AudioFile, ProcessingStatus } from "../types/audio";
import {
  generateUniqueId,
  formatFileSize,
  getStatusClasses,
  validateAudioFile,
} from "../utils/audioProcessing";

const AudioProcessor: React.FC = () => {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({
    message: "",
    type: "idle",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>
    ) => {
      e.preventDefault();
      let uploadedFiles: FileList | null = null;

      if ("dataTransfer" in e) {
        uploadedFiles = e.dataTransfer.files;
      } else if ("target" in e && e.target instanceof HTMLInputElement) {
        uploadedFiles = e.target.files;
      }

      if (!uploadedFiles?.length) return;

      const newFiles: AudioFile[] = Array.from(uploadedFiles).map((file) => {
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
        message: `${newFiles.length} files added`,
        type: "success",
      });
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  }, []);

  const processFiles = async () => {
    if (files.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setStatus({
      message: "Processing files...",
      type: "processing",
    });

    const formData = new FormData();
    files.forEach(({ file }) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("/api/process-audio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "processed_audio.zip");
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      setStatus({
        message: "Processing complete! Files downloaded.",
        type: "success",
      });
      setFiles([]);
    } catch (error) {
      setStatus({
        message: `Error: ${
          error instanceof Error ? error.message : "Unknown error occurred"
        }`,
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setStatus({ message: "", type: "idle" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Audio File Processor</h1>
          {files.length > 0 && (
            <button
              onClick={handleReset}
              className="text-gray-600 hover:text-gray-800"
            >
              Clear All
            </button>
          )}
        </div>

        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
          onDrop={handleFileUpload}
          onDragOver={handleDragOver}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            <Upload className="w-12 h-12 text-gray-400 mb-4" />
            <span className="text-gray-600">
              Drop audio files here or click to upload
            </span>
            <span className="text-gray-400 text-sm mt-2">
              Supports WAV and MP3 files up to 100MB
            </span>
          </label>
        </div>

        {files.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Files ({files.length})</h2>
            <ul className="space-y-2">
              {files.map(({ file, id, status: fileStatus, error }) => (
                <li
                  key={id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border"
                >
                  <div className="flex items-center space-x-3">
                    {fileStatus === "error" ? (
                      <AlertCircle className="text-red-500" size={20} />
                    ) : fileStatus === "completed" ? (
                      <CheckCircle className="text-green-500" size={20} />
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
            files.length === 0 ||
            files.some((f) => f.status === "error")
          }
          className={`w-full py-3 px-4 rounded-md text-white font-medium transition-colors
            ${
              isProcessing ||
              files.length === 0 ||
              files.some((f) => f.status === "error")
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600"
            }`}
        >
          {isProcessing ? "Processing..." : "Process and Download"}
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
