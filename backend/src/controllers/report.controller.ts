import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import {
  generateReport,
  getCompanyReports,
  getReport,
  getReportFilePath,
} from '../services/report.service';

export class ReportController {
  /**
   * POST /api/reports/generate/:companyId
   * Trigger report generation for a company
   */
  async generate(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const userId = (req as any).user?.userId;
      const year = req.body.year ? parseInt(req.body.year) : undefined;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

      if (!companyId) {
        res.status(400).json({ error: 'ID de empresa requerido' });
        return;
      }

      // Respond immediately, generation runs async
      res.json({ message: 'Generando informe...', status: 'GENERATING' });

      // Generate in background (non-blocking response already sent)
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
   * Generate and wait for completion (for frontend that needs to know when it's done)
   */
  async generateSync(req: Request, res: Response): Promise<void> {
    try {
      const { companyId } = req.params;
      const userId = (req as any).user?.userId;
      const year = req.body.year ? parseInt(req.body.year) : undefined;

      if (!userId) {
        res.status(401).json({ error: 'No autorizado' });
        return;
      }

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
   * Get a single report details
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const report = await getReport(id);
      if (!report) {
        res.status(404).json({ error: 'Informe no encontrado' });
        return;
      }
      res.json({ report });
    } catch (error) {
      console.error('[REPORT] Get by id error:', error);
      res.status(500).json({ error: 'Error al obtener el informe' });
    }
  }

  /**
   * GET /api/reports/:id/download/:format
   * Download PDF or DOCX
   */
  async download(req: Request, res: Response): Promise<void> {
    try {
      const { id, format } = req.params;

      if (!['pdf', 'docx'].includes(format)) {
        res.status(400).json({ error: 'Formato no válido. Use pdf o docx' });
        return;
      }

      const report = await getReport(id);
      if (!report) {
        res.status(404).json({ error: 'Informe no encontrado' });
        return;
      }

      if (report.status !== 'COMPLETED') {
        res.status(400).json({ error: 'El informe aún no está listo', status: report.status });
        return;
      }

      const filename = format === 'pdf' ? report.pdfPath : report.docxPath;
      if (!filename) {
        res.status(404).json({ error: 'Archivo no disponible' });
        return;
      }

      const filePath = getReportFilePath(filename);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Archivo no encontrado en servidor' });
        return;
      }

      const companyName = (report as any).company?.name || 'empresa';
      const sanitizedName = companyName.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/ /g, '_');
      const downloadName = `TAXFIN_${sanitizedName}_${report.year}.${format}`;

      const mimeType = format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      res.sendFile(filePath);

    } catch (error) {
      console.error('[REPORT] Download error:', error);
      res.status(500).json({ error: 'Error al descargar el archivo' });
    }
  }
}

export const reportController = new ReportController();
