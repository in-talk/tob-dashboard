import { dispositionGraphData } from "@/types/dispositionGraphData";
import { utcToCurrentTimezone, getCurrentTimezone } from "./timezone";
import { format } from "date-fns";

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
  intervalPosition: number;
  intervalTotal: number;
};

export function transformGraphData(
  data: dispositionGraphData[]
): DispositionGraph[] | null {
  if (!data) return null;

  const timezone = getCurrentTimezone();

  return data.map((entry) => {
    // Use the pre-formatted labels from the database (which now handles timezone)
    // Fallback to JS formatting only if the labels are missing
    const timeLabel = entry.time_label || format(utcToCurrentTimezone(entry.time_slot, timezone), "M/d HH:mm");
    const fullTimeLabel = entry.time_label && entry.interval_breakdown
      ? `${entry.time_label.split(' ')[0]} ${entry.interval_breakdown}`
      : timeLabel;

    return {
      timeSlot: entry.time_slot,
      timeLabel,
      breakdown: entry.interval_breakdown,
      fullTimeLabel,
      intervalPosition: entry.interval_position,
      intervalTotal: entry.interval_total,
      xferPercentage: parseFloat(entry.xfer_pct || "0"),
      dncPercentage: parseFloat(entry.dnc_pct || "0"),
      dcPercentage: parseFloat(entry.dc_pct || "0"),
      dairPercentage: parseFloat(entry.dair_pct || "0"),
      riPercentage: parseFloat(entry.ri_pct || "0"),
      callbkPercentage: parseFloat(entry.callbk_pct || "0"),
      aPercentage: parseFloat(entry.a_pct || "0"),
      lbPercentage: parseFloat(entry.lb_pct || "0"),
      npPercentage: parseFloat(entry.np_pct || "0"),
      naPercentage: parseFloat(entry.na_pct || "0"),
      fasPercentage: parseFloat(entry.fas_pct || "0"),
      dnqPercentage: parseFloat(entry.dnq_pct || "0"),
      hpPercentage: parseFloat(entry.hp_pct || "0"),
    };
  });
}
