import { dispositionGraphData } from "@/types/dispositionGraphData";
import { utcToCurrentTimezone } from "./timezone";
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
  return data.map((entry) => {
    const utcToCurrent = utcToCurrentTimezone(entry.time_slot);
    const formattedDate = format(utcToCurrent, "M/d HH:mm");
    const baseDate = formattedDate.split(" ")[0];

    const [intervalHour, intervalMinute] = entry.interval_breakdown.split(":");
    // const intervalTime = new Date(entry.interval_breakdown);
    // const intervalHour = intervalTime.getUTCHours().toString().padStart(2, "0");
    // const intervalMinute = intervalTime
    //   .getUTCMinutes()
    //   .toString()
    //   .padStart(2, "0");
    const utcIntervalTime = new Date(entry.time_slot);
    utcIntervalTime.setUTCHours(
      parseInt(intervalHour),
      parseInt(intervalMinute),
      0,
      0
    );
    const localIntervalTime = utcToCurrentTimezone(
      utcIntervalTime.toISOString()
    );
    const localTimeString = format(localIntervalTime, "HH:mm");
    // const intervalBreakdown = `${intervalHour}:${intervalMinute}`;

    // const localIntervalTime = utcToCurrentTimezone(entry.interval_breakdown);
    // const localTimeString = format(localIntervalTime, "HH:mm");
    const fullTimeLabel = `${baseDate} ${localTimeString}`;

    return {
      timeSlot: entry.time_slot,
      timeLabel: formattedDate,
      breakdown: entry.interval_breakdown,
      fullTimeLabel,
      intervalPosition: entry.interval_position,
      intervalTotal: entry.interval_total,
      // Only percentages - no cumulative counts needed
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
