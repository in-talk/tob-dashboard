"use client";

import { Globe } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/Select";
import { useTimezone } from "@/context/TimezoneContext";

type ZoneOption = { value: string; label: string };

// US zones go first because that's the product default. "Everywhere else"
// is a small curated list — users with other needs can still get a working
// state via localStorage, we just don't flood the dropdown.
const US_ZONES: ZoneOption[] = [
  { value: "America/New_York", label: "US Eastern (New York)" },
  { value: "America/Chicago", label: "US Central (Chicago)" },
  { value: "America/Denver", label: "US Mountain (Denver)" },
  { value: "America/Phoenix", label: "US Arizona (Phoenix, no DST)" },
  { value: "America/Los_Angeles", label: "US Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "US Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "US Hawaii (Honolulu)" },
];

const OTHER_ZONES: ZoneOption[] = [
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Berlin", label: "Berlin / Paris / Madrid" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Karachi", label: "Karachi" },
  { value: "Asia/Kolkata", label: "Mumbai / Delhi" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Australia/Sydney", label: "Sydney" },
];

export default function TimezoneSelector() {
  const { timezone, setTimezone } = useTimezone();

  // If the stored timezone isn't one of the curated options (e.g. user set
  // it via DevTools), still show it so the Select trigger reflects reality.
  const allOptions = [...US_ZONES, ...OTHER_ZONES];
  const inList = allOptions.some((z) => z.value === timezone);

  return (
    <Select value={timezone} onValueChange={setTimezone}>
      <SelectTrigger
        className="h-9 w-auto min-w-[150px] gap-1 border-muted-foreground/20"
        aria-label="Select display timezone"
      >
        <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="max-h-[60vh]">
        {!inList && (
          <SelectGroup>
            <SelectLabel>Current</SelectLabel>
            <SelectItem value={timezone}>{timezone}</SelectItem>
          </SelectGroup>
        )}
        <SelectGroup>
          <SelectLabel>United States</SelectLabel>
          {US_ZONES.map((z) => (
            <SelectItem key={z.value} value={z.value}>
              {z.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>Other</SelectLabel>
          {OTHER_ZONES.map((z) => (
            <SelectItem key={z.value} value={z.value}>
              {z.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
