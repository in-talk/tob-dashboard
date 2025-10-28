"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scrollArea";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  TestTube,
  Plus,
  Trash2,
  Upload,
  FileSpreadsheet,
  Play,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { useState, useRef } from "react";
import * as XLSX from "xlsx";

type TestCase = {
  text: string;
  expected: "YES" | "NO" | "UNSURE" | "NEGATIVEAGE" | "AGEUNSURE";
};

type TestResult = {
  text: string;
  response_text: string;
  expected: string;
  actual: string;
  extracted_age: number | null;
  confidence: number;
  reasoning: string;
  is_correct: boolean;
};

type BulkTestResponse = {
  results: TestResult[];
  summary: {
    total_tests: number;
    correct_predictions: number;
    incorrect_predictions: number;
    accuracy_percentage: number;
    breakdown_by_expected: Record<string, { total: number; correct: number }>;
    breakdown_by_actual: Record<string, number>;
    age_range: string;
  };
};

export default function BulkAgeTestPage() {
  const [minAge, setMinAge] = useState<number>(20);
  const [maxAge, setMaxAge] = useState<number>(55);
  const [testCases, setTestCases] = useState<TestCase[]>([
    { text: "I am forty five", expected: "YES" },
    { text: "I'm sixty years old", expected: "NO" },
    { text: "not interested", expected: "NO" },
    { text: "tell me more", expected: "UNSURE" },
  ]);
  const [newTestCase, setNewTestCase] = useState<TestCase>({
    text: "",
    expected: "YES",
  });

  const [response, setResponse] = useState<BulkTestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const variantMap = {
    YES: "default",
    NO: "destructive",
    UNSURE: "outline",
    NEGATIVEAGE: "secondary",
    AGEUNSURE: "warning",
    
  } as const;
  const addTestCase = () => {
    if (newTestCase.text.trim()) {
      setTestCases([...testCases, { ...newTestCase }]);
      setNewTestCase({ text: "", expected: "YES" });
    }
  };

  const removeTestCase = (index: number) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const clearAllTestCases = () => {
    setTestCases([]);
  };

  const downloadExcelTemplate = () => {
    const templateData = [
      { text: "I am twenty five", expected: "YES" },
      { text: "I'm sixty years old", expected: "NO" },
      { text: "not interested", expected: "NO" },
      { text: "tell me more", expected: "UNSURE" },
      { text: "I am thirty", expected: "YES" },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Test Cases");

    // Add some styling to the header
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1:B1");
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!ws[address]) continue;
      ws[address].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "EEEEEE" } },
      };
    }

    XLSX.writeFile(wb, "age-test-template.xlsx");
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus("Processing file...");
    setError("");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        throw new Error("Excel file is empty");
      }

      // Validate required columns
      const requiredColumns = ["text", "expected"];
      const firstRow = jsonData[0];
      const missingColumns = requiredColumns.filter(
        (col) => !(col in firstRow)
      );

      if (missingColumns.length > 0) {
        throw new Error(
          `Missing required columns: ${missingColumns.join(", ")}`
        );
      }

      // Convert and validate data
      const newTestCases: TestCase[] = jsonData.map((row, index) => {
        const text = String(row.text || "").trim();
        const expected = String(row.expected || "").toUpperCase();

        if (!text) {
          throw new Error(`Row ${index + 2}: Text is required`);
        }

        if (!["YES", "NO", "UNSURE", "NEGATIVEAGE","AGEUNSURE"].includes(expected)) {
          throw new Error(
            `Row ${index + 2}: Expected must be YES, NO, UNSURE, NEGATIVEAGE or AGEUNSURE`
          );
        }

        return {
          text,
          expected: expected as "YES" | "NO" | "UNSURE" | "NEGATIVEAGE" | "AGEUNSURE",
        };
      });

      setTestCases(newTestCases);
      setUploadStatus(`Successfully loaded ${newTestCases.length} test cases`);
      setTimeout(() => setUploadStatus(""), 3000);
    } catch (error) {
      setError(
        `File upload error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setUploadStatus("");
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await fetch("/api/bulk-age-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          min_age: minAge,
          max_age: maxAge,
          test_cases: testCases,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to run bulk test");
      }

      const data: BulkTestResponse = await res.json();
      setResponse(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    if (!response) return;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Results worksheet
    const resultsData = response.results.map((result) => ({
      Text: result.text,
      ResponseText: result.response_text,
      Expected: result.expected,
      Actual: result.actual,
      "Extracted Age": result.extracted_age || "N/A",
      Confidence: `${(result.confidence * 100).toFixed(1)}%`,
      Reasoning: result.reasoning,
      "Is Correct": result.is_correct ? "✓" : "✗",
    }));

    const ws1 = XLSX.utils.json_to_sheet(resultsData);
    XLSX.utils.book_append_sheet(wb, ws1, "Test Results");

    // Summary worksheet
    const summaryData = [
      ["Metric", "Value"],
      ["Total Tests", response.summary.total_tests],
      ["Correct Predictions", response.summary.correct_predictions],
      ["Incorrect Predictions", response.summary.incorrect_predictions],
      ["Accuracy", `${response.summary.accuracy_percentage}%`],
      ["Age Range", response.summary.age_range],
      ["", ""],
      ["Breakdown by Expected", ""],
    ];

    // Add breakdown data
    Object.entries(response.summary.breakdown_by_expected).forEach(
      ([key, value]) => {
        summaryData.push([`${key} - Total`, value.total]);
        summaryData.push([`${key} - Correct`, value.correct]);
        summaryData.push([
          `${key} - Accuracy`,
          `${((value.correct / value.total) * 100).toFixed(1)}%`,
        ]);
      }
    );

    const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws2, "Summary");

    // Download
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    XLSX.writeFile(wb, `age-classifier-test-${timestamp}.xlsx`);
  };

  const getStatusColor = (isCorrect: boolean) => {
    return isCorrect
      ? "bg-green-500 text-green-800 border-green-200"
      : "bg-red-500 text-red-800 border-red-200";
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return "text-green-600";
    if (accuracy >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-6 space-y-8">
        {/* Header */}
        {/* <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <TestTube className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Age Classifier Testing Suite
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Test your age classifier with multiple inputs, analyze performance
            metrics, and optimize accuracy
          </p>
        </div> */}

        {/* Configuration Section */}
        <Card className="shadow-lg border-0">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Age Range */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white-700">
                    Minimum Age
                  </label>
                  <Input
                    type="number"
                    value={minAge}
                    onChange={(e) => setMinAge(Number(e.target.value))}
                    required
                    className="text-center h-12 text-lg border-2 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-white-700">
                    Maximum Age
                  </label>
                  <Input
                    type="number"
                    value={maxAge}
                    onChange={(e) => setMaxAge(Number(e.target.value))}
                    required
                    className="text-center h-12 text-lg border-2 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* File Upload Section */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
                <div className="text-center space-y-4">
                  <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      Upload Test Cases from Excel
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Upload an Excel file with text and expected columns
                    </p>
                    <div className="flex justify-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Choose Excel File
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={downloadExcelTemplate}
                        className="flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download Template
                      </Button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>
                {uploadStatus && (
                  <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-md text-center">
                    <span className="text-green-700 font-medium">
                      {uploadStatus}
                    </span>
                  </div>
                )}
              </div>

              {/* Test Cases Management */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-lg font-semibold text-gray-700">
                    Test Cases ({testCases.length})
                  </label>
                  {testCases.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearAllTestCases}
                      className="text-red-600 hover:text-red-700"
                    >
                      Clear All
                    </Button>
                  )}
                </div>

                {testCases.length > 0 && (
                  <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-4 bg-white">
                    {testCases.map((testCase, index) => (
                      <div
                        key={index}
                        className="flex gap-3 items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 text-sm text-black font-medium">
                          {testCase.text}
                        </div>
                        <Badge
                          variant={variantMap[testCase.expected] || "success"}
                        >
                          {testCase.expected}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTestCase(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Test Case */}
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Textarea
                      value={newTestCase.text}
                      onChange={(e) =>
                        setNewTestCase({ ...newTestCase, text: e.target.value })
                      }
                      placeholder="Enter test input..."
                      className="resize-none h-12 border-2 focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={newTestCase.expected}
                    onChange={(e) => {
                      const newValue = e.target.value as
                        | "YES"
                        | "NO"
                        | "UNSURE"
                        | "NEGATIVEAGE";

                      console.log(e.target.value);
                      const updatedTestCase = {
                        ...newTestCase,
                        expected: newValue,
                      };

                      setNewTestCase(updatedTestCase);

                      // Add test case with the updated value
                      if (updatedTestCase.text.trim()) {
                        setTestCases([...testCases, { ...updatedTestCase }]);
                        setNewTestCase({ text: "", expected: "YES" });
                      }
                    }}
                    className="px-4 py-3 border-2 rounded-md focus:border-blue-500 focus:outline-none"
                  >
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                    <option value="UNSURE">UNSURE</option>
                    <option value="AGEUNSURE">AGEUNSURE</option>
                    <option value="NEGATIVEAGE">NEGATIVEAGE</option>
                  </select>
                  <Button
                    type="button"
                    onClick={addTestCase}
                    variant="outline"
                    className="h-12 px-4"
                    disabled={!newTestCase.text.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || testCases.length === 0}
                className="w-full h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Running Tests...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Run Bulk Test
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <div className="font-medium">Error: {error}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <BarChart3 className="w-5 h-5 text-green-600" />
                Test Results
              </CardTitle>
              {response && (
                <Button
                  onClick={downloadExcel}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Excel Report
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <div className="space-y-2">
                    <div className="text-lg font-medium text-gray-700">
                      Running Tests...
                    </div>
                    <div className="text-sm text-gray-500">
                      This may take a few moments
                    </div>
                  </div>
                </div>
              </div>
            )}

            {response && !loading && (
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                    <div className="text-3xl font-bold text-blue-700">
                      {response.summary.total_tests}
                    </div>
                    <div className="text-sm font-medium text-blue-600 mt-1">
                      Total Tests
                    </div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                    <div className="text-3xl font-bold text-green-700">
                      {response.summary.correct_predictions}
                    </div>
                    <div className="text-sm font-medium text-green-600 mt-1">
                      Correct
                    </div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                    <div className="text-3xl font-bold text-red-700">
                      {response.summary.incorrect_predictions}
                    </div>
                    <div className="text-sm font-medium text-red-600 mt-1">
                      Incorrect
                    </div>
                  </div>
                  <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                    <div
                      className={`text-3xl font-bold ${getAccuracyColor(
                        response.summary.accuracy_percentage
                      )}`}
                    >
                      {response.summary.accuracy_percentage}%
                    </div>
                    <div className="text-sm font-medium text-purple-600 mt-1">
                      Accuracy
                    </div>
                  </div>
                </div>

                {/* Detailed Results */}
                <div>
                  <h3 className="text-xl font-semibold mb-4 text-gray-800">
                    Detailed Results
                  </h3>
                  <ScrollArea className="h-96 border rounded-lg">
                    <div className="space-y-3 p-4">
                      {response.results.map((result, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                            result.is_correct
                              ? "border-green-200 bg-green-50 hover:bg-green-100"
                              : "border-red-200 bg-red-50 hover:bg-red-100"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-800 mb-1">
                                {result.text}
                              </div>
                              <div className="font-semibold text-sm text-red-400 mb-2">
                                {result.response_text}
                              </div>
                              <div className="text-sm text-gray-600">
                                {result.reasoning}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 ml-4">
                              <div className="flex gap-2">
                                <Badge variant="outline" className="text-xs">
                                  Expected: {result.expected}
                                </Badge>
                                <Badge
                                  className={getStatusColor(result.is_correct)}
                                >
                                  Actual: {result.actual}
                                </Badge>
                              </div>
                              <div className="text-right">
                                <span
                                  className={`text-sm font-medium ${
                                    result.is_correct
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {result.is_correct
                                    ? "✓ Correct"
                                    : "✗ Incorrect"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-6 text-sm text-gray-500 border-t border-gray-200 pt-2">
                            <span>
                              <span className="font-medium">Age:</span>{" "}
                              {result.extracted_age || "N/A"}
                            </span>
                            <span>
                              <span className="font-medium">Confidence:</span>{" "}
                              {(result.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}

            {!response && !loading && !error && (
              <div className="text-center py-20">
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-full flex items-center justify-center mx-auto">
                    <TestTube className="w-10 h-10 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-800">
                      Ready for Testing
                    </h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      Configure your test cases above and click Run Bulk Test to
                      analyze your age classifier&apos;s performance
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
