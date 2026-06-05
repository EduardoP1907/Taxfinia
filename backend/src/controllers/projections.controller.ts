/**
 * Projections Controller
 * Maneja las peticiones HTTP para proyecciones financieras
 */

import { Request, Response } from 'express';
import { ProjectionsService } from '../services/projections.service';
import { bigIntToJSON } from '../utils/bigint';
import { estimateWACC, WACCFinancialContext } from '../services/ai-analysis.service';
import prisma from '../config/database';

const projectionsService = new ProjectionsService();

/**
 * Crear nuevo escenario de proyección
 * POST /api/projections
 */
export const createProjectionScenario = async (req: Request, res: Response) => {
  try {
    const { companyId, baseYear, projectionYears, name } = req.body;

    if (!companyId) {
      return res.status(400).json({
        error: 'companyId es requerido',
      });
    }

    const result = await projectionsService.createProjectionScenario(
      companyId,
      baseYear ? parseInt(baseYear) : undefined,
      projectionYears ? parseInt(projectionYears) : 10,
      name
    );

    res.status(201).json(bigIntToJSON(result));
  } catch (error: any) {
    console.error('[PROJECTIONS] Error creating scenario:', error);
    res.status(500).json({ error: error.message || 'Error al crear escenario de proyección' });
  }
};

/**
 * Obtener escenario con sus proyecciones
 * GET /api/projections/:scenarioId
 */
export const getProjectionScenario = async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;

    const scenario = await projectionsService.getProjectionScenario(scenarioId);

    res.json(bigIntToJSON(scenario));
  } catch (error: any) {
    console.error('[PROJECTIONS] Error getting scenario:', error);
    res.status(404).json({ error: error.message || 'Escenario no encontrado' });
  }
};

/**
 * Obtener todos los escenarios de una empresa
 * GET /api/projections/company/:companyId
 */
export const getCompanyScenarios = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    const scenarios = await projectionsService.getCompanyProjectionScenarios(companyId);

    res.json(bigIntToJSON(scenarios));
  } catch (error: any) {
    console.error('[PROJECTIONS] Error getting company scenarios:', error);
    res.status(500).json({ error: error.message || 'Error al obtener escenarios' });
  }
};

/**
 * Actualizar una proyección específica
 * PUT /api/projections/projection/:projectionId
 */
export const updateProjection = async (req: Request, res: Response) => {
  try {
    const { projectionId } = req.params;
    const data = req.body;

    const projection = await projectionsService.updateProjection(projectionId, data);

    res.json(bigIntToJSON(projection));
  } catch (error: any) {
    console.error('[PROJECTIONS] Error updating projection:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar proyección' });
  }
};

/**
 * Aplicar tasas de crecimiento uniformes a todas las proyecciones
 * POST /api/projections/:scenarioId/apply-uniform-growth-rates
 *
 * Body: Objeto con tasas uniformes (en porcentaje)
 * {
 *   revenue: 5,  // 5% anual
 *   costOfSales: 4,
 *   ...
 * }
 */
export const applyUniformGrowthRates = async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;
    const rates = req.body;

    const updated = await projectionsService.applyUniformGrowthRates(
      scenarioId,
      rates
    );

    res.json(bigIntToJSON(updated));
  } catch (error: any) {
    console.error('[PROJECTIONS] Error applying uniform growth rates:', error);
    res.status(500).json({ error: error.message || 'Error al aplicar tasas de crecimiento' });
  }
};

/**
 * Aplicar tasas de crecimiento a todas las proyecciones (Hoja 4.1)
 * POST /api/projections/:scenarioId/apply-growth-rates
 *
 * Body: Array de objetos con las tasas por año
 * [
 *   {
 *     year: 2025,
 *     revenueGrowthRate: 0.05,
 *     costOfSalesGrowthRate: 0.04,
 *     ...
 *   }
 * ]
 */
export const applyGrowthRates = async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;
    const { growthRatesByYear } = req.body;

    if (!Array.isArray(growthRatesByYear)) {
      return res.status(400).json({
        error: 'growthRatesByYear debe ser un array de objetos con year y tasas de crecimiento'
      });
    }

    const updated = await projectionsService.applyGrowthRatesToScenario(
      scenarioId,
      growthRatesByYear
    );

    res.json(bigIntToJSON(updated));
  } catch (error: any) {
    console.error('[PROJECTIONS] Error applying growth rates:', error);
    res.status(500).json({ error: error.message || 'Error al aplicar tasas de crecimiento' });
  }
};

