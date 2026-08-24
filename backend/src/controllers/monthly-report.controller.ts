import { Request, Response } from 'express';
import fs from 'fs';
import crypto from 'crypto';
import {
  generateMonthlyReport, getCompanyMonthlyReports, getMonthlyReport,
  getMonthlyReportFilePath, setMonthlyReportDownloadCode, convertDocxToPdf,
} from '../services/monthly-report.service';
import { sendAdminReportCodeEmail } from '../utils/email';
import { isS3Enabled } from '../utils/s3';

type Variant = 'prometheia' | 'ejecutivo';

function generateDownloadCode(): string {
  const part = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `PROMETHEIA-${part()}-${part()}`;
}

async function resolveDocxLocally(storedPath: string): Promise<{ localDocxPath: string; cleanup: () => void }> {
  if (isS3Enabled() && storedPath.includes('/')) {
    const { GetObjectCommand, S3Client } = await import('@aws-sdk/client-s3');
    const { config } = await import('../config/env');
    const path = await import('path');
    const os = await import('os');
    const tmpPath = path.join(os.tmpdir(), path.basename(storedPath));

    const s3 = new S3Client({
      region: config.aws.region,
      credentials: { accessKeyId: config.aws.accessKeyId, secretAccessKey: config.aws.secretAccessKey },
    });
    const res = await s3.send(new GetObjectCommand({ Bucket: config.aws.s3Bucket, Key: storedPath }));
    const chunks: Buffer[] = [];
    for await (const chunk of res.Body as AsyncIterable<Buffer>) chunks.push(chunk);
    fs.writeFileSync(tmpPath, Buffer.concat(chunks));

    return { localDocxPath: tmpPath, cleanup: () => { try { fs.unlinkSync(tmpPath); } catch {} } };
  }
  return { localDocxPath: getMonthlyReportFilePath(storedPath), cleanup: () => {} };
}

