import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { getDbClient } from '@/db';
import { ApiResponse } from '@/backend/lib/api-response';
import { withAuth } from '@/backend/lib/auth';
import axios from 'axios';

const sessionDocumentCache = new Map<string, { fileName: string; content: string }>();

export const POST = withAuth(async (request: Request, sessionUser: any) => {
  try {
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);
    const user = await db.users.findByUsername(sessionUser.username);
    if (!user) {
      return ApiResponse.error('Akun tidak ditemukan di database.', null, 404);
    }

    const formData = await request.formData();
    const message = (formData.get('message') as string) || '';
    const file = formData.get('file') as File | null;
    const sessionId = (formData.get('sessionId') as string) || user.username || 'default';
    
    const historyRaw = (formData.get('history') as string) || '[]';
    let history: { role: string; content: string }[] = [];
    try {
      history = JSON.parse(historyRaw);
    } catch {
      history = [];
    }

    if (!message && !file && history.length === 0) {
      return ApiResponse.error('Pesan, file, atau riwayat tidak boleh kosong.', null, 400);
    }

    let extractedTextFromFile = '';
    let fileNameUsed = '';

    // Ekstraksi File dan simpan ke Cache Memory
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fileNameUsed = file.name.toLowerCase();

      if (fileNameUsed.endsWith('.xlsx') || fileNameUsed.endsWith('.xls') || fileNameUsed.endsWith('.csv')) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        let excelContent = '';
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          excelContent += `--- SHEET: ${sheetName} ---\n` + JSON.stringify(jsonData, null, 2) + '\n\n';
        });
        extractedTextFromFile = excelContent;
      } else if (fileNameUsed.endsWith('.pdf')) {
        const parser = new PDFParse({ data: buffer });
        try {
          const pdfData = await parser.getText();
          extractedTextFromFile = pdfData.text;
        } finally {
          await (parser as any).destroy?.();
        }
      } else if (file.type.startsWith('image/')) {
        const worker = await createWorker('ind');
        const ret = await worker.recognize(buffer);
        extractedTextFromFile = ret.data.text;
        await worker.terminate();
      } else {
        extractedTextFromFile = buffer.toString('utf-8');
      }

      sessionDocumentCache.set(sessionId, {
        fileName: file.name,
        content: extractedTextFromFile
      });
    } else if (sessionDocumentCache.has(sessionId)) {
      const cachedDoc = sessionDocumentCache.get(sessionId)!;
      extractedTextFromFile = cachedDoc.content;
      fileNameUsed = cachedDoc.fileName;
    }

    // Pangkas teks dokumen agar tidak overload
    let processedDocumentText = extractedTextFromFile;
    if (processedDocumentText.length > 6000) {
      processedDocumentText = processedDocumentText.slice(0, 6000) + '\n\n...[Sisa teks dipotong untuk menjaga performa inferensi]...';
    }

    let finalPrompt = message;
    if (processedDocumentText) {
      finalPrompt = `[DOKUMEN TERLAMPIR: ${fileNameUsed}]\nISI DOKUMEN:\n${processedDocumentText}\n\n[PERTANYAAN USER]: ${message || 'Tolong buatkan analisis dan ringkasan dari dokumen terlampir.'}`;
    }

    const selectedModel = process.env.OLLAMA_MODEL || 'gemma2:27b'; // Sesuai model yang lu pakai
    
    const systemPrompt = `PERINTAH UTAMA: Kamu WAJIB menjawab SELURUH pertanyaan HANYA dalam Bahasa Indonesia yang formal, baku, dan lugas. DILARANG MERESPON DALAM BAHASA INGGRIS.
Pengguna yang sedang bertanya: ${user.username}.
Tugas utama: Menganalisis data dari dokumen Excel, PDF, atau Laporan Audit terlampir. Gunakan format Markdown (bold, list) jika diperlukan.`;

    const ollamaMessages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-2),
      { role: 'user', content: finalPrompt }
    ];

    let responseText = '';
    const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
    try {
      const ollamaResponse = await axios.post(`${ollamaUrl}/api/chat`, {
        model: selectedModel,
        keep_alive: '1h',
        messages: ollamaMessages,
        stream: false,
        options: {
          temperature: 0.3,
          num_ctx: 8192,   // Bypass limit konteks
          num_predict: -1, // Bypass limit jawaban kepotong
        }
      }, {
        timeout: 900000 // Bypass limit 5 menit (set ke 15 menit)
      });

      const ollamaData = ollamaResponse.data;
      let rawContent = ollamaData.message?.content || 'Tidak ada respon dari model.';
      // Bersihkan tag <think> jika pakai DeepSeek
      responseText = rawContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    } catch (ollamaError: any) {
       if (ollamaError.code === 'ECONNABORTED') {
         throw new Error('Ollama timeout melebihi 15 menit.');
       }
       throw ollamaError;
    }

    return ApiResponse.success(responseText, 'AI assistant query executed successfully');

  } catch (error: any) {
    console.error('API /api/ai/chat Error Details:', error);
    return ApiResponse.error(error.message || 'Internal Server Error', error, 500);
  }
});
