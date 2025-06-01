// contexts/CallDataContext.tsx
import { CallRecord } from '@/types/callRecord';
import { loadExcelFromPublic } from '@/utils/loadExcelFromPublic';
import React, { createContext, useContext, useEffect, useState } from 'react';


interface CallDataContextProps {
  callData: CallRecord[] | null;
  loading: boolean;
}

const CallDataContext = createContext<CallDataContextProps | undefined>(undefined);

export const CallDataProvider = ({ children }: { children: React.ReactNode }) => {
  const [callData, setCallData] = useState<CallRecord[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const data = await loadExcelFromPublic();
      setCallData(data);
      setLoading(false);
    };

    fetch();
  }, []);

  console.log('context called ')

  return (
    <CallDataContext.Provider value={{ callData, loading }}>
      {children}
    </CallDataContext.Provider>
  );
};

export const useCallData = () => {
  const context = useContext(CallDataContext);
  if (!context) {
    throw new Error('useCallData must be used within a CallDataProvider');
  }
  return context;
};