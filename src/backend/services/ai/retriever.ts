import { DbInterface } from '@/db';

// Copy of Kemenkeu Regulations Seed Data from regulasi/page.tsx
const REGULATIONS_DB = [
  {
    id: 'REG-01',
    nomor: 'PMK No. 123/PMK.09/2025',
    judul: 'Pedoman Umum Tindak Lanjut Hasil Pengawasan (TLHP) di Lingkungan Kementerian Keuangan',
    kategori: 'PMK',
    tanggal: '2025-01-10',
    status: 'Aktif',
    desc: 'Menetapkan pedoman dan tata cara pelaksanaan pemantauan serta penyelesaian rekomendasi tindak lanjut hasil audit internal Itjen.'
  },
  {
    id: 'REG-02',
    nomor: 'PMK No. 45/PMK.09/2024',
    judul: 'Penerapan Manajemen Risiko Terintegrasi di Lingkungan Kementerian Keuangan',
    kategori: 'PMK',
    tanggal: '2024-05-20',
    status: 'Aktif',
    desc: 'Kerangka kerja pengelolaan risiko strategis, operasional, finansial, kepatuhan, dan teknologi informasi lintas eselon I.'
  },
  {
    id: 'SOP-01',
    nomor: 'SOP-09-ITJEN-2025',
    judul: 'Standard Operating Procedure Penanganan & Eskalasi Temuan Risiko Tinggi',
    kategori: 'SOP',
    tanggal: '2025-03-01',
    status: 'Aktif',
    desc: 'Alur eskalasi pelaporan investigasi temuan dengan tingkat ancaman kritis ke pimpinan eselon I dan Itjen.'
  },
  {
    id: 'REG-03',
    nomor: 'SE No. SE-12/ITJEN/2026',
    judul: 'Standardisasi Penjaminan Kualitas Integritas Data & Audit Berbasis Data',
    kategori: 'Surat Edaran',
    tanggal: '2026-02-15',
    status: 'Aktif',
    desc: 'Instruksi kepala Itjen terkait kewajiban eselon I mengintegrasikan data operasional ke SIDATA dan validasi otomatis.'
  },
  {
    id: 'PED-01',
    nomor: 'PED-ITJEN-09-02',
    judul: 'Pedoman Teknis Pelaksanaan Audit Kinerja dan Audit Kepatuhan Keuangan',
    kategori: 'Pedoman Pengawasan',
    tanggal: '2023-09-01',
    status: 'Aktif',
    desc: 'Acuan pelaksanaan pengawasan audit operasional bagi auditor fungsional Itjen di seluruh unit kerja kementerian.'
  },
  {
    id: 'DOC-INT-01',
    nomor: 'DOC-INT-ITJEN-005',
    judul: 'Kebijakan Pengamanan Sistem Informasi & Whitelist Alamat IP SIDATA',
    kategori: 'Dokumen Internal',
    tanggal: '2026-04-10',
    status: 'Aktif',
    desc: 'Protokol keamanan internal Itjen untuk hak akses administrator, enkripsi database, dan pembatasan IP jaringan.'
  }
];

export class RetrieverService {
  /**
   * Search regulations for matching keywords
   */
  static searchRegulations(queryText: string): any[] {
    const q = queryText.toLowerCase().trim();
    if (!q) return [];
    
    return REGULATIONS_DB.filter(doc => 
      doc.judul.toLowerCase().includes(q) ||
      doc.nomor.toLowerCase().includes(q) ||
      doc.desc.toLowerCase().includes(q) ||
      doc.kategori.toLowerCase().includes(q)
    );
  }

