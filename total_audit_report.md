# Total Audit Report: Integrasi Dynamic Dataset

Laporan ini merupakan hasil audit komprehensif pada seluruh codebase SIDATA untuk mendeteksi *endpoint*, *repository*, *adapter*, *service*, maupun *frontend component* yang masih menggunakan tabel legacy (`lhp`, `temuan`, dsb.) ataupun *mock data*.

## ✅ Sudah Dynamic Dataset (Berhasil Diintersepsi)

Modul-modul ini sudah mematuhi arsitektur intersepsi. Mereka membaca Dataset Aktif secara transparan jika dataset berstatus `ACTIVE` dan bermode `DYNAMIC_FLAT_TABLE`.

### 1. `src/app/api/tables/[tableName]/route.ts` (GET)
- **Line:** 18 - 98
- **Query:** `findRecords(targetTable, { _customWhere })`
- **Membaca:** Dataset Aktif (targetTable di-*override*).
- **Column Mapping:** Ya, menggunakan mapping unit untuk logic RBAC.
- **Perlu Diubah:** Tidak.
- **Alasan Teknis:** Intersepsi *inline* sudah berjalan. Jika UI mem-fetch tabel `lhp`, backend otomatis menerjemahkan query ke Flat Dataset Aktif.

### 2. `src/app/api/tables/[tableName]/[id]/route.ts` (PUT, DELETE)
- **Line:** 30 - 85, 150 - 192
- **Query:** `updateRecord` / `deleteRecord` / `findRecordById` pada `targetTable`
- **Membaca:** Dataset Aktif.
- **Column Mapping:** Ya, untuk pengecekan hak akses (`oldRecord[unitColumn] === user.unitKode`).
- **Perlu Diubah:** Tidak.
- **Alasan Teknis:** Logika penguncian baris (pessimistic lock) dan modifikasi sudah diarahkan ke Dataset Aktif.

### 3. `src/app/api/dashboard/analytics/route.ts` (GET)
- **Line:** 46 - 77
- **Query:** Agregasi Dashboard KPIs (Distinct Finding, Pie Total, dll.)
- **Membaca:** Dataset Aktif.
- **Column Mapping:** Ya, membaca `column_mapping` penuh melalui `AnalyticsService`.
- **Perlu Diubah:** Tidak.
- **Alasan Teknis:** Telah menerapkan *Dynamic Flat Table* dengan *Logging Sementara* standar.

### 4. `src/app/api/dashboard/temuan-jenis/route.ts` (GET)
- **Line:** 71 - 90
- **Query:** `SELECT final_type as jenis_pemeriksaan, COUNT(*) AS jumlah_temuan...`
- **Membaca:** Dataset Aktif.
- **Column Mapping:** Ya, menggunakan referensi `finding_type` dan `finding`.
- **Perlu Diubah:** Tidak.
- **Alasan Teknis:** Menggunakan fungsi agregasi MAX() dinamis pada dataset aktif.

---

## ⚠️ Masih Legacy (Masih Membaca Tabel Lama di Backend)

Terdapat logika spesifik di dalam *route API* backend yang belum dilakukan intersepsi dan masih bergantung kuat pada skema relasional lama.

### 1. `src/app/api/tables/[tableName]/route.ts` (POST)
- **Line:** 199 - 214
- **Query:** `recordService.findRecordById('lhp', ...)`
- **Membaca:** Tabel Legacy.
- **Column Mapping:** Tidak.
- **Perlu Diubah:** Ya.
- **Alasan Teknis:** Meskipun fungsi `GET`, `PUT`, dan `DELETE` sudah dialihkan ke Flat Table, fungsi **Pembuatan Record (POST)** masih memiliki validasi *hardcode* (`id_lhp` dan `id_temuan`). Jika frontend mencoba menyimpan record baru, RBAC check akan gagal karena mencari di tabel legacy.

---

## ❌ Masih Hardcode (Frontend Mock / Dummy Data)

