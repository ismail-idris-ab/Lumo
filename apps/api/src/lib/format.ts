export function formatKobo(kobo: number): string {
  return `₦${(kobo / 100).toLocaleString('en-NG')}`;
}
