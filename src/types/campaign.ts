export type Campaign = {
  campaign_id: number;
  campaign_name: string;
  campaign_description: string;
  isactive: boolean;
  campaign_code: number;
  greeting_label?: string | null;
  no_transcription_label?: string | null;
  extension?: string | null;
  created_at?: string;
  updated_at?: string;
};
