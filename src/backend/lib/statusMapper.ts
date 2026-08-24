export const STATUS_CATEGORIES = [
  'Sesuai Usul',
  'Sesuai TPTD',
  'Usul TPTD',
  'Dalam Proses',
  'Belum TL',
] as const;

export type StatusCategory = typeof STATUS_CATEGORIES[number];

export function normalizeStatus(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\\-]/g, ' ')
    .replace(/\s+/g, " ");
}

export function mapStatusCategory(value: unknown): StatusCategory | 'unknown' {
  const normalized = normalizeStatus(value);

  if (normalized === 'sesuai usul') return 'Sesuai Usul';
  if (normalized === 'sesuai tptd') return 'Sesuai TPTD';
  if (normalized === 'usul tptd') return 'Usul TPTD';
  if (normalized === 'dalam proses' || normalized === 'proses' || normalized === 'open' || normalized === 'draft') return 'Dalam Proses';
  if (normalized === 'belum tl' || normalized === 'belum' || normalized === 'overdue' || normalized === 'belum ditindaklanjuti') return 'Belum TL';

  return 'unknown';
}
