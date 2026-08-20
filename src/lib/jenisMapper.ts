export const JENIS_PEMERIKSAAN_CATEGORIES = [
  'Kinerja/PDTT',
  'LKPP',
  'LKBUN',
  'LKBA015'
] as const;

export type JenisPemeriksaanCategory = typeof JENIS_PEMERIKSAAN_CATEGORIES[number];

export function normalizeJenisPemeriksaan(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

export function mapJenisPemeriksaan(value: unknown): JenisPemeriksaanCategory | 'unknown' {
  if (value === null || value === undefined || String(value).trim() === '') {
    return 'unknown';
  }
  
  const normalized = normalizeJenisPemeriksaan(value);
  
  if (normalized.includes('KINERJA') || normalized.includes('PDTT')) return 'Kinerja/PDTT';
  if (normalized === 'LKPP') return 'LKPP';
  if (normalized === 'LKBUN') return 'LKBUN';
  if (normalized === 'LKBA015' || normalized === 'LKBA 015') return 'LKBA015';
  
  return 'unknown';
}
