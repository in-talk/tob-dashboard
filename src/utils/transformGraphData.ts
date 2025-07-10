import { dispositionGraphData } from "@/types/dispositionGraphData";

export type DispositionGraph = {
  timeSlot: string; 
  timeLabel: string;
  xferPercentage: number;
  dncPercentage: number;
  niPercentage: number;
  cbPercentage: number;
  dcPercentage: number;
  dairPercentage: number;
  riPercentage: number;
  otherPercentage: number;
  totalCalls: number;
};

export function transformGraphData(rawData: dispositionGraphData[]): DispositionGraph[] | null {
  if (!rawData || rawData.length === 0) return null;

  const transformedData = rawData.map((data) => ({
    timeSlot: data.time_slot,
    timeLabel: data.time_label,
    xferPercentage: parseFloat(data.xfer_pct),
    dncPercentage: parseFloat(data.dnc_pct),
    niPercentage: parseFloat(data.ni_pct),
    cbPercentage: parseFloat(data.cb_pct),
    dcPercentage: parseFloat(data.dc_pct),
    dairPercentage: parseFloat(data.dair_pct),
    riPercentage: parseFloat(data.ri_pct),
    otherPercentage: parseFloat(data.other_pct),
    totalCalls: parseInt(data.total_calls, 10),
  }));

  return transformedData;
}