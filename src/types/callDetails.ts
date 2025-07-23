export interface CallDetails {
  interaction_id: string;
  call_id: string;
  transcription: string;
  detected_label: string;
  response_audio_path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any; 
  interaction_timestamp: string;
  created_at: string;
  turn: number;
  response_file_label: string;
  agent: string;
}