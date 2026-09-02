import { getDbClient } from '@/db';
import { AIAssistantService } from '@/backend/services/ai/assistant';
import { ApiResponse } from '@/backend/lib/api-response';
import { withAuth } from '@/backend/lib/auth';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as xlsx from 'xlsx';

export const POST = withAuth(async (request, sessionUser) => {
  try {
    // 2. Initialize database client
    const dbType = request.headers.get('x-db-type') || 'sandbox';
    const dbConfig = request.headers.get('x-db-config');
    const db = getDbClient(dbType, dbConfig);

    // 3. Find user profile from DB to access unit kerja
    const user = await db.users.findByUsername(sessionUser.username);
    if (!user) {
      return ApiResponse.error('Akun tidak ditemukan di database.', null, 404);
    }

    // 4. Parse request payload
    let message = '';
    let fileExtractedText = '';
    
    // Check Content-Type to see if it's form-data or JSON (just in case)
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      message = formData.get('message') as string || '';
      
      const file = formData.get('file') as File;
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = file.name.toLowerCase();
        
        try {
          if (fileName.endsWith('.pdf')) {
            const parser = new PDFParse({ data: buffer });
            const pdfData = await parser.getText();
            fileExtractedText = pdfData.text;
          } else if (fileName.endsWith('.docx')) {
            const result = await mammoth.extractRawText({ buffer });
            fileExtractedText = result.value;
          } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
            const workbook = xlsx.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            fileExtractedText = xlsx.utils.sheet_to_csv(sheet);
          } else if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.json')) {
            fileExtractedText = buffer.toString('utf-8');
          } else {
            fileExtractedText = "Format file tidak didukung untuk ekstraksi otomatis.";
          }
        } catch (e: any) {
          console.error("File parsing error:", e);
          fileExtractedText = "Gagal mengekstrak isi file: " + e.message;
        }
      }
    } else {
      const body = await request.json();
      message = body.message;
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return ApiResponse.error('Pertanyaan tidak boleh kosong.', null, 400);
    }

    let finalPrompt = message;
    if (fileExtractedText) {
      finalPrompt += `\n\n--- Isi Dokumen Terlampir ---\n${fileExtractedText}\n--- Akhir Dokumen ---\n`;
    }

    // 5. Call assistant service
    const responseText = await AIAssistantService.chat(finalPrompt, db, {
      role: user.role,
      username: user.username,
      unitKerja: user.unitKerja || ''
    });

    // 6. Write audit log for AI interaction
    await db.auditLogs.create({
      action: 'AI_ASSISTANT_QUERY',
      details: `User questioned AI: "${message.length > 60 ? message.substring(0, 57) + '...' : message}"`,
      user: user.username
    });

    return ApiResponse.success(responseText, 'AI assistant query executed successfully');

  } catch (error: any) {
    console.error('API /api/ai/chat Error:', error);
    return ApiResponse.error(error.message || 'Internal Server Error', error, 500);
  }
});
