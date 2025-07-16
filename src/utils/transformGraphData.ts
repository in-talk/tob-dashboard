import { dispositionGraphData } from "@/types/dispositionGraphData";
import { parseISO, format } from "date-fns";

export type DispositionGraph = {
  timeSlot: string;
  timeLabel: string;
  breakdown: string;
  fullTimeLabel: string; 
  sortableTime: Date;
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
    const baseTime = parseISO(entry.time_slot);
    const [hours, minutes] = entry.interval_breakdown.split(":").map(Number);
    const fullTime = new Date(baseTime);
    fullTime.setHours(hours);
    fullTime.setMinutes(minutes);

    const fullTimeLabel = format(fullTime, "MM/dd HH:mm");

    return {
      timeSlot: entry.time_slot,
      timeLabel: entry.time_label,
      breakdown: entry.interval_breakdown,
      fullTimeLabel,
      sortableTime: fullTime,
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

  return transformedData.sort((a, b) => a.sortableTime.getTime() - b.sortableTime.getTime());
}