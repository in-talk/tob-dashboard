export interface AgentDispositionBreakdown {
    a: number;
    dc: number;
    hp: number;
    lb: number;
    na: number;
    np: number;
    ri: number;
    dnc: number;
    dnq: number;
    fas: number;
    dair: number;
    xfer: number;
    callbk: number;
    agent_name: string;
    total_calls: number;
}

export interface OverallDispositionBreakdown {
    a: number;
    dc: number;
    hp: number;
    lb: number;
    na: number;
    np: number;
    ri: number;
    dnc: number;
    dnq: number;
    fas: number;
    dair: number;
    xfer: number;
    callbk: number;
    total_calls: number;
}

export interface Last7DaysDisposition {
    date: string;
    agents: AgentDispositionBreakdown[];
    overall: OverallDispositionBreakdown;
}
