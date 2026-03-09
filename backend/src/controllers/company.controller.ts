import { Request, Response } from 'express';
import { companyService } from '../services/company.service';
import { validationResult } from 'express-validator';

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

      const company = await companyService.updateCompany(id, userId, updateData);

      res.status(200).json({
        success: true,
        message: 'Empresa actualizada exitosamente',
        data: company,
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
}

export const companyController = new CompanyController();
