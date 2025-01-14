// utils/audioProcessing.ts

import type { ProcessingStatus } from '../types/audio';

export const generateUniqueId = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getStatusClasses = (type: ProcessingStatus['type']): string => {
  switch (type) {
    case 'success':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'error':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'processing':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

export const validateAudioFile = (file: File): string | null => {
  const maxSize = 100 * 1024 * 1024; // 100MB
  const allowedTypes = ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3'];

  if (!allowedTypes.includes(file.type)) {
    return 'Invalid file type. Please upload WAV or MP3 files only.';
  }

  if (file.size > maxSize) {
    return 'File size too large. Maximum size is 100MB.';
  }

  return null;
};