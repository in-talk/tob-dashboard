// contexts/CallDataContext.tsx
import { CallRecord } from "@/types/callRecord";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getSession } from "next-auth/react";

interface CallDataContextProps {
  callData: CallRecord[] | null;
  loading: boolean;
}

const CallDataContext = createContext<CallDataContextProps | undefined>(
  undefined
);

export const CallDataProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [callData, setCallData] = useState<CallRecord[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCallRecords = async () => {
      try {
        const session = await getSession();
        if (!session || !session.user || !("client_id" in session.user)) {
          console.error("client_id not found in session");
          setLoading(false);
          return;
        }

        const client_id = session.user.client_id;

        const response = await fetch("/api/fetchCallRecords", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ client_id: client_id }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch call records");
        }

        setCallData(result.callRecords || []);
      } catch (error) {
        console.error("Error loading call records:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCallRecords();
  }, []);

  return (
    <CallDataContext.Provider value={{ callData, loading }}>
      {children}
    </CallDataContext.Provider>
  );
};

export const useCallData = () => {
  const context = useContext(CallDataContext);
  if (!context) {
    throw new Error("useCallData must be used within a CallDataProvider");
  }
  return context;
};
