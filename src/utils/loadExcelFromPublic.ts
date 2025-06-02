/* eslint-disable @typescript-eslint/no-explicit-any */
import { CallRecord } from '@/types/callRecord';
import * as XLSX from 'xlsx';

const excelDateToCustomFormat = (serial: number): string => {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);

  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  const total_seconds = Math.floor(86400 * fractional_day);
  const seconds = total_seconds % 60;
  const minutes = Math.floor(total_seconds / 60) % 60;
  const hours = Math.floor(total_seconds / 3600);

  date_info.setHours(hours);
  date_info.setMinutes(minutes);
  date_info.setSeconds(seconds);

  const month = date_info.getMonth() + 1;
  const day = date_info.getDate();
  const hour = date_info.getHours().toString().padStart(2, '0');
  const minute = date_info.getMinutes().toString().padStart(2, '0');

  return `${month}/${day} ${hour}:${minute}`;
};

export const loadExcelFromPublic = async (): Promise<CallRecord[]> => {
  const res = await fetch('/Book1.xlsx');
  const arrayBuffer = await res.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

  const parsedData = jsonData.map((row) => {
    const updatedRow: Record<string, any> = { ...row };

    for (const key in updatedRow) {
      const value = updatedRow[key];
      if (typeof value === 'number' && value > 10000 && value < 60000) {
        updatedRow[key] = excelDateToCustomFormat(value);
      }
    }

    return updatedRow as CallRecord;
  });

  return parsedData;
};