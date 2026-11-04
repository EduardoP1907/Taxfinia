import fs from 'fs';
import path from 'path';
import prisma from '../config/database';
import { isS3Enabled, uploadToS3, deleteFromS3 } from '../utils/s3';
import {
  ALLOWED_DEED_MIME_TYPES,
  DeedDocumentError,
  extractPdfTextLayer,
  hasEnoughText,
  normalizeDeedText,
} from '../utils/deed-document';
import { ocrDeedDocument } from './deed-ocr.service';

const DEEDS_DIR = path.join(__dirname, '../../uploads/deeds');

if (!fs.existsSync(DEEDS_DIR)) {
  fs.mkdirSync(DEEDS_DIR, { recursive: true });
}

export type DeedDocumentStatus = 'PROCESSING' | 'READY' | 'FAILED';

/**
 * Stores the company's incorporation deed (escritura) document and its text,
 * which `ai-analysis.service.ts` uses as context when generating reports. The
 * original file is kept for reference (S3 if configured, local
 * `uploads/deeds/` otherwise).
 *
 * - Plain text and PDFs with a text layer are read right away (status READY).
 * - Scanned PDFs (no text layer) are read by Claude (OCR) in the background,
 *   because 20+ pages take longer than the CloudFront request timeout. The
 *   request answers PROCESSING and the frontend shows the status until
 *   it turns READY or FAILED.
 */
export async function uploadDeedDocument(
  companyId: string,
  userId: string,
  file: { buffer: Buffer; originalname: string; mimetype: string },
): Promise<DeedDocumentStatus> {
  if (!ALLOWED_DEED_MIME_TYPES.includes(file.mimetype)) {
    throw new DeedDocumentError('Formato no soportado. Solo se aceptan archivos PDF o de texto plano.');
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId, deletedAt: null },
    select: { id: true, deedDocumentPath: true },
  });
  if (!company) {
    throw new Error('Empresa no encontrada');
  }

  const isPdf = file.mimetype === 'application/pdf';
  const text = isPdf ? await extractPdfTextLayer(file.buffer) : file.buffer.toString('utf-8').trim();
  const needsOcr = isPdf && !hasEnoughText(text);
  if (!isPdf && !hasEnoughText(text)) {
    throw new DeedDocumentError('El archivo de texto está vacío o no tiene contenido suficiente.');
  }

  const ext = isPdf ? '.pdf' : '.txt';
  const filename = `${companyId}-${Date.now()}${ext}`;
  const localPath = path.join(DEEDS_DIR, filename);
  fs.writeFileSync(localPath, file.buffer);

  let storedPath = `deeds/${filename}`;
  if (isS3Enabled()) {
    storedPath = await uploadToS3(localPath, `deeds/${filename}`, file.mimetype);
  }

  await removeStoredFile(company.deedDocumentPath);

  const status: DeedDocumentStatus = needsOcr ? 'PROCESSING' : 'READY';
  await prisma.company.update({
    where: { id: companyId },
    data: {
      deedDocumentPath: storedPath,
      deedDocumentName: file.originalname,
      deedDocumentText: needsOcr ? null : normalizeDeedText(text),
      deedDocumentUploadedAt: new Date(),
      deedDocumentStatus: status,
      deedDocumentError: null,
    },
  });

  if (needsOcr) {
    void runDeedOcr(companyId, storedPath, file.buffer, file.originalname);
  }
  return status;
}

async function runDeedOcr(companyId: string, storedPath: string, buffer: Buffer, filename: string): Promise<void> {
  let data: { deedDocumentStatus: DeedDocumentStatus; deedDocumentText: string | null; deedDocumentError: string | null };
  try {
    const text = await ocrDeedDocument(buffer, filename);
    data = hasEnoughText(text)
      ? { deedDocumentStatus: 'READY', deedDocumentText: normalizeDeedText(text), deedDocumentError: null }
      : {
          deedDocumentStatus: 'FAILED',
          deedDocumentText: null,
          deedDocumentError: 'No se encontró texto legible en el documento escaneado.',
        };
  } catch (err) {
    console.error('[deed-ocr] Error leyendo escritura escaneada:', err);
    data = {
      deedDocumentStatus: 'FAILED',
      deedDocumentText: null,
      deedDocumentError: 'No se pudo leer la escritura escaneada. Intente subirla nuevamente más tarde.',
    };
  }

  // Only if the same document is still there (the user may have replaced or
  // removed it while the OCR was running).
  await prisma.company
    .updateMany({ where: { id: companyId, deedDocumentPath: storedPath }, data })
    .catch((err) => console.error('[deed-ocr] Error guardando el resultado:', err));
}

export async function deleteDeedDocument(companyId: string, userId: string): Promise<void> {
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId, deletedAt: null },
    select: { id: true, deedDocumentPath: true },
  });
  if (!company) {
    throw new Error('Empresa no encontrada');
  }

  await removeStoredFile(company.deedDocumentPath);

  await prisma.company.update({
    where: { id: companyId },
    data: {
      deedDocumentPath: null,
      deedDocumentName: null,
      deedDocumentText: null,
      deedDocumentUploadedAt: null,
      deedDocumentStatus: null,
      deedDocumentError: null,
    },
  });
}

async function removeStoredFile(storedPath: string | null): Promise<void> {
  if (!storedPath) return;
  if (isS3Enabled()) {
    await deleteFromS3(storedPath);
  } else {
    const localPath = path.join(__dirname, '../../uploads', storedPath);
    fs.unlink(localPath, () => {});
  }
}
