import { dispositionGraphData } from "@/types/dispositionGraphData";

export type DispositionGraph = {
  timeSlot: string;
  timeLabel: string;
  breakdown: string;
  fullTimeLabel: string; 
  xferPercentage: number;
  dncPercentage: number;
  hpPercentage: number;
  callbkPercentage: number;
  dcPercentage: number;
  dairPercentage: number;
  riPercentage: number;
  fasPercentage: number;
  aPercentage: number;
  lbPercentage: number;
  npPercentage: number;
  naPercentage: number;
  dnqPercentage: number;
};

export function transformGraphData(
  data: dispositionGraphData[]
): DispositionGraph[] | null {

  const transformedData = data.map((entry) => {
    const baseDate= entry.time_label.split(" ")[0]
    const interval = entry.interval_breakdown
    const fullTimeLabel = `${baseDate} ${interval}`;
   
    return {
      timeSlot: entry.time_slot,
      timeLabel: entry.time_label,
      breakdown: entry.interval_breakdown,
      fullTimeLabel,
      xferPercentage: parseFloat(entry.xfer_pct),
      dncPercentage: parseFloat(entry.dnc_pct),
      dcPercentage: parseFloat(entry.dc_pct),
      dairPercentage: parseFloat(entry.dair_pct),
      riPercentage: parseFloat(entry.ri_pct),
      callbkPercentage: parseFloat(entry.callbk_pct),
      aPercentage: parseFloat(entry.a_pct),
      lbPercentage: parseFloat(entry.lb_pct),
      npPercentage: parseFloat(entry.np_pct),
      naPercentage: parseFloat(entry.na_pct),
      fasPercentage: parseFloat(entry.fas_pct),
      dnqPercentage: parseFloat(entry.dnq_pct),
      hpPercentage: parseFloat(entry.hp_pct),
    };
  });

  return transformedData;
}