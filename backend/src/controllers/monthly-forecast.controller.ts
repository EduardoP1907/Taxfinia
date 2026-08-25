import { Request, Response } from 'express';
import { monthlyForecastService } from '../services/monthly-forecast.service';

export const monthlyForecastController = {
  // GET /api/monthly-forecast/:companyId/:year
  async get(req: Request, res: Response) {
    try {
      const { companyId, year } = req.params;
      const stored = await monthlyForecastService.getOrInit(companyId, parseInt(year));
      res.json({ success: true, data: stored });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Error al obtener forecast mensual' });
    }
  },

  // PUT /api/monthly-forecast/:companyId/:year
  async save(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { companyId, year } = req.params;

      // Verify ownership
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const company = await prisma.company.findFirst({
        where: { id: companyId, userId, deletedAt: null },
      });
      if (!company) return res.status(404).json({ success: false, error: 'Empresa no encontrada' });

      const record = await monthlyForecastService.save(companyId, parseInt(year), req.body);
      res.json({ success: true, data: record });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || 'Error al guardar forecast mensual' });
    }
  },

  // GET /api/monthly-forecast/:companyId/:year/calculate?mode=budget
  async calculate(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const { companyId, year } = req.params;
      const mode = req.query.mode === 'budget' ? 'budget' : 'forecast';

      const result = await monthlyForecastService.calculate(companyId, userId, parseInt(year), { mode });
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error calculating monthly forecast:', error);
      res.status(400).json({ success: false, error: error.message || 'Error al calcular forecast mensual' });
    }
  },
};
