import { Request, Response } from 'express';
import { companyService, unlockCompany, getAllCompaniesAdmin } from '../services/company.service';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { refreshWaccForScenario } from './projections.controller';

export class CompanyController {
  async createCompany(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user!.userId;
      const companyData = req.body;

      const company = await companyService.createCompany(userId, companyData);

      res.status(201).json({
        success: true,
        message: 'Empresa creada exitosamente',
        data: company,
      });
    } catch (error: any) {
      console.error('Error creating company:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al crear la empresa',
      });
    }
  }

  async getCompanies(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      const companies = await companyService.getCompanies(userId);

      res.status(200).json({
        success: true,
        data: companies,
      });
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener las empresas',
      });
    }
  }

  async getCompanyById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const company = await companyService.getCompanyById(id, userId);

      if (!company) {
        res.status(404).json({
          success: false,
          message: 'Empresa no encontrada',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: company,
      });
    } catch (error: any) {
      console.error('Error fetching company:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener la empresa',
      });
    }
  }

  async updateCompany(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const userId = req.user!.userId;
      const { id } = req.params;
      const updateData = req.body;

      // Leer valores actuales para detectar cambios relevantes para el WACC
      const before = await prisma.company.findFirst({
        where: { id, userId, deletedAt: null },
        select: { industry: true, companySize: true },
      });

      const company = await companyService.updateCompany(id, userId, updateData);

      // Re-estimar WACC si cambió industria o tamaño (sincrónico — antes de responder)
      const industryChanged = before?.industry !== (updateData.industry ?? before?.industry);
      const sizeChanged = before?.companySize !== (updateData.companySize ?? before?.companySize);

      if (industryChanged || sizeChanged) {
        const scenarios = await prisma.projectionScenario.findMany({
          where: { companyId: id },
          select: { id: true },
        });

        if (scenarios.length > 0) {
          console.log(`[WACC-AUTO] Industria/tamaño cambiados en empresa ${id} — re-estimando WACC para ${scenarios.length} escenario(s)`);
          const results = await Promise.allSettled(scenarios.map((s) => refreshWaccForScenario(s.id)));
          const failed = results.filter((r) => r.status === 'rejected');
          if (failed.length > 0) console.error('[WACC-AUTO] Errores en re-estimación:', failed);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Empresa actualizada exitosamente',
        data: company,
        waccRefreshed: (industryChanged || sizeChanged),
      });
    } catch (error: any) {
      console.error('Error updating company:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al actualizar la empresa',
      });
    }
  }

  async deleteCompany(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await companyService.deleteCompany(id, userId);

      res.status(200).json({
        success: true,
        message: 'Empresa eliminada exitosamente',
      });
    } catch (error: any) {
      console.error('Error deleting company:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al eliminar la empresa',
      });
    }
  }

  async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const stats = await companyService.getDashboardStats(userId);
      res.status(200).json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Error al obtener estadísticas' });
    }
  }

  async getCompanySummary(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const summary = await companyService.getCompanySummary(id, userId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error('Error fetching company summary:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener el resumen de la empresa',
      });
    }
  }

  // Admin: unlock company
  async unlockCompany(req: Request, res: Response): Promise<void> {
    try {
      if (req.user!.role !== 'ADMIN') {
        res.status(403).json({ success: false, message: 'Acceso denegado' });
        return;
      }
      await unlockCompany(req.params.id);
      res.json({ success: true, message: 'Empresa desbloqueada' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Error al desbloquear la empresa' });
    }
  }

  // Admin: list all companies
  async getAllCompaniesAdmin(req: Request, res: Response): Promise<void> {
    try {
      if (req.user!.role !== 'ADMIN') {
        res.status(403).json({ success: false, message: 'Acceso denegado' });
        return;
      }
      const companies = await getAllCompaniesAdmin();
      res.json({ success: true, data: companies });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Error al obtener empresas' });
    }
  }
}

export const companyController = new CompanyController();
