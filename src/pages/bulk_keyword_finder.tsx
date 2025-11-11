"use client";

import { withAuth } from "@/utils/auth";
import { GetServerSideProps } from "next";
import { useState } from "react";
import * as XLSX from "xlsx";

interface ProcessResult {
  transcript: string;
  selected_label: string | null;
  match_info: {
    matched_keyword?: string;
    total_score?: number;
    file_name?: string;
    is_exact_match?: boolean;
    message?: string;
  } | null;
  error?: string;
}

interface ApiResponse {
  processed_count: number;
  results: ProcessResult[];
}

export default function BulkKeywordFinder() {
  const [file, setFile] = useState<File | null>(null);
  const [turnNumber, setTurnNumber] = useState<number>(1);
  const [campaignId, setCampaignId] = useState<string>("10000");
  const [excludedLabels, setExcludedLabels] = useState<string>("POS,NEG");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setResults(null);
      setError(null);
    }
  };

  const readExcelFile = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });

          // Get the first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }) as any[][];

          // Extract transcripts from first column (skip header if exists)
          const transcripts = jsonData
            .slice(1) // Skip header row
            .map((row) => row[0])
            .filter(
              (text) => text && typeof text === "string" && text.trim() !== ""
            );

          resolve(transcripts);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (err) => reject(err);
      reader.readAsBinaryString(file);
    });
  };

  const processTranscripts = async () => {
    if (!file) {
      setError("Please upload a file first");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResults(null);

    try {
      // Read transcripts from Excel
      const transcripts = await readExcelFile(file);

      if (transcripts.length === 0) {
        throw new Error("No transcripts found in the file");
      }

      // Prepare excluded labels array
      const excludedLabelsArray = excludedLabels
        .split(",")
        .map((label) => label.trim())
        .filter((label) => label !== "");

      // In your component's processTranscripts function:
      const response = await fetch("/api/append-labels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcripts,
          turn: turnNumber,
          campaign_id: campaignId,
          excluded_labels: excludedLabelsArray,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResults = () => {
    if (!results) return;

    // Prepare data for Excel
    const excelData = [
      [
        "Transcript",
        "Selected Label",
        "Matched Keyword",
        "Total Score",
        "File Name",
        "Is Exact Match",
      ],
      ...results.map((result) => [
        result.transcript,
        result.selected_label || "No Match",
        result.match_info?.matched_keyword || "",
        result.match_info?.total_score || "",
        result.match_info?.file_name || "",
        result.match_info?.is_exact_match ? "Yes" : "No",
      ]),
    ];

    // Create workbook
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Results");

    // Set column widths
    worksheet["!cols"] = [
      { wch: 40 }, // Transcript
      { wch: 20 }, // Selected Label
      { wch: 25 }, // Matched Keyword
      { wch: 12 }, // Total Score
      { wch: 25 }, // File Name
      { wch: 15 }, // Is Exact Match
    ];

    // Download file
    XLSX.writeFile(workbook, `labeled_transcripts_${Date.now()}.xlsx`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Transcript Label Appender</h1>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="space-y-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Excel File
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              First column should contain transcripts (with header in row 1)
            </p>
          </div>

          {/* Turn Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Turn Number
            </label>
            <input
              type="number"
              value={turnNumber}
              onChange={(e) => setTurnNumber(parseInt(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Campaign ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign ID
            </label>
            <input
              type="text"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Excluded Labels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Excluded Labels (comma-separated)
            </label>
            <input
              type="text"
              value={excludedLabels}
              onChange={(e) => setExcludedLabels(e.target.value)}
              placeholder="POS,NEG"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Process Button */}
          <button
            onClick={processTranscripts}
            disabled={!file || isProcessing}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? "Processing..." : "Process Transcripts"}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Results ({results.length} transcripts processed)
            </h2>
            <button
              onClick={downloadResults}
              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
            >
              Download Results
            </button>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transcript
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Selected Label
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {result.transcript}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {result.selected_label ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {result.selected_label}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          No Match
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {result.match_info?.total_score || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {result.error ? (
                        <span className="text-red-600">Error</span>
                      ) : result.match_info?.is_exact_match ? (
                        <span className="text-green-600">Exact Match</span>
                      ) : result.selected_label ? (
                        <span className="text-blue-600">Matched</span>
                      ) : (
                        <span className="text-gray-600">No Match</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = withAuth(async () => {
  return { props: {} };
}, ["admin"]);