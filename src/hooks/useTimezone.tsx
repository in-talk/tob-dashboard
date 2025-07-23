// utils/timezone-cookies.ts

/**
 * Set timezone in cookie
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @param days - Cookie expiration in days (default: 365)
 */
export function setTimezoneCookie(timezone: string, days: number = 365): void {
  if (typeof window === 'undefined') return;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  
  document.cookie = `timezone=${timezone}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Get timezone from cookie
 * @returns timezone string or null if not set
 */
export function getTimezoneCookie(): string | null {
  if (typeof window === 'undefined') return null;
  
  const timezone = document.cookie
    .split('; ')
    .find(row => row.startsWith('timezone='))
    ?.split('=')[1];
    
  return timezone || null;
}

/**
 * Auto-detect and set user's timezone
 */
export function autoSetTimezone(): void {
  if (typeof window === 'undefined') return;
  
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  setTimezoneCookie(userTimezone);
}

/**
 * Initialize timezone on app load
 * This should be called in your _app.tsx or layout component
 */
export function initializeTimezone(): void {
  if (typeof window === 'undefined') return;
  
  const existingTimezone = getTimezoneCookie();
  
  if (!existingTimezone) {
    autoSetTimezone();
  }
}

// Hook for React components
import { useState, useEffect } from 'react';

export function useTimezone() {
  const [timezone, setTimezone] = useState<string>('UTC');
  
  useEffect(() => {
    const cookieTimezone = getTimezoneCookie();
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const finalTimezone = cookieTimezone || detectedTimezone;
    setTimezone(finalTimezone);
    
    // Set cookie if not already set
    if (!cookieTimezone) {
      setTimezoneCookie(finalTimezone);
    }
  }, []);
  
  const updateTimezone = (newTimezone: string) => {
    setTimezone(newTimezone);
    setTimezoneCookie(newTimezone);
  };
  
  return { timezone, updateTimezone };
}
