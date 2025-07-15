import { AgentDispositionData } from "@/types/agentDispositionData";
type DispositionData = {
  count: string;
  percentage: string;
};

export type AgentReportRow = {
  agentName: string;
  totalCalls: number;
  xfer: DispositionData;
  dnc: DispositionData;
  fas: DispositionData;
  callbk: DispositionData;
  a: DispositionData;
  hp: DispositionData;
  dc: DispositionData;
  dair: DispositionData;
  ri: DispositionData;
  lb: DispositionData;
  np: DispositionData;
  na: DispositionData;
  dnq: DispositionData;
  other: DispositionData;
};

export function transformAgentData(
  rawData: AgentDispositionData[]
): AgentReportRow[] | null {
  const transformedData = rawData.map((data) => {
    return {
      agentName: data.agent_name,
      totalCalls: parseInt(data.total_calls, 10),
      xfer: {
        count: data.xfer_count,
        percentage: data.xfer_percentage,
      },
      dnc: { count: data.dnc_count, percentage: data.dnc_percentage },
      callbk: { count: data.callbk_count, percentage: data.callbk_percentage },
      fas: { count: data.fas_count, percentage: data.fas_percentage },
      hp: { count: data.hp_count, percentage: data.hp_percentage },
      a: { count: data.a_count, percentage: data.a_percentage },
      dc: { count: data.dc_count, percentage: data.dc_percentage },
      dair: { count: data.dair_count, percentage: data.dair_percentage },
      ri: { count: data.ri_count, percentage: data.ri_percentage },
      lb: { count: data.lb_count, percentage: data.lb_percentage },
      np: { count: data.np_count, percentage: data.np_percentage },
      na: { count: data.na_count, percentage: data.na_percentage },
      dnq: { count: data.dnq_count, percentage: data.dnq_percentage },
      other: { count: data.other_count, percentage: data.other_percentage },
    };
  });
  return transformedData;
}
