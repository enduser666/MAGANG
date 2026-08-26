# Panduan Docker untuk SIDATA

Proyek ini telah dilengkapi dengan dukungan Docker agar dapat dijalankan di lingkungan yang reproducible tanpa harus menginstall Node.js maupun MySQL secara manual.

## Prasyarat
- Docker terpasang di sistem Anda.
- Docker Compose terpasang di sistem Anda.

## Persiapan Environment
1. Buat file `.env` di direktori root aplikasi:
   ```bash
   cp .env.docker.example .env
   ```
2. Pastikan file `.env` Anda berisi konfigurasi yang tepat. Jika menggunakan Docker Compose bawaan, biarkan nilai `DB_HOST=mysql` (karena akan otomatis dioverride atau dibaca dari network Docker).

## Persiapan Database
Database dalam proyek ini tidak berisi data dummy dan bergantung pada database asli (dump).
Agar aplikasi dapat berjalan dengan lancar saat menggunakan container MySQL:
1. Ekspor/dump database MySQL `data_migration` dari environment existing Anda (misalnya menggunakan phpMyAdmin, mysqldump, atau DBeaver).
2. Simpan file `.sql` tersebut ke dalam folder `database/init/` di proyek ini (contoh: `database/init/dump.sql`).
3. Saat pertama kali container `mysql` berjalan, Docker akan secara otomatis mengeksekusi semua file `.sql` yang ada di dalam `database/init/`.

> **Catatan:** Jangan *commit* file dump database yang berisi data rahasia (credential/PII) ke repository Git.

## Menjalankan SIDATA dengan Docker

Untuk memulai aplikasi beserta database-nya, jalankan:
```bash
docker compose up --build
```

Untuk menjalankan di background (mode *detached*):
```bash
docker compose up -d --build
```

### Akses Aplikasi
Setelah proses build selesai dan container berjalan, aplikasi SIDATA dapat diakses melalui:
[http://localhost:3000](http://localhost:3000)

## Command Berguna Lainnya

**Melihat log:**
```bash
docker compose logs -f
```

**Menghentikan semua layanan:**
```bash
docker compose down
```

**Menghapus layanan beserta volume database (HATI-HATI):**
```bash
docker compose down -v
```
*(Gunakan command ini hanya jika Anda ingin mereset seluruh isi database MySQL dari awal).*

## Menjalankan Tanpa MySQL Docker
Jika Anda sudah memiliki MySQL yang berjalan di komputer lokal (Host) dan hanya ingin menjalankan aplikasi Next.js via Docker:
1. Pastikan Anda mengubah `DB_HOST` di `.env` menjadi IP host lokal Anda (misal `host.docker.internal` di Windows/Mac).
2. Jalankan hanya service `app`:
   ```bash
   docker compose up --build app
   ```

## Troubleshooting Umum
- **MySQL Connection Refused di aplikasi**: Pastikan container MySQL berstatus "healthy" (`docker compose ps`). Jika belum, tunggu beberapa saat karena proses import `.sql` awal bisa memakan waktu.
- **Port In Use (3000/3306)**: Pastikan aplikasi lokal Anda (`npm run dev` atau MySQL Host lokal) sudah dimatikan sebelum menjalankan Docker agar tidak bentrok port.
- **Perubahan kode tidak terbaca**: Jalankan rebuild image jika ada modul Node baru: `docker compose up --build`.
