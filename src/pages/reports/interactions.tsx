import { useState, useMemo, useEffect } from "react";
import Head from "next/head";
import { format } from "date-fns";
import { Download, Search, FileText } from "lucide-react";
import NewDateFilter from "@/components/NewDateFilter";
import { useTimezone } from "@/hooks/useTimezone";
import { getUTCDateRange } from "@/utils/timezone";
import { InputText } from "primereact/inputtext";
import { withAuth } from "@/utils/auth";
import ClientSelector from "@/components/ui/clientSelector";
import { useClients } from "@/hooks/useClients";
import { useSession } from "next-auth/react";

export default function InteractionsReport() {
    const { timezone } = useTimezone();
    const { data: session } = useSession();

    // Filters
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [callId, setCallId] = useState("");
    const [callerId, setCallerId] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isDownloading, setIsDownloading] = useState(false);

    // Date range state
    const [dateRange, setDateRange] = useState(() => {
        const now = new Date();
        const from = new Date(now);
        from.setDate(from.getDate() - 7); // Default to last 7 days
        from.setHours(0, 0, 0, 0);
        return {
            from,
            to: now,
        };
    });

    // Fetch clients using user ID from session
    const { clients, isLoading: isClientsLoading } = useClients(session?.user?.id);

    // Auto-select first client if none selected
    useEffect(() => {
        if (!selectedClientId && clients.length > 0) {
            setSelectedClientId(clients[0].client_id);
        }
    }, [clients, selectedClientId]);

    // Calculate UTC date range for API
    const utcDateRange = useMemo(
        () => getUTCDateRange(dateRange.from, dateRange.to, timezone),
        [dateRange.from, dateRange.to, timezone]
    );

    const handleDownload = async () => {
        if (!selectedClientId) {
            alert("Please select a client first.");
            return;
        }

        setIsDownloading(true);
        try {
            const response = await fetch("/api/downloadReport", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    client_id: selectedClientId,
                    from_date: utcDateRange.from,
                    to_date: utcDateRange.to,
                    call_id: callId || null,
                    caller_id: callerId || null,
                    search_term: searchTerm || null,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to download report");
            }

            // Handle file download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Interactions_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error("Download failed:", error);
            alert("Failed to download report. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <>
            <Head>
                <title>Interactions Report - InTalk Dashboard</title>
            </Head>

            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="h-8 w-8 text-blue-600" />
                        Interactions Report
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Generate and download detailed reports of interactions based on specific criteria.
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 bg-white dark:bg-sidebar border border-gray-200 dark:border-gray-700 p-6 rounded-xl shadow-sm">

                    {/* Client Selection */}
                    {clients.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <ClientSelector
                                clients={clients}
                                selectedClientId={selectedClientId}
                                onClientChange={setSelectedClientId}
                                label="Client"
                                placeholder="Select a Client"
                                disabled={isClientsLoading || isDownloading}
                            />
                        </div>
                    )}

                    {/* Date Range */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date Range</label>
                        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-1 bg-white dark:bg-gray-800">
                            <NewDateFilter
                                onDateChange={setDateRange}
                                initialRange={dateRange}
                                autoRefresh={false}
                            />
                        </div>
                    </div>

                    {/* Search Term */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Global Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <InputText
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search keywords..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Caller ID */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Caller ID</label>
                        <InputText
                            value={callerId}
                            onChange={(e) => setCallerId(e.target.value)}
                            placeholder="Filter by Caller ID"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Call ID */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Call ID</label>
                        <InputText
                            value={callId}
                            onChange={(e) => setCallId(e.target.value)}
                            placeholder="Filter by Call ID"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                </div>

                <div className="flex justify-start">
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading || !selectedClientId}
                        className={`
                    flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white shadow-md transition-all duration-300
                    ${isDownloading || !selectedClientId
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:-translate-y-0.5"
                            }
                `}
                    >
                        {isDownloading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                Generating Report...
                            </>
                        ) : (
                            <>
                                <Download className="w-5 h-5" />
                                Download Report (Excel)
                            </>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}

// Ensure authentication
export const getServerSideProps = withAuth(async () => {
    return { props: {} };
}, ["admin", "user"]);
