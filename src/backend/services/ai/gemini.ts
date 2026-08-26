import { config } from '@/backend/lib/config';
import { AIProvider } from './provider';

export class GeminiProvider implements AIProvider {
  async generateResponse(prompt: string, systemInstruction?: string): Promise<string> {
    const apiKey = config.geminiApiKey;

    // Check if we should use local AI Simulation Mode
    const isMockMode = !apiKey || 
      apiKey.trim() === '' || 
      apiKey.includes('kunci API Anda') || 
      apiKey.startsWith('AIzaSy...');

    if (isMockMode) {
      return this.generateMockResponse(prompt);
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      
      const payload: any = {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [
            {
              text: systemInstruction
            }
          ]
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Gemini API Error Response:', errText);
        let parsedMessage = '';
        try {
          const parsed = JSON.parse(errText);
          parsedMessage = parsed.error?.message || errText;
        } catch {
          parsedMessage = errText;
        }
        throw new Error(`Gemini API HTTP Error: ${response.status} - ${parsedMessage}`);
      }

      const data = await response.json();
      
      // Parse Gemini response text
      const candidates = data.candidates || [];
      if (candidates.length > 0 && candidates[0].content?.parts?.length > 0) {
        return candidates[0].content.parts[0].text || '';
      }

      return 'Maaf, tidak ada respon yang dihasilkan dari model kecerdasan buatan.';
    } catch (e: any) {
      console.error('Gemini Provider Exception:', e);
      return `Maaf, terjadi kesalahan saat menghubungi server AI: ${e.message || 'Unknown Error'}`;
    }
  }

  /**
   * Generates highly realistic, data-driven mock responses based on the RAG prompt context
   */
  private generateMockResponse(prompt: string): string {
    // 1. Extract the user query
    const queryMatch = prompt.match(/Pertanyaan Pengguna:\s*"([^"]+)"/);
    const userQuery = queryMatch ? queryMatch[1] : prompt;
    const lowercaseQuery = userQuery.toLowerCase().trim();

    // 2. Allowed domain & Boundary checking
    const unrelatedKeywords = [
      'world cup', 'piala dunia', 'sepak bola', 'football', 'soccer', 'recipe', 'resep', 'masak', 'cooking',
      'weather', 'cuaca', 'celebrity', 'artis', 'movie', 'film', 'song', 'lagu', 'game', 'permainan'
    ];
    if (unrelatedKeywords.some(kw => lowercaseQuery.includes(kw))) {
      return 'Maaf. Saya hanya dapat membantu analisis data dan dokumen yang tersedia di dalam SIDATA.';
    }

    // 3. Extract the dynamic Markdown table data from the RAG prompt context
    const lines = prompt.split('\n');
    const tableLines = lines.filter(l => l.trim().startsWith('|'));
    const dataRows: Record<string, string>[] = [];
    let tableName = 'database_sidata';

    // Try to find the table name
    const tableNameMatch = prompt.match(/Konteks Tabel Database:\s*"[^"]+"\s*\(([^)]+)\)/);
    if (tableNameMatch) {
      tableName = tableNameMatch[1];
    }

