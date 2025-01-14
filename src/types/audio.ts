export interface ProcessingStatus {
    message: string;
    type: 'idle' | 'processing' | 'success' | 'error';
  }
  
  export interface AudioFile {
    file: File;
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    error?: string;
  }
  
  export interface ApiResponse {
    success?: boolean;
    error?: string;
    downloadUrl?: string;
  }
  
  export interface ProcessingOptions {
    sampleRate: number;
    channels: number;
    bitDepth: number;
  }