Mayoritas halaman antarmuka (Frontend) untuk modul selain *Data Pemantauan* dan *Dashboard* rupanya saat ini **berjalan tanpa koneksi ke Backend**. Halaman-halaman ini murni menggunakan *Static State* atau *Dummy Constant*. 

### 1. `src/app/tlhp/page.tsx`
- **Line:** 37
- **Constant/Mock:** `INITIAL_TLHP_DATA`
- **Membaca:** Hardcode Array.
- **Column Mapping:** Tidak.
- **Perlu Diubah:** Ya (Jika ingin datanya hidup).
- **Alasan Teknis:** Komponen menggunakan `useState(INITIAL_TLHP_DATA)`. Tidak pernah melakukan HTTP request ke `/api/tables/tlhp`.

### 2. `src/app/rekomendasi/page.tsx`
- **Line:** 38
- **Constant/Mock:** `INITIAL_RECOMMENDATIONS`
- **Membaca:** Hardcode Array.
- **Column Mapping:** Tidak.
- **Perlu Diubah:** Ya.
- **Alasan Teknis:** Statis. Tidak mengambil data dari Backend (`/api/tables/rekomendasi`).

### 3. `src/app/unit-kerja/page.tsx`
- **Line:** 36 - 150
- **Constant/Mock:** `metrics.tlhp`, `multipliers`
- **Membaca:** Hardcode kalkulasi matematis (Math.round statis).
- **Column Mapping:** Tidak.
- **Perlu Diubah:** Ya.
- **Alasan Teknis:** Visualisasi trend temuan, TLHP, dan risiko dikerjakan secara manual di frontend. Seharusnya memanggil Analytics API.

### 4. `src/app/risiko/page.tsx`
- **Line:** 28
- **Constant/Mock:** `INITIAL_RISKS`
- **Membaca:** Hardcode.
- **Column Mapping:** Tidak.
- **Perlu Diubah:** Ya.
- **Alasan Teknis:** Statis, belum terkoneksi ke backend.

### 5. `src/app/iku/page.tsx`
- **Line:** 29
- **Constant/Mock:** `INITIAL_IKU_DATA`
- **Membaca:** Hardcode.
- **Column Mapping:** Tidak.
- **Perlu Diubah:** Ya.
- **Alasan Teknis:** Data Indikator Kinerja Utama (IKU) tidak berasal dari DB.

### 6. `src/app/ews/page.tsx`
- **Line:** 32
- **Constant/Mock:** `INITIAL_ALERTS`
- **Membaca:** Hardcode.
- **Column Mapping:** Tidak.
- **Perlu Diubah:** Ya.
- **Alasan Teknis:** Data notifikasi dan *Early Warning System* tidak membaca anomali data di Dataset.

### 7. `src/app/regulasi/page.tsx`
- **Line:** 19
- **Constant/Mock:** `INITIAL_DOCUMENTS`
- **Membaca:** Hardcode.
- **Column Mapping:** Tidak.
- **Perlu Diubah:** Tergantung *Business Requirement*.
- **Alasan Teknis:** Modul regulasi mungkin tidak perlu disatukan ke Dataset Temuan Aktif karena merupakan master dokumen terpisah, tetapi datanya saat ini masih mock.

### 8. `src/app/audit/page.tsx`
- **Line:** 23
- **Constant/Mock:** `INITIAL_CHANGES`
- **Membaca:** Sebagian Mock.
- **Column Mapping:** Tidak.
- **Perlu Diubah:** Tidak mendesak.
- **Alasan Teknis:** Audit trail membaca dari endpoint `/api/history`. Modul ini memang bukan bagian dari "Dataset Temuan", melainkan sistem log mandiri, namun ia menggunakan *fallback* ke `INITIAL_CHANGES` jika terjadi kegagalan muat.

---
*(Semua temuan di atas diperoleh dari pencarian kode secara statis pada codebase. Tidak ada asumsi. Semua line sumber terverifikasi).*
