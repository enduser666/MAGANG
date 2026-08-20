# Rencana Implementasi: Pemetaan Endpoint per Modul

Sesuai instruksi Anda, saya telah melakukan pemetaan (endpoint mapping) yang cermat. Saya memastikan bahwa **Analytics API** hanya dipakai ketika halaman benar-benar membutuhkan angka agregasi (KPI/Chart), dan **Generic Tables API** akan digunakan untuk memuat daftar data (listing/tabel mentah).

Berikut adalah strategi pemilihan endpoint per halaman sebelum kita memulai eksekusi pada Modul 1:

---

### 1. Monitoring TLHP (`src/app/tlhp/page.tsx`)
- **Endpoint yang Digunakan:**
  1. `GET /api/dashboard/analytics`
  2. `GET /api/tables/temuan` (atau `lhp`)
- **Alasan Pemilihan:** Halaman ini memiliki dua bagian utama. Bagian atas adalah Scorecard KPI & Chart (membutuhkan agregasi), sedangkan bagian bawah adalah tabel daftar dokumen (membutuhkan listing mentah). 
- **Memakai Generic Tables API?** Ya (untuk memuat isi tabel dengan fitur paginasi).
- **Memakai Analytics API?** Ya (untuk memuat Scorecard Selesai/Proses dan Chart Tren).
- **Membutuhkan Endpoint Baru?** Tidak. Kombinasi 2 endpoint _existing_ ini sudah sempurna.

### 2. Monitoring Rekomendasi (`src/app/rekomendasi/page.tsx`)
- **Endpoint yang Digunakan:** 
  1. `GET /api/dashboard/analytics`
  2. `GET /api/tables/rekomendasi`
- **Alasan Pemilihan:** Sama seperti TLHP. Halaman memiliki area _Summary KPI_ dan sebuah DataTable rincian rekomendasi di bawahnya.
- **Memakai Generic Tables API?** Ya (untuk daftar mentah rekomendasi).
- **Memakai Analytics API?** Ya (untuk Scorecard Selesai/Terlambat).
- **Membutuhkan Endpoint Baru?** Tidak.

### 4. Data Pemantauan (`src/app/data-pemantauan/page.tsx` dsb.)
- **Endpoint yang Digunakan:** `GET /api/tables/[tableName]`
- **Alasan Pemilihan:** Halaman ini murni berisi *DataTable* untuk menampilkan dan mengelola *raw data* dari Dataset Aktif. Tidak ada chart agregasi.
- **Memakai Generic Tables API?** Ya (100%).
- **Memakai Analytics API?** Tidak.
- **Membutuhkan Endpoint Baru?** Tidak. (Sudah berfungsi dinamis di sesi sebelumnya).

### 5. Unit Kerja (`src/app/unit-kerja/page.tsx`)
- **Endpoint yang Digunakan:** `GET /api/dashboard/analytics?unit_id=[Unit_ID]`
- **Alasan Pemilihan:** Halaman ini murni berisi visualisasi agregasi *Dashboard Profil* khusus untuk sebuah Unit Kerja. Tidak ada *raw data listing*.
- **Memakai Generic Tables API?** Tidak.
- **Memakai Analytics API?** Ya (difilter per unit).
- **Membutuhkan Endpoint Baru?** Tidak.

### 6. Risiko (`src/app/risiko/page.tsx`)
- **Endpoint yang Digunakan:** `GET /api/tables/risiko` (Jika menggunakan tabel _legacy_)
- **Alasan Pemilihan:** Halaman memiliki tabel _Risk Register_. Namun untuk visualisasi _Heatmap_, backend saat ini belum memiliki fungsi agregasi _Impact × Likelihood_.
- **Memakai Generic Tables API?** Ya (untuk tabel).
- **Memakai Analytics API?** Tidak (karena tidak mendukung agregasi matriks risiko).
- **Membutuhkan Endpoint Baru?** **Ya.** Butuh `/api/dashboard/risiko` untuk agregasi Heatmap jika tidak ingin dihitung paksa di Frontend.

### 7. IKU (`src/app/iku/page.tsx`)
- **Endpoint yang Digunakan:** `GET /api/tables/iku` (Bila ada)
- **Alasan Pemilihan:** Untuk melist data realisasi vs target.
- **Memakai Generic Tables API?** Ya.
- **Memakai Analytics API?** Tidak.
- **Membutuhkan Endpoint Baru?** **Ya.** Jika Dataset Aktif adalah tabel Excel Temuan Audit, tabel tersebut tidak menyimpan definisi/data IKU organisasi. Perlu dipastikan dari mana sumber data aslinya.

### 8. Early Warning System (`src/app/ews/page.tsx`)
- **Endpoint yang Digunakan:** Belum Tersedia.
- **Alasan Pemilihan:** EWS membutuhkan logika filter dinamis (menghitung sisa hari, *overdue* system alerts). API Generik hanya me-*return* data, bukan notifikasi anomali.
- **Memakai Generic Tables API?** Bisa, namun tidak optimal untuk notifikasi realtime.
- **Memakai Analytics API?** Tidak.
- **Membutuhkan Endpoint Baru?** **Ya.** Butuh endpoint/sistem kalkulasi `/api/dashboard/ews`.

### 9. API POST Legacy
- **Fokus Backend:** Refactor *RBAC Check* agar siap menerima `POST` ke *Generic Tables API* berdasarkan Dataset Aktif, memastikan UI bisa sukses melakukan CRUD.

---

## User Review Required

> [!IMPORTANT]
> Sesuai persetujuan arsitektur, **Modul 1 (TLHP)** dan **Modul 2 (Rekomendasi)** siap dijalankan dengan memadukan **Analytics API (untuk KPI/Chart)** dan **Generic Tables API (untuk Tabel)**. Saya sama sekali TIDAK akan mengubah UI dan komponen yang ada, melainkan hanya mengganti aliran `useState` _dummy_ dengan `fetch()` ke endpoint _existing_ tersebut.
> 
> Silakan berikan lampu hijau (**Proceed**) dan saya akan langsung mulai merefactor `src/app/tlhp/page.tsx`!
