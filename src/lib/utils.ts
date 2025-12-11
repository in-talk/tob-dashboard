import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export enum Campaign {
  CGM = 10000,
  ACA = 20000,
  SOLAR = 30000,
  FE = 40000,
  FETEST = 40001,
  MVA = 50000,
  MC = 60000,
}

export function getCampaignLabel(campaignName: string): string {
  // Normalize input (handle case sensitivity)
  const normalizedName = campaignName.toUpperCase().trim();

  // Check if campaign exists
  if (!(normalizedName in Campaign)) {
    throw new Error(`Invalid campaign: "${campaignName}"`);
  }

  const campaignCode = Campaign[normalizedName as keyof typeof Campaign];
  return `labels_${campaignCode}`;
}