/**
 * Recalcular todas las métricas derivadas de un escenario
 * POST /api/projections/:scenarioId/recalculate
 */
export const recalculateScenarioMetrics = async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;

    const updated = await projectionsService.recalculateScenarioMetrics(scenarioId);

    res.json(bigIntToJSON(updated));
  } catch (error: any) {
    console.error('[PROJECTIONS] Error recalculating metrics:', error);
    res.status(500).json({ error: error.message || 'Error al recalcular métricas' });
  }
};

/**
 * Actualizar configuración del escenario
 * PUT /api/projections/:scenarioId/config
 */
export const updateScenarioConfig = async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;
    const data = req.body;

    const updated = await projectionsService.updateScenarioConfig(scenarioId, data);

    res.json(bigIntToJSON(updated));
  } catch (error: any) {
    console.error('[PROJECTIONS] Error updating scenario config:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar configuración' });
  }
};

/**
 * Eliminar escenario de proyección
 * DELETE /api/projections/:scenarioId
 */
export const deleteProjectionScenario = async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;

    await projectionsService.deleteProjectionScenario(scenarioId);

    res.json({ success: true, message: 'Escenario eliminado correctamente' });
  } catch (error: any) {
    console.error('[PROJECTIONS] Error deleting scenario:', error);
    res.status(500).json({ error: error.message || 'Error al eliminar escenario' });
  }
};

// ==================== ENDPOINTS DCF (Hoja 4.3) ====================

/**
 * Actualizar parámetros DCF del escenario
 * PUT /api/projections/:scenarioId/dcf-parameters
 *
 * Body: {
 *   riskFreeRate: 0.025,        // 2.5%
 *   beta: 1.2,
 *   marketRiskPremium: 0.06,    // 6%
 *   costOfDebt: 0.04,           // 4%
 *   taxRateForWacc: 0.25,       // 25%
 *   terminalGrowthRate: 0.02,   // 2%
 *   netDebt: 1000000
 * }
 */
export const updateDCFParameters = async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;
    const params = req.body;

    const updated = await projectionsService.updateDCFParameters(scenarioId, params);

    res.json(bigIntToJSON(updated));
  } catch (error: any) {
    console.error('[PROJECTIONS] Error updating DCF parameters:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar parámetros DCF' });
  }
};

/**
 * Calcular la valoración DCF completa
 * POST /api/projections/:scenarioId/calculate-dcf
 *
 * Este endpoint calcula:
 * - Cost of Equity (Ke) usando CAPM
 * - WACC
 * - Valor Presente de cada FCF
 * - Valor Terminal
 * - Enterprise Value
 * - Equity Value
 * - Valor por Acción
 */
export const calculateDCFValuation = async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;

    const result = await projectionsService.calculateDCFValuation(scenarioId);

    res.json(bigIntToJSON(result));
  } catch (error: any) {
    console.error('[PROJECTIONS] Error calculating DCF valuation:', error);
    res.status(400).json({ error: error.message || 'Error al calcular valoración DCF' });
  }
};

/**
 * Obtener los resultados DCF de un escenario
 * GET /api/projections/:scenarioId/dcf-results
 *
 * Retorna todos los parámetros, cálculos intermedios y resultados finales
 */
export const getDCFResults = async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;

    const results = await projectionsService.getDCFResults(scenarioId);

    res.json(results);
  } catch (error: any) {
    console.error('[PROJECTIONS] Error getting DCF results:', error);
    res.status(404).json({ error: error.message || 'Resultados DCF no encontrados' });
  }
};

/**
 * Estimar WACC con IA basado en el sector y país de la empresa
 * POST /api/projections/:scenarioId/estimate-wacc
 *
 * Consulta a Claude para obtener un WACC de mercado ajustado al rubro y país,
 * lo guarda en el escenario y lo devuelve al cliente.
 */
/**
 * Shared helper: re-estima y guarda el WACC para un escenario dado.
 * Se puede llamar desde el HTTP handler o desde background tasks.
 * Devuelve el resultado completo de estimación.
 */
