export interface dispositionGraphData {
  time_slot: string;

  time_label: string;
  interval_breakdown: string;
  interval_position: number;
  interval_total: number; // Keep this - useful for tooltip context
  cumulative_total: number; // Keep this - useful for tooltip context
  // Remove all cumulative_*_count fields - not needed for percentage charts
  xfer_pct: string;
  dnc_pct: string;
  dc_pct: string;
  dair_pct: string;
  ri_pct: string;
  callbk_pct: string;
  a_pct: string;
  lb_pct: string;
  np_pct: string;
  fas_pct: string;
  dnq_pct: string;
  hp_pct: string;
  na_pct: string;
}
