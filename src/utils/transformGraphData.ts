import { dispositionGraphData } from "@/types/dispositionGraphData";
import {utcToCurrentTimezone } from "./timezone";
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
};

export function transformGraphData(
  data: dispositionGraphData[]
): DispositionGraph[] | null {
  const transformedData = data.map((entry) => {
    const utcToCurrent = utcToCurrentTimezone(entry.time_slot);
    const formattedDate = format(utcToCurrent, "M/d HH:mm");
    const baseDate = formattedDate.split(" ")[0];
    const [intervalHour, intervalMinute] = entry.interval_breakdown.split(":");
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

    const fullTimeLabel = `${baseDate} ${localTimeString}`;

    return {
      timeSlot: entry.time_slot,
      timeLabel: formattedDate,
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