  /**
   * Dynamically query and summarize database records based on query context and user permissions.
   */
  static async retrieveDatabaseContext(
    queryText: string,
    db: DbInterface,
    user: { role: string; unitKerja?: string }
  ): Promise<string> {
    try {
      // 1. Get available tables list
      const tables = await db.listTables();
      if (tables.length === 0) {
        return 'Sistem tidak mendeteksi adanya tabel data yang terintegrasi saat ini.';
      }

      // 2. Identify target table from user query
      let matchedTable = tables[0]; // Fallback to first table
      const lowercaseQuery = queryText.toLowerCase();

      for (const t of tables) {
        const nameMatch = lowercaseQuery.includes(t.name.toLowerCase());
        const displayMatch = lowercaseQuery.includes(t.displayName.toLowerCase());
        if (nameMatch || displayMatch) {
          matchedTable = t;
          break;
        }
      }

      // 3. Formulate filters based on user role and unit scope
      const filters: Record<string, any> = {};
      const userUnit = user.unitKerja || '';

      // Check if user is restricted to a unit (Administrator and Itjen roles usually have global access)
      const isRestrictedUser = userUnit && 
        !['administrator', 'itjen', 'inspektorat jenderal'].includes(user.role.toLowerCase()) &&
        !['itjen', 'inspektorat jenderal'].includes(userUnit.toLowerCase());

      if (isRestrictedUser) {
        // Enforce organizational unit restriction
        // Scan table metadata to identify the unit-related field
        let unitColName = '';
        const possibleUnitKeys = [
          'unit_kerja', 'unit', 'kode_unit', 'owner_unit', 'bidang', 
          'eselon', 'satker', 'owner', 'pic', 'eselon_1', 
          'sektor_kerja', 'unit_pemilik'
        ];
        for (const col of matchedTable.columns) {
          const colLower = col.name.toLowerCase();
          if (possibleUnitKeys.includes(colLower)) {
            unitColName = col.name;
            break;
          }
        }

        if (!unitColName) {
          throw new Error(`Tabel "${matchedTable.displayName}" tidak memiliki kolom identitas unit pengawasan yang dapat diidentifikasi secara sah. Analisis data dibatalkan demi keamanan privasi data unit kerja Anda (${userUnit}).`);
        }
        filters[unitColName] = userUnit;
      }

      // 4. Retrieve matching rows (Limit to top 15 results to optimize tokens)
      const searchParams = {
        where: Object.keys(filters).length > 0 ? filters : undefined,
        search: queryText.length > 5 && !lowercaseQuery.includes('semua') ? queryText : undefined,
        limit: 15,
        page: 1
      };

      const result = await db.findRecords(matchedTable.name, searchParams);
      const dataRows = result.data || [];

      // 5. Generate dynamic aggregates & stats to provide high-level context
      const totalRowsCount = result.total;
      const statusCounts: Record<string, number> = {};
      const riskCounts: Record<string, number> = {};

      // If querying all records, grab a larger batch for stats, but keep it token-safe (e.g. limit 100)
      const statsParams = {
        where: Object.keys(filters).length > 0 ? filters : undefined,
        limit: 100,
        page: 1
      };
      const statsResult = await db.findRecords(matchedTable.name, statsParams);
      const statsRows = statsResult.data || [];

      statsRows.forEach((r: any) => {
        // Track status
        const statusVal = String(r.status || r.status_tindak_lanjut || '').trim();
        if (statusVal) statusCounts[statusVal] = (statusCounts[statusVal] || 0) + 1;

        // Track risk level
        const riskVal = String(r.tingkat_risiko || r.risk_score || r.status_risiko || '').trim();
        if (riskVal) riskCounts[riskVal] = (riskCounts[riskVal] || 0) + 1;
      });

      // 6. Build the formatted Markdown context block
      let context = `### Konteks Tabel Database: "${matchedTable.displayName}" (${matchedTable.name})\n`;
      context += `- Total Catatan Terdaftar (Filter Scope): ${totalRowsCount} baris\n`;
      
      if (isRestrictedUser) {
        context += `- **Keamanan Data**: Mengabaikan data unit lain. Menampilkan data khusus Unit: "${userUnit}"\n`;
      }

      if (Object.keys(statusCounts).length > 0) {
        context += `- Distribusi Status (Sampel 100 Baris): ${Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(', ')}\n`;
      }
      if (Object.keys(riskCounts).length > 0) {
        context += `- Distribusi Tingkat Risiko (Sampel 100 Baris): ${Object.entries(riskCounts).map(([k, v]) => `${k}: ${v}`).join(', ')}\n`;
      }

      if (dataRows.length > 0) {
        context += `\n#### Sampel Catatan Data Relevan (Maksimal 15 baris):\n`;
        // Format columns row headers
        const headers = matchedTable.columns.map(c => c.name);
        context += `| ${headers.join(' | ')} |\n`;
        context += `| ${headers.map(() => '---').join(' | ')} |\n`;
        
        dataRows.forEach((row: any) => {
          const cells = headers.map(h => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            // Trim long strings to avoid token bloat
            const strVal = String(val);
            return strVal.length > 60 ? `${strVal.substring(0, 57)}...` : strVal;
          });
          context += `| ${cells.join(' | ')} |\n`;
        });
      } else {
        context += `\n- Tidak ditemukan baris data yang cocok dengan kriteria pencarian Anda.\n`;
      }

      return context;
    } catch (e: any) {
      console.error('RetrieverService DB Query Error:', e);
      if (e.message.includes('kolom identitas unit')) {
        throw e;
      }
      return `Kesalahan saat membaca data dari database relasional: ${e.message}`;
    }
  }
}
