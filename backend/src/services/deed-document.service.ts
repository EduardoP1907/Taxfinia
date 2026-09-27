import fs from 'fs';
import path from 'path';
import prisma from '../config/database';
import { isS3Enabled, uploadToS3, deleteFromS3 } from '../utils/s3';
import { extractDeedDocumentText, ALLOWED_DEED_MIME_TYPES } from '../utils/deed-document';

const DEEDS_DIR = path.join(__dirname, '../../uploads/deeds');

if (!fs.existsSync(DEEDS_DIR)) {
  fs.mkdirSync(DEEDS_DIR, { recursive: true });
}

/**
 * Stores the company's incorporation deed (escritura) document: extracts its
 * text so `ai-analysis.service.ts` can use it as context when generating
 * reports, and keeps the original file for reference (S3 if configured,
 * local `uploads/deeds/` otherwise).
 */
export async function uploadDeedDocument(
  companyId: string,
  userId: string,
  file: { buffer: Buffer; originalname: string; mimetype: string },
): Promise<void> {
  if (!ALLOWED_DEED_MIME_TYPES.includes(file.mimetype)) {
    throw new Error('Formato no soportado. Solo se aceptan archivos PDF o de texto plano.');
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId, deletedAt: null },
    select: { id: true, deedDocumentPath: true },
  });
  if (!company) {
    throw new Error('Empresa no encontrada');
  }

  const text = await extractDeedDocumentText(file.buffer, file.mimetype);

  const ext = file.mimetype === 'application/pdf' ? '.pdf' : '.txt';
  const filename = `${companyId}-${Date.now()}${ext}`;
  const localPath = path.join(DEEDS_DIR, filename);
  fs.writeFileSync(localPath, file.buffer);

  let storedPath = `deeds/${filename}`;
  if (isS3Enabled()) {
    storedPath = await uploadToS3(localPath, `deeds/${filename}`, file.mimetype);
  }

  await removeStoredFile(company.deedDocumentPath);

  await prisma.company.update({
    where: { id: companyId },
    data: {
      deedDocumentPath: storedPath,
      deedDocumentName: file.originalname,
      deedDocumentText: text,
      deedDocumentUploadedAt: new Date(),
    },
  });
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
