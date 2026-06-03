// Money is stored as integer kobo (₦ × 100). Never use floats for math; display only.
export function formatNaira(kobo: number): string {
  return `₦${Math.round(kobo / 100).toLocaleString('en-NG')}`;
}

export function locationLabel(state: string, city: string, area?: string | null): string {
  return [area, city, state].filter(Boolean).join(', ');
}
