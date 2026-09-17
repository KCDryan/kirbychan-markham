/** Canadian dollar, no cents. Returns null for missing figures so callers can skip. */
export function cad(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function longDate(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    // Content dates are calendar dates stored as UTC midnight, so format in UTC.
    timeZone: 'UTC',
  }).format(value);
}

export function isoDate(value: Date): string {
  return value.toISOString().split('T')[0]!;
}

/** ISO 8601 duration for VideoObject, for example 12 minutes becomes PT12M. */
export function isoDuration(minutes: number): string {
  return `PT${Math.round(minutes)}M`;
}

/** A value is unfilled when it is blank or still carries a TODO marker. */
export function isTodo(value: string | null | undefined): boolean {
  if (!value) return true;
  return value.trim().length === 0 || value.trim().toUpperCase().startsWith('TODO');
}

/** Neighbourhood pillar pages live at the site root, for example /unionville-markham/ */
export function neighbourhoodPath(slug: string): string {
  return `/${slug}-markham/`;
}
