import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { PDFParse } from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { getDbClient } from '@/db';
import { ApiResponse } from '@/backend/lib/api-response';
import { withAuth } from '@/backend/lib/auth';
import axios from 'axios';

const sessionDocumentCache = new Map<string, { fileName: string; content: string; base64?: string; mimeType?: string }>();

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
    let imageBase64 = '';
    let imageMimeType = '';

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
        // Simpan gambar sebagai Base64 untuk dikirim langsung ke AI Vision
        imageBase64 = buffer.toString('base64');
        imageMimeType = file.type;
        
        // Tetap jalankan OCR sebagai cadangan teks
        const worker = await createWorker('ind');
        const ret = await worker.recognize(buffer);
        extractedTextFromFile = ret.data.text;
        await worker.terminate();
      } else {
        extractedTextFromFile = buffer.toString('utf-8');
      }

      sessionDocumentCache.set(sessionId, {
        fileName: file.name,
        content: extractedTextFromFile,
        base64: imageBase64,
        mimeType: imageMimeType
      });
    } else if (sessionDocumentCache.has(sessionId)) {
      const cachedDoc = sessionDocumentCache.get(sessionId)!;
      extractedTextFromFile = cachedDoc.content;
      fileNameUsed = cachedDoc.fileName;
      imageBase64 = cachedDoc.base64 || '';
      imageMimeType = cachedDoc.mimeType || '';
    }

    let processedDocumentText = extractedTextFromFile;
    if (processedDocumentText.length > 6000) {
      processedDocumentText = processedDocumentText.slice(0, 6000) + '\n\n...[Sisa teks dipotong untuk menjaga performa]...';
    }

    let finalPrompt = message;
    if (processedDocumentText) {
      finalPrompt = `[DOKUMEN TERLAMPIR: ${fileNameUsed}]\n=== ISI DOKUMEN/TEKS OCR ===\n${processedDocumentText}\n===================\n\n[PERTANYAAN USER]: ${message}\n\nTugasmu: Lakukan analisis tahap demi tahap.`;
    }

    const selectedModel = process.env.AI_MODEL || 'openai/gpt-4o-mini';
    
    const systemPrompt = `Kamu adalah Asisten Analitik AI SIDATA Kementerian Keuangan. Kamu sangat teliti, kritis, dan berpatokan murni pada data.
Pengguna yang sedang bertanya: ${user.username}.

ATURAN MUTLAK ANALISIS DOKUMEN:
1. BACA DENGAN TELITI: Jangan terburu-buru menyimpulkan. Analisis setiap baris, tabel, gambar, dan keterangan dalam dokumen terlampir.
2. BERPIKIR TAHAP DEMI TAHAP (Chain of Thought): Uraikan temuanmu secara terstruktur sebelum memberikan kesimpulan akhir.
3. KETAT PADA FAKTA: Jawabanmu WAJIB 100% didasarkan HANYA pada informasi di dalam dokumen atau gambar.
4. BAHASA INDONESIA BAKU: Wajib gunakan Bahasa Indonesia yang profesional dan lugas. Gunakan format Markdown.`;

    // Cek apakah ada gambar yang harus dikirim menggunakan format Multimodal (Vision API)
    let userMessageContent: any = finalPrompt;
    if (imageBase64) {
      userMessageContent = [
        { type: "text", text: finalPrompt },
        { type: "image_url", image_url: { url: `data:${imageMimeType};base64,${imageBase64}` } }
      ];
    }

    const openRouterMessages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-2),
      { role: 'user', content: userMessageContent }
    ];

    let responseText = '';
    const openRouterUrl = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
    
    try {
      const aiResponse = await axios.post(`${openRouterUrl}/chat/completions`, {
        model: selectedModel,
        messages: openRouterMessages,
        temperature: 0.3,
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.AI_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000', 
          'X-Title': 'SIDATA App'
        },
        timeout: 900000 
      });

      responseText = aiResponse.data.choices[0]?.message?.content || 'Tidak ada respon dari model.';
      responseText = responseText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    } catch (aiError: any) {
       if (aiError.code === 'ECONNABORTED') {
         throw new Error('API timeout melebihi waktu yang ditentukan.');
       }
       const errorMessage = aiError.response?.data?.error?.message || aiError.message;
       throw new Error(`OpenRouter Error: ${errorMessage}`);
    }

    return ApiResponse.success(responseText, 'AI assistant query executed successfully');

  } catch (error: any) {
    console.error('API /api/chat Error Details:', error);
    return ApiResponse.error(error.message || 'Internal Server Error', error, 500);
  }
});