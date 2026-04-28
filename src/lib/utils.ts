import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date relative to now
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return target.toLocaleDateString();
}

/**
 * Format a date for display in the visitor's local timezone & locale.
 * Server stores timestamps in UTC; the browser renders them in local time.
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const target = new Date(date);
  return target.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  });
}

/**
 * Format a date with time in the visitor's local timezone & locale.
 */
export function formatDateTime(date: Date | string): string {
  const target = new Date(date);
  return target.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Verbose local timestamp suitable for tooltips.
 * Always shows local date, time, and timezone abbreviation so users
 * can see the exact local time regardless of where they are in the world.
 */
export function formatLocalTimestamp(date: Date | string): string {
  const target = new Date(date);
  return target.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Get days until a date
 */
export function getDaysUntil(date: Date | string): number {
  const now = new Date();
  const target = new Date(date);
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format property type for display
 */
export function formatPropertyType(type: string): string {
  const types: Record<string, string> = {
    APARTMENT: 'Apartment',
    SINGLE_HOME: 'Single Home',
    TOWNHOME: 'Townhome',
    CONDO: 'Condo',
  };
  return types[type] || type;
}

/**
 * Format event type for display
 */
export function formatEventType(type: string): string {
  const types: Record<string, string> = {
    COMMUNITY_EVENT: 'Community Event',
    CULTURAL_FESTIVAL: 'Cultural Festival',
    MEETUP: 'Meetup',
    WORKSHOP: 'Workshop',
    PERSONAL_AD: 'Personal Ad',
    SERVICE: 'Service',
    OTHER: 'Other',
  };
  return types[type] || type;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