    // Parse the Markdown table rows
    if (tableLines.length > 2) {
      const headers = tableLines[0].split('|').map(s => s.trim()).filter(s => s);
      for (let i = 2; i < tableLines.length; i++) {
        const cells = tableLines[i].split('|').map(s => s.trim()).filter(s => s);
        if (cells.length === headers.length) {
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            row[h] = cells[idx];
          });
          dataRows.push(row);
        }
      }
    }

    // 4. Construct dynamic, data-driven answers based on query keywords
    const isRegulationQuery = lowercaseQuery.includes('regulasi') || 
                              lowercaseQuery.includes('sop') || 
                              lowercaseQuery.includes('pmk') || 
                              lowercaseQuery.includes('edaran') ||
                              lowercaseQuery.includes('pedoman');

    if (isRegulationQuery) {
      // Analyze regulation documents from prompt text
      const docs: string[] = [];
      lines.forEach(line => {
        if (line.includes('**Nomor**:') || line.includes('**Judul**:')) {
          docs.push(line.trim());
        }
      });

      return `### Ringkasan
Berdasarkan pencarian pada Repositori Regulasi SIDATA, ditemukan regulasi pengawasan internal terkait yang relevan dengan kueri Anda.

### Temuan Kunci
- Regulasi pengawasan internal menetapkan tata kelola penanganan rekomendasi tindak lanjut BPK secara transparan.
- Terdapat dokumen standardisasi penjaminan kualitas audit berbasis data (SE-12/ITJEN/2026).

### Data Pendukung
- Dokumen aktif terdeteksi: PMK No. 123/PMK.09/2025 dan SOP-09-ITJEN-2025 terkait eskalasi temuan kerawanan tinggi.

### Rekomendasi
- Pastikan seluruh kriteria audit kinerja di lingkungan Kemenkeu mengacu pada pedoman teknis terbaru.
- Terapkan alur eskalasi penanganan temuan sesuai SLA yang ditentukan dalam SOP.

### Sumber
Repository Regulasi SIDATA (PMK, SOP, SE)

### Tingkat Keyakinan
Tinggi (Simulasi Lokal)`;
    }

    // Database statistics queries
    if (lowercaseQuery.includes('unit') || lowercaseQuery.includes('eselon')) {
      const unitCounts: Record<string, number> = {};
      dataRows.forEach(r => {
        const u = r.unit_kerja || r.unit || r.owner || r.pic || 'Lainnya';
        unitCounts[u] = (unitCounts[u] || 0) + 1;
      });

      const sortedUnits = Object.entries(unitCounts).sort((a, b) => b[1] - a[1]);
      const topUnitName = sortedUnits.length > 0 ? sortedUnits[0][0] : 'Direktorat Jenderal Pajak (DJP)';
      const topUnitCount = sortedUnits.length > 0 ? sortedUnits[0][1] : 12;

      return `### Ringkasan
Analisis sebaran data pemantauan berdasarkan unit kerja Eselon I Kementerian Keuangan yang terdaftar di dalam database SIDATA.

### Temuan Kunci
- **${topUnitName}** mencatat volume record pemantauan tertinggi di dalam database sampel.
- Sebagian besar temuan didominasi oleh aspek kepatuhan administratif dan pencatatan saldo.

### Data Pendukung
- Unit kerja dengan jumlah record tertinggi: ${topUnitName} dengan total ${topUnitCount} catatan dari sampel data yang dianalisis.
- Tabel sumber yang dianalisis: \`${tableName}\` (${dataRows.length} baris sampel termuat).

### Rekomendasi
- Lakukan pendampingan intensif (Asistensi Pengawasan) pada unit ${topUnitName} untuk mempercepat penyelesaian status pemantauan.
- Lakukan sinkronisasi data audit dengan modul integrasi berkas secara berkala.

### Sumber
Database SIDATA - Tabel: \`${tableName}\`

### Tingkat Keyakinan
Tinggi (Simulasi Lokal)`;
    }

    if (lowercaseQuery.includes('belum selesai') || lowercaseQuery.includes('rekomendasi') || lowercaseQuery.includes('outstanding')) {
      const pendingRows = dataRows.filter(r => {
        const st = String(r.status || r.status_tindak_lanjut || '').toLowerCase();
        return st.includes('proses') || st.includes('belum') || st.includes('open') || st.includes('outstanding');
      });

      const pendingCount = pendingRows.length > 0 ? pendingRows.length : 5;

      return `### Ringkasan
Analisis status penyelesaian rekomendasi audit BPK yang belum selesai (outstanding/belum ditindaklanjuti).

### Temuan Kunci
- Terdapat sejumlah rekomendasi pengawasan yang masih dalam status "Proses" atau "Belum Ditindaklanjuti".
- Faktor utama keterlambatan adalah perlunya koordinasi lintas sektoral antar unit eselon I.

### Data Pendukung
- Ditemukan ${pendingCount} rekomendasi outstanding dari total sampel yang dianalisis pada tabel \`${tableName}\`.
- Kasus ini didominasi oleh unit kerja operasional seperti DJP dan DJBC.

### Rekomendasi
- Segera lakukan eskalasi surat teguran otomatis ke pimpinan unit kerja terkait yang memiliki rekomendasi outstanding melewati batas SLA (90 hari).
- Manfaatkan modul Data Governance untuk meninjau kembali orisinalitas berkas penunjang yang diunggah.

### Sumber
Database SIDATA - Tabel: \`${tableName}\`

### Tingkat Keyakinan
Tinggi (Simulasi Lokal)`;
    }

    if (lowercaseQuery.includes('tren') || lowercaseQuery.includes('tlhp') || lowercaseQuery.includes('penyelesaian')) {
      return `### Ringkasan
Tren penyelesaian Tindak Lanjut Hasil Pengawasan (TLHP) nasional di lingkungan Kementerian Keuangan.

### Temuan Kunci
- Tren menunjukkan performa penyelesaian yang cukup stabil dengan target SLA kumulatif nasional tercapai sebesar 92.4%.
- Terjadi akselerasi penyelesaian tindak lanjut pada akhir triwulan berjalan setelah implementasi portal SIDATA.

### Data Pendukung
- Rata-rata tingkat penyelesaian (Completion Rate) berada di tingkat 92.4%.
- Total kasus overdue yang tercatat di sistem saat ini berjumlah 562 kasus.

### Rekomendasi
- Pertahankan dashboard monitoring interaktif untuk memudahkan pelacakan status oleh unit kepatuhan internal.
- Lakukan rekonsiliasi bulanan otomatis menggunakan modul Integrasi Data SIDATA.

### Sumber
Dashboard Executive & Database SIDATA

### Tingkat Keyakinan
Tinggi (Simulasi Lokal)`;
    }

    // Default general response analyzing whatever fields and records are in context
    const columnsList = dataRows.length > 0 ? Object.keys(dataRows[0]).join(', ') : 'id, status, unit_kerja, rekomendasi';

    return `### Ringkasan
Asisten AI SIDATA telah menganalisis data kueri Anda mengenai "${userQuery}" berdasarkan sampel baris pada tabel \`${tableName}\`.

### Temuan Kunci
- Skema tabel database \`${tableName}\` terdeteksi aktif dengan kolom: ${columnsList}.
- Sampel data menunjukkan variasi rekaman pengawasan internal yang terintegrasi secara modular.

### Data Pendukung
- Total baris yang dianalisis dalam sampel ini: ${dataRows.length} baris.
- Pencarian kata kunci: "${userQuery}".

### Rekomendasi
- Gunakan menu **Data Pemantauan** untuk meninjau secara rinci baris data relasional.
- Gunakan menu **Log Audit** untuk melihat riwayat perubahan data pada baris yang dimodifikasi.

### Sumber
Database SIDATA - Tabel: \`${tableName}\`

### Tingkat Keyakinan
Tinggi (Simulasi Lokal)`;
  }
}
