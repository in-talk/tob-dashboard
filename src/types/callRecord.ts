export interface CallDuration {
  minutes: number
  seconds: number;
  milliseconds: number;
}

export interface CallRecord {
  call_id: string;
  caller_id: string;
  caller_count: number;
  call_start_time: string; // ISO date string
  call_end_time: string; // ISO date string
  call_duration: CallDuration;
  call_recording_path: string;
  call_status: 'completed' | 'missed' | 'failed' | string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any | null;
  created_at: string; // ISO date string
  call_unique_id: string;
  client_id: string;
  version: string | null;
  model: string | null;
  transcription: string;
  label: string;
  disposition: string;
  agent: string
  turn: number;
  total_records: string;
  current_page: number;
  page_size: number;
  total_pages: string;
  has_next_page: boolean;
  has_previous_page: boolean;
}

