import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {
  generateReport,
  getCompanyReports,
  getReport,
  getReportFilePath,
  setReportDownloadCode,
} from '../services/report.service';
import { convertDocxToPdf } from '../utils/docx-to-pdf';
import { generatePreviewToken, verifyPreviewToken, PREVIEW_TTL } from '../utils/preview-token';
import { sendAdminReportCodeEmail } from '../utils/email';
import { isS3Enabled, getS3SignedUrl, streamS3ToResponse } from '../utils/s3';

/** Generate random code like TXFIN-A4K9-M2P7 */
function generateDownloadCode(): string {
  const part = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `TXFIN-${part()}-${part()}`;
}

/** Return cached analysis PDF path (local disk).
 *  If the DOCX comes from S3, it is first downloaded to /tmp. */
async function getAnalysisPdfFromLocal(docxFilePath: string): Promise<string> {
  const pdfPath = docxFilePath.replace(/\.docx$/i, '_analisis.pdf');
  if (!fs.existsSync(pdfPath)) {
    await convertDocxToPdf(docxFilePath, pdfPath);
  }
  return pdfPath;
}

/** Resolve DOCX to a local path, downloading from S3 if necessary.
 *  Returns { localDocxPath, cleanup } — call cleanup() when done. */
async function resolveDocxLocally(
  storedPath: string
): Promise<{ localDocxPath: string; cleanup: () => void }> {
  // S3 keys contain a slash (e.g. "reports/<id>/filename.docx")
  if (isS3Enabled() && storedPath.includes('/')) {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const { S3Client } = await import('@aws-sdk/client-s3');
    const { config } = await import('../config/env');
    const tmpPath = path.join(require('os').tmpdir(), path.basename(storedPath));

    const s3 = new S3Client({
      region: config.aws.region,
      credentials: { accessKeyId: config.aws.accessKeyId, secretAccessKey: config.aws.secretAccessKey },
    });
    const res = await s3.send(new GetObjectCommand({ Bucket: config.aws.s3Bucket, Key: storedPath }));
    const chunks: Buffer[] = [];
    for await (const chunk of res.Body as AsyncIterable<Buffer>) chunks.push(chunk);
    fs.writeFileSync(tmpPath, Buffer.concat(chunks));

    return {
      localDocxPath: tmpPath,
      cleanup: () => { try { fs.unlinkSync(tmpPath); } catch {} },
    };
  }

  // Local disk
  const { getReportFilePath } = await import('../services/report.service');
  return {
    localDocxPath: getReportFilePath(storedPath),
    cleanup: () => {},
  };
}