export class MonthlyReportController {
  /**
   * POST /api/monthly-reports/generate-sync/:companyId
   * body: { year: number }
   */
  async generateSync(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const userId = (req as any).user?.userId;
      const year = req.body.year ? parseInt(req.body.year) : new Date().getFullYear();

      if (!userId) { res.status(401).json({ error: 'No autorizado' }); return; }
      if (!companyId) { res.status(400).json({ error: 'ID de empresa requerido' }); return; }

      const reportId = await generateMonthlyReport(companyId, userId, year);
      const report = await getMonthlyReport(reportId);

      res.json({
        success: true,
        reportId,
        report: {
          id: report!.id,
          year: report!.year,
          status: report!.status,
          generatedAt: report!.generatedAt,
          docxPathPrometheia: report!.docxPathPrometheia,
          docxPathEjecutivo: report!.docxPathEjecutivo,
          hasDownloadCode: !!report!.downloadCode,
        },
      });
    } catch (error) {
      console.error('[MONTHLY-REPORT] Generate sync error:', error);
      const message = error instanceof Error ? error.message : 'Error al generar el informe mensual';
      res.status(500).json({ error: message });
    }
  }

  /** GET /api/monthly-reports/company/:companyId */
  async getByCompany(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const reports = await getCompanyMonthlyReports(companyId);
      res.json({ reports });
    } catch (error) {
      console.error('[MONTHLY-REPORT] Get by company error:', error);
      res.status(500).json({ error: 'Error al obtener los informes mensuales' });
    }
  }

  /** GET /api/monthly-reports/:id */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const report = await getMonthlyReport(id);
      if (!report) { res.status(404).json({ error: 'Informe no encontrado' }); return; }
      res.json({ report });
    } catch (error) {
      console.error('[MONTHLY-REPORT] Get by id error:', error);
      res.status(500).json({ error: 'Error al obtener el informe' });
    }
  }

  /** POST /api/monthly-reports/:id/generate-code */
  async generateCode(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const report = await getMonthlyReport(id);
      if (!report) { res.status(404).json({ error: 'Informe no encontrado' }); return; }
      if (report.status !== 'COMPLETED') {
        res.status(400).json({ error: 'El informe aún no está completado' });
        return;
      }

      const code = generateDownloadCode();
      await setMonthlyReportDownloadCode(id, code);

      const companyName = (report as any).company?.name || 'Empresa';
      const companyTaxId = (report as any).company?.taxId;

      sendAdminReportCodeEmail({
        companyName, companyTaxId, year: report.year, downloadCode: code, reportId: id,
      }).catch(err => console.error('[MONTHLY-REPORT] Admin email error:', err.message));

      res.json({ success: true, message: 'Código generado. El administrador recibirá un correo con el código.' });
    } catch (error) {
      console.error('[MONTHLY-REPORT] Generate code error:', error);
      res.status(500).json({ error: 'Error al generar el código de descarga' });
    }
  }

  /** POST /api/monthly-reports/:id/validate-code */
  async validateCode(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const providedCode = ((req.body.code as string) || '').trim().toUpperCase();

      const report = await getMonthlyReport(id);
      if (!report) { res.status(404).json({ error: 'Informe no encontrado' }); return; }

      const storedCode = report.downloadCode;
      if (!storedCode) { res.status(400).json({ error: 'Este informe no tiene código de acceso' }); return; }

      if (!providedCode || providedCode !== storedCode.toUpperCase()) {
        res.status(403).json({ error: 'Código incorrecto', requiresCode: true });
        return;
      }

      res.json({ valid: true });
    } catch (error) {
      console.error('[MONTHLY-REPORT] Validate code error:', error);
      res.status(500).json({ error: 'Error al validar el código' });
    }
  }

  /**
   * GET /api/monthly-reports/:id/download/:variant/:format
   * variant: prometheia | ejecutivo — format: pdf | docx
   */
  async download(req: Request, res: Response): Promise<void> {
    try {
      const { id, format } = req.params;
      const variant = req.params.variant as Variant;
      const code = (req.query.code as string) || '';

      if (!['prometheia', 'ejecutivo'].includes(variant)) {
        res.status(400).json({ error: 'Variante no válida. Use prometheia o ejecutivo' });
        return;
      }
      if (!['pdf', 'docx'].includes(format)) {
        res.status(400).json({ error: 'Formato no válido. Use pdf o docx' });
        return;
      }

      const report = await getMonthlyReport(id);
      if (!report) { res.status(404).json({ error: 'Informe no encontrado' }); return; }
      if (report.status !== 'COMPLETED') {
        res.status(400).json({ error: 'El informe aún no está listo', status: report.status });
        return;
      }

      const storedCode = report.downloadCode;
      if (storedCode && storedCode.toUpperCase() !== code.trim().toUpperCase()) {
        res.status(403).json({ error: 'Código de descarga requerido', requiresCode: true });
        return;
      }

      const filename = variant === 'prometheia' ? report.docxPathPrometheia : report.docxPathEjecutivo;
      if (!filename) { res.status(404).json({ error: 'Archivo no disponible' }); return; }

      const companyName = (report as any).company?.name || 'empresa';
      const sanitizedName = companyName.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/ /g, '_');
      const downloadName = `TAXFIN_${sanitizedName}_${report.year}_forecast_${variant}.${format}`;

      if (format === 'docx') {
        if (isS3Enabled() && filename.includes('/')) {
          const { localDocxPath, cleanup } = await resolveDocxLocally(filename);
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
          res.sendFile(localDocxPath, () => cleanup());
          return;
        }
        const filePath = getMonthlyReportFilePath(filename);
        if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'Archivo no encontrado en servidor' }); return; }
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
        res.sendFile(filePath);
        return;
      }

      // format === 'pdf' — convert DOCX to PDF on the fly
      const { localDocxPath, cleanup } = await resolveDocxLocally(filename);
      try {
        if (!fs.existsSync(localDocxPath)) { res.status(404).json({ error: 'Archivo no encontrado en servidor' }); return; }
        const pdfPath = localDocxPath.replace(/\.docx$/i, '.pdf');
        if (!fs.existsSync(pdfPath)) await convertDocxToPdf(localDocxPath, pdfPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
        res.sendFile(pdfPath, () => cleanup());
      } catch (err) {
        cleanup();
        throw err;
      }
    } catch (error) {
      console.error('[MONTHLY-REPORT] Download error:', error);
      res.status(500).json({ error: 'Error al descargar el archivo' });
    }
  }
}

export const monthlyReportController = new MonthlyReportController();