export async function refreshWaccForScenario(scenarioId: string): Promise<ReturnType<typeof estimateWACC>> {
  const scenario = await prisma.projectionScenario.findUnique({
    where: { id: scenarioId },
    include: { company: true },
  });

  if (!scenario) throw new Error('Escenario no encontrado');

  const { industry, country, currency, businessActivity, companySize } = scenario.company as any;
  if (!industry && !country) throw new Error('La empresa no tiene industria ni país configurados');

  const toNum = (v: any) => (v ? parseFloat(v.toString()) : 0);

  let financialContext: WACCFinancialContext | undefined;
  try {
    const latestFiscalYear = await prisma.fiscalYear.findFirst({
      where: { companyId: scenario.company.id, quarter: 0 },
      orderBy: { year: 'desc' },
      include: {
        balanceSheet: true,
        incomeStatement: true,
        calculatedRatios: true,
        additionalData: true,
      },
    });

    if (latestFiscalYear?.balanceSheet && latestFiscalYear?.incomeStatement) {
      const bs = latestFiscalYear.balanceSheet;
      const is = latestFiscalYear.incomeStatement;
      const ratios = latestFiscalYear.calculatedRatios;
      const ad = latestFiscalYear.additionalData;

      const revenue = toNum(is.revenue);
      const financialExpenses = toNum(is.financialExpenses);
      const totalDebt = toNum(bs.bankDebtLp) + toNum(bs.bankDebtSp);
      const totalEquity = toNum(bs.shareCapital) + toNum(bs.reserves) + toNum(bs.retainedEarnings) - toNum(bs.treasuryStock);
      const grossMargin = revenue - toNum(is.costOfSales) - toNum(is.staffCostsSales);
      const ebitda = grossMargin - toNum(is.adminExpenses) - toNum(is.staffCostsAdmin);
      const ebit = ebitda - toNum(is.depreciation) + toNum(is.exceptionalIncome) - toNum(is.exceptionalExpenses);
      const ebt = ebit + toNum(is.financialIncome) - financialExpenses;

      financialContext = {
        revenue,
        totalDebt,
        totalEquity,
        financialExpenses,
        ebt,
        incomeTax: toNum(is.incomeTax),
        ebitdaMargin: ratios?.ebitdaMargin ? parseFloat(ratios.ebitdaMargin.toString()) : null,
        debtToEquity: ratios?.debtToEquity ? parseFloat(ratios.debtToEquity.toString()) : null,
        employees: ad?.averageEmployees ?? (scenario.company as any).employees ?? null,
      };
    }
  } catch (ctxErr) {
    console.warn('[WACC-AI] No se pudieron obtener datos financieros reales:', ctxErr);
  }

  console.log(`[WACC-AI] Estimando WACC para sector="${industry}" país="${country}" tamaño="${companySize ?? 'no especificado'}" con datos financieros: ${financialContext ? 'sí' : 'no'}`);

  const estimate = await estimateWACC(industry, country, currency, businessActivity, financialContext, companySize);

  await prisma.projectionScenario.update({
    where: { id: scenarioId },
    data: {
      wacc: estimate.wacc,
      terminalGrowthRate: estimate.terminalGrowthRate,
    },
  });

  console.log(`[WACC-AI] WACC estimado: ${(estimate.wacc * 100).toFixed(2)}% — guardado en escenario ${scenarioId}`);

  return estimate;
}

export const estimateWACCWithAI = async (req: Request, res: Response) => {
  try {
    const { scenarioId } = req.params;

    const scenario = await prisma.projectionScenario.findUnique({
      where: { id: scenarioId },
      include: { company: true },
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Escenario no encontrado' });
    }

    const { industry, country } = scenario.company as any;

    if (!industry && !country) {
      return res.status(400).json({
        error: 'La empresa debe tener al menos Sector/Industria o País configurado para estimar el WACC con IA.',
      });
    }

    const estimate = await refreshWaccForScenario(scenarioId);

    res.json({ ...estimate, savedToScenario: true });
  } catch (error: any) {
    console.error('[PROJECTIONS] Error estimating WACC with AI:', error);
    res.status(500).json({ error: error.message || 'Error al estimar WACC con IA' });
  }
};
