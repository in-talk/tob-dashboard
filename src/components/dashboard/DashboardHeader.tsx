// components/dashboard/DashboardHeader.tsx
import AutoRefresh from "@/components/ui/autoRefresh";
import ClientSelector from "@/components/ui/clientSelector";
import NewDateFilter from "@/components/NewDateFilter";

// components/dashboard/DashboardHeader.tsx
interface DashboardHeaderProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clients: any[];
  selectedClientId: string | null;
  onClientChange: (clientId: string | null) => void; // Changed from string to string | null
  dateRange: { from: Date; to: Date };
  onDateChange: (range: { from: Date; to: Date }) => void;
  autoRefresh: boolean;
  setAutoRefresh: (value: boolean) => void;
  refreshInterval: number;
  setRefreshInterval: (value: number) => void;
  setLastUpdated: (date: Date) => void;
  getTimeAgo: () => string;
  isLoading: boolean;
}

export default function DashboardHeader({
  clients,
  selectedClientId,
  onClientChange,
  dateRange,
  onDateChange,
  autoRefresh,
  setAutoRefresh,
  refreshInterval,
  setRefreshInterval,
  setLastUpdated,
  getTimeAgo,
  isLoading,
}: DashboardHeaderProps) {
  return (
    <div className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sticky top-0 z-10 bg-gray-100 dark:bg-sidebar p-3 rounded-sm">
      <AutoRefresh
        refreshInterval={refreshInterval}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        setRefreshInterval={setRefreshInterval}
        setLastUpdated={setLastUpdated}
        getTimeAgo={getTimeAgo}
        disabled={isLoading}
      />

      {clients.length > 1 && (
        <ClientSelector
          clients={clients}
          selectedClientId={selectedClientId}
          onClientChange={onClientChange}
          label="Select Client"
          placeholder="Choose a client..."
          disabled={isLoading}
        />
      )}

      <NewDateFilter
        onDateChange={onDateChange}
        autoRefresh={autoRefresh}
        initialRange={dateRange}
        disabled={isLoading}
      />
    </div>
  );
}