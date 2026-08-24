# Tasks: Revisi Final Logika Dashboard (Status & Jenis Pemeriksaan)

- `[x]` Backend: Refactor `MySQLAdapter.ts` untuk menambahkan helper `groupStatus`, mengembalikan `statusSummary`, dan mengelompokkan `jenisData` ke 2 tumpukan (Tuntas & Dalam Proses). Hapus validasi pieTotal == distinctFindings.
- `[x]` Frontend: Refactor `src/app/page.tsx` untuk menggunakan `statusSummary` pada KPI dan persentase Donut, serta menyesuaikan komponen BarChart Jenis Pemeriksaan agar hanya merender 2 `<Bar />` (Tuntas & Dalam Proses).
- `[x]` Frontend: Sesuaikan `src/app/tlhp/page.tsx` untuk membaca `statusSummary` dari Analytics API.
- `[x]` Frontend: Sesuaikan `src/app/rekomendasi/page.tsx` untuk membaca `statusSummary` dari Analytics API.
- `[ ]` Verifikasi (tsc --noEmit & build test).
