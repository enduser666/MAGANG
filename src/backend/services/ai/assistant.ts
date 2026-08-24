import { getAIProvider } from './provider';
import { RetrieverService } from './retriever';
import { DbInterface } from '@/db';

export class AIAssistantService {
  /**
   * Main chat coordinator
   */
  static async chat(
    userQuery: string,
    db: DbInterface,
    user: { role: string; username: string; unitKerja?: string }
  ): Promise<string> {
    const provider = getAIProvider();

    // 1. Boundary checking using keyword heuristics (pre-filtering for fast refusals)
    const lowercaseQuery = userQuery.toLowerCase().trim();
    
    // Check if the query looks completely unrelated to SIDATA (e.g. World Cup, other countries, general coding/recipes)
    const unrelatedKeywords = [
      'world cup', 'piala dunia', 'sepak bola', 'football', 'soccer', 'recipe', 'resep', 'masak', 'cooking',
      'weather', 'cuaca', 'celebrity', 'artis', 'movie', 'film', 'song', 'lagu', 'game', 'permainan'
    ];

    const isUnrelated = unrelatedKeywords.some(kw => lowercaseQuery.includes(kw));
    if (isUnrelated) {
      return 'Maaf. Saya hanya dapat membantu analisis data dan dokumen yang tersedia di dalam SIDATA.';
    }

    // 2. Perform Retrieval-Augmented Generation (RAG)
    let retrievedContext = '';

    // If query is about regulations PMK / SOP / Surat Edaran / Regulasi
    const isRegulationQuery = lowercaseQuery.includes('regulasi') || 
                              lowercaseQuery.includes('sop') || 
                              lowercaseQuery.includes('pmk') || 
                              lowercaseQuery.includes('edaran') ||
                              lowercaseQuery.includes('pedoman') ||
                              lowercaseQuery.includes('aturan');

    if (isRegulationQuery) {
      const docs = RetrieverService.searchRegulations(userQuery);
      if (docs.length > 0) {
        retrievedContext += `### Konteks Dokumen Regulasi Terkait (Repository Regulasi SIDATA):\n`;
        docs.forEach(doc => {
          retrievedContext += `- **Nomor**: ${doc.nomor}\n`;
          retrievedContext += `  **Judul**: ${doc.judul}\n`;
          retrievedContext += `  **Kategori**: ${doc.kategori}\n`;
          retrievedContext += `  **Berlaku**: ${doc.tanggal}\n`;
          retrievedContext += `  **Deskripsi**: ${doc.desc}\n\n`;
        });
      } else {
        retrievedContext += `### Konteks Regulasi:\n- Tidak ditemukan regulasi yang cocok secara spesifik dalam repositori regulasi SIDATA.\n\n`;
      }
    }

    // Always fetch database tables/statistics to enrich the context
    try {
      const dbContext = await RetrieverService.retrieveDatabaseContext(userQuery, db, user);
      retrievedContext += dbContext;
    } catch (error: any) {
      return `Akses ditolak: ${error.message}`;
    }

    // 3. Define System Instructions & Domain Guardrails
    const systemInstruction = `Anda adalah Asisten AI SIDATA (Asisten Kecerdasan Internal Inspektorat Jenderal Kementerian Keuangan Republik Indonesia).
Anda bertugas membantu menganalisis data temuan pengawasan, tindak lanjut (TLHP), manajemen risiko, kualitas data, log audit, dan regulasi internal.

ATURAN BATASAN (IMPORTANT):
1. Jawab HANYA pertanyaan yang berhubungan dengan domain SIDATA berikut:
   - Monitoring Rekomendasi BPK
   - Pemantauan Tindak Lanjut Hasil Pengawasan (TLHP)
   - Temuan Audit / Hasil Pengawasan
   - Integrasi Data / Pipeline Ingestion
   - Tata Kelola Data (Data Governance / Lineage / Quality)
   - Repositori Regulasi Internal Kemenkeu (PMK, SOP, SE)
   - Unit Kerja Eselon I Kemenkeu
   - Manajemen Risiko Organisasi
2. Jika pengguna menanyakan hal di luar domain SIDATA (seperti sepak bola, piala dunia, cuaca, resep masakan, pemrograman umum, gosip, film, dll), Anda WAJIB menjawab dengan kalimat eksak berikut dan TANPA penjelasan lain:
   "Maaf. Saya hanya dapat membantu analisis data dan dokumen yang tersedia di dalam SIDATA."

ATURAN FORMAT RESPON:
Formatlah jawaban Anda secara terstruktur menggunakan format berikut jika relevan dengan pertanyaan:

### Ringkasan
(Tuliskan ringkasan singkat dari data atau jawaban yang ditanyakan)

### Temuan Kunci
(Tuliskan 2-3 poin temuan utama dari analisis data yang dilakukan)

### Data Pendukung
(Tuliskan data statistik, persentase, atau detail sampel baris yang mendukung temuan)

### Rekomendasi
(Tuliskan saran rekomendasi tindakan atau program mitigasi)

### Sumber
(Sebutkan nama tabel data atau dokumen regulasi yang dirujuk)

### Tingkat Keyakinan
(Sebutkan Tingkat Keyakinan Anda: Tinggi, Sedang, atau Rendah berdasarkan kecocokan data konteks)`;

    // 4. Formulate the final prompt combining query and context
    const finalPrompt = `Pertanyaan Pengguna: "${userQuery}"

Berikut adalah data pendukung yang diambil secara aman dari sistem database/repositori regulasi berdasarkan filter otorisasi unit kerja pengguna:

${retrievedContext}

Gunakan data pendukung di atas untuk menjawab pertanyaan pengguna dengan mematuhi format standar dan aturan batasan yang didefinisikan dalam instruksi sistem.`;

    // 5. Query the LLM Provider
    const llmResponse = await provider.generateResponse(finalPrompt, systemInstruction);
    return llmResponse;
  }
}
