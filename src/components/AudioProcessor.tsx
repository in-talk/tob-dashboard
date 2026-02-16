"use client";

import React, { useState, useCallback, useRef } from "react";
import { Upload, X, AlertCircle, CheckCircle, Volume2 } from "lucide-react";
import type { AudioFile, ProcessingStatus } from "../types/audio";
import {
  generateUniqueId,
  formatFileSize,
  getStatusClasses,
  validateAudioFile,
} from "../utils/audioProcessing";
import { audioProcessorData } from "@/constants";

const AudioProcessor: React.FC = () => {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({
    message: "",
    type: "idle",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [addBackground, setAddBackground] = useState(false);
  const [backgroundVolume, setBackgroundVolume] = useState(0.15);
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
        message: audioProcessorData.status.added(newFiles.length),
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
      message: audioProcessorData.status.processing,
      type: "processing",
    });

    const formData = new FormData();
    
    // Add background options
    formData.append("addBackground", addBackground.toString());
    formData.append("backgroundVolume", backgroundVolume.toString());
    
    // Add all files
    files.forEach(({ file }) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_KEYWORD_API_URL || ""}/process-audio`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || "Processing failed");
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
        message: audioProcessorData.status.success,
        type: "success",
      });
      setFiles([]);
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
    setFiles([]);
    setStatus({ message: "", type: "idle" });
    setAddBackground(false);
    setBackgroundVolume(0.15);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
              {audioProcessorData.upload.dropOrClick}
            </span>
            <span className="text-gray-400 text-sm mt-2">
              {audioProcessorData.upload.supportedFormats}
            </span>
          </label>
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
                  onChange={(e) => setBackgroundVolume(parseFloat(e.target.value))}
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
            <ul className="space-y-2">
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