export class ReportController {
  /**
   * POST /api/reports/generate/:companyId
   * Trigger report generation (async)
   */
  async generate(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const userId = (req as any).user?.userId;
      const year = req.body.year ? parseInt(req.body.year) : undefined;

      if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
      if (!companyId) { res.status(400).json({ error: 'ID de empresa requerido' }); return; }

      res.json({ message: 'Generando informe...', status: 'GENERATING' });
      generateReport(companyId, userId, year).catch(err => {
        console.error('[REPORT] Background generation failed:', err.message);
      });
    } catch (error) {
      console.error('[REPORT] Generate error:', error);
      res.status(500).json({ error: 'Error al iniciar la generación del informe' });
    }
  }

  /**
   * POST /api/reports/generate-sync/:companyId
   * Generate and wait for completion
   */
  async generateSync(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const userId = (req as any).user?.userId;
      const year = req.body.year ? parseInt(req.body.year) : undefined;

      if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }

      const reportId = await generateReport(companyId, userId, year);
      const report = await getReport(reportId);

      res.json({
        success: true,
        reportId,
        report: {
          id: report!.id,
          year: report!.year,
          status: report!.status,
          generatedAt: report!.generatedAt,
          pdfPath: report!.pdfPath,
          docxPath: report!.docxPath,
          hasDownloadCode: !!(report as any).downloadCode,
        },
      });
    } catch (error) {
      console.error('[REPORT] Generate sync error:', error);
      const message = error instanceof Error ? error.message : 'Error al generar el informe';
      res.status(500).json({ error: message });
    }
  }

  /**
   * GET /api/reports/company/:companyId
   * List all reports for a company
   */
  async getByCompany(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const reports = await getCompanyReports(companyId);
      res.json({ reports });
    } catch (error) {
      console.error('[REPORT] Get by company error:', error);
      res.status(500).json({ error: 'Error al obtener los informes' });
    }
  }

  /**
   * GET /api/reports/:id
   * Get a single report
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const report = await getReport(id);
      if (!report) { res.status(404).json({ error: 'Informe no encontrado' }); return; }
      res.json({ report });
    } catch (error) {
      console.error('[REPORT] Get by id error:', error);
      res.status(500).json({ error: 'Error al obtener el informe' });
    }
  }

  /**
   * POST /api/reports/:id/preview-token
   * Generate a 15-minute signed token to preview the analysis PDF (auth required)
   */
  async getPreviewToken(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const report = await getReport(id);

      if (!report) { res.status(404).json({ error: 'Informe no encontrado' }); return; }
      if (report.status !== 'COMPLETED') {
        res.status(400).json({ error: 'El informe aún no está listo' });
        return;
      }
      if (!report.docxPath) {
        res.status(404).json({ error: 'Archivo de análisis no disponible' });
        return;
      }

      const token = generatePreviewToken(id);
      res.json({ token, expiresIn: PREVIEW_TTL });
    } catch (error) {
      console.error('[REPORT] Preview token error:', error);
      res.status(500).json({ error: 'Error al generar el token de previsualización' });
    }
  }

  /**
   * GET /api/reports/preview/:token
   * Serve the analysis PDF inline (NO auth — token-based access, 15-min limit)
   */
  async previewServe(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      let reportId: string;
      try {
        ({ reportId } = verifyPreviewToken(token));
      } catch {
        res.status(401).json({ error: 'Token de previsualización inválido o expirado' });
        return;
      }

      const report = await getReport(reportId);
      if (!report || report.status !== 'COMPLETED' || !report.docxPath) {
        res.status(404).json({ error: 'Informe no disponible' });
        return;
      }

      const { localDocxPath, cleanup } = await resolveDocxLocally(report.docxPath);

      try {
        if (!fs.existsSync(localDocxPath)) {
          res.status(404).json({ error: 'Archivo no encontrado en servidor' });
          return;
        }

        const analysisPdfPath = await getAnalysisPdfFromLocal(localDocxPath);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="preview_analisis.pdf"');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.sendFile(analysisPdfPath, () => cleanup());
      } catch (err) {
        cleanup();
        throw err;
      }
    } catch (error) {
      console.error('[REPORT] Preview serve error:', error);
      res.status(500).json({ error: 'Error al servir la previsualización' });
    }
  }

  /**
   * POST /api/reports/:id/generate-code
   * Generate a download code, store it, send email to admin (auth required)
   */
  async generateCode(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const report = await getReport(id);

      if (!report) { res.status(404).json({ error: 'Informe no encontrado' }); return; }
      if (report.status !== 'COMPLETED') {
        res.status(400).json({ error: 'El informe aún no está completado' });
        return;
      }

      const code = generateDownloadCode();
      await setReportDownloadCode(id, code);

      const companyName = (report as any).company?.name || 'Empresa';
      const companyTaxId = (report as any).company?.taxId;

      // Send email to admin (fire and forget)
      sendAdminReportCodeEmail({
        companyName,
        companyTaxId,
        year: report.year,
        downloadCode: code,
        reportId: id,
      }).catch(err => console.error('[REPORT] Admin email error:', err.message));

      res.json({ success: true, message: 'Código generado. El administrador recibirá un correo con el código.' });
    } catch (error) {
      console.error('[REPORT] Generate code error:', error);
      res.status(500).json({ error: 'Error al generar el código de descarga' });
    }
  }

  /**
   * POST /api/reports/:id/validate-code
   * Validate a download code without downloading anything (used to unlock chat)
   */
  async validateCode(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const providedCode = ((req.body.code as string) || '').trim().toUpperCase();

      const report = await getReport(id);
      if (!report) { res.status(404).json({ error: 'Informe no encontrado' }); return; }

      const storedCode = (report as any).downloadCode as string | null;
      if (!storedCode) {
        res.status(400).json({ error: 'Este informe no tiene código de acceso' });
        return;
      }

      if (!providedCode || providedCode !== storedCode.toUpperCase()) {
        res.status(403).json({ error: 'Código incorrecto', requiresCode: true });
        return;
      }

      res.json({ valid: true });
    } catch (error) {
      console.error('[REPORT] Validate code error:', error);
      res.status(500).json({ error: 'Error al validar el código' });
    }
  }

  /**
   * GET /api/reports/:id/download/:format
   * Download PDF or DOCX — validates download code if one has been set
   */
  async download(req: Request, res: Response): Promise<void> {
    try {
      const { id, format } = req.params;

      if (!['pdf', 'docx'].includes(format)) {
        res.status(400).json({ error: 'Formato no válido. Use pdf o docx' });
        return;
      }

      const report = await getReport(id);
      if (!report) { res.status(404).json({ error: 'Informe no encontrado' }); return; }
      if (report.status !== 'COMPLETED') {
        res.status(400).json({ error: 'El informe aún no está listo', status: report.status });
        return;
      }

      // Check download code if one has been generated
      const storedCode = (report as any).downloadCode as string | null;
      if (storedCode) {
        const providedCode = (req.query.code as string || '').trim().toUpperCase();
        if (!providedCode || providedCode !== storedCode.toUpperCase()) {
          res.status(403).json({ error: 'Código de descarga incorrecto', requiresCode: true });
          return;
        }
      }

      const filename = format === 'pdf' ? report.pdfPath : report.docxPath;
      if (!filename) { res.status(404).json({ error: 'Archivo no disponible' }); return; }

      const companyName = (report as any).company?.name || 'empresa';
      const sanitizedName = companyName.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/ /g, '_');

      // ── S3 path (key contains '/') ──────────────────────────────────────────
      if (isS3Enabled() && filename.includes('/')) {
        if (format === 'docx') {
          // Narrative DOCX → download locally from S3, convert to PDF, send
          const { localDocxPath, cleanup } = await resolveDocxLocally(filename);
          try {
            const analysisPdfPath = await getAnalysisPdfFromLocal(localDocxPath);
            const downloadName = `TAXFIN_${sanitizedName}_${report.year}_analisis.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
            res.sendFile(analysisPdfPath, () => cleanup());
          } catch (err) {
            cleanup();
            throw err;
          }
        } else {
          // Tables PDF → stream directly from S3
          const downloadName = `TAXFIN_${sanitizedName}_${report.year}_tablas.pdf`;
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
          await streamS3ToResponse(filename, res);
        }
        return;
      }

      // ── Local disk path ─────────────────────────────────────────────────────
      const filePath = getReportFilePath(filename);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Archivo no encontrado en servidor' });
        return;
      }

      if (format === 'docx') {
        try {
          const analysisPdfPath = await getAnalysisPdfFromLocal(filePath);
          const downloadName = `TAXFIN_${sanitizedName}_${report.year}_analisis.pdf`;
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
          res.sendFile(analysisPdfPath);
        } catch (convErr) {
          console.error('[REPORT] DOCX→PDF conversion failed:', convErr);
          res.status(500).json({ error: 'Error al convertir el informe a PDF' });
        }
        return;
      }

      const downloadName = `TAXFIN_${sanitizedName}_${report.year}_tablas.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error('[REPORT] Download error:', error);
      res.status(500).json({ error: 'Error al descargar el archivo' });
    }
  }
}

export const reportController = new ReportController();
