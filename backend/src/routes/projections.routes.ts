/**
 * Projections Routes
 * Rutas API para proyecciones financieras
 */

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as projectionsController from '../controllers/projections.controller';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Crear nuevo escenario de proyección
router.post('/', projectionsController.createProjectionScenario);

// Obtener todos los escenarios de una empresa
router.get('/company/:companyId', projectionsController.getCompanyScenarios);

// Actualizar una proyección específica (debe estar antes de /:scenarioId)
router.put('/projection/:projectionId', projectionsController.updateProjection);

// Aplicar tasas de crecimiento uniformes (simplificado)
router.post('/:scenarioId/apply-uniform-growth-rates', projectionsController.applyUniformGrowthRates);

// Aplicar tasas de crecimiento automáticas (Hoja 4.1)
router.post('/:scenarioId/apply-growth-rates', projectionsController.applyGrowthRates);

// Recalcular todas las métricas derivadas
router.post('/:scenarioId/recalculate', projectionsController.recalculateScenarioMetrics);

// Actualizar configuración del escenario (nombre, descripción)
router.put('/:scenarioId/config', projectionsController.updateScenarioConfig);

// ==================== RUTAS DCF (Hoja 4.3) ====================

// Estimar WACC con IA (basado en sector y país de la empresa)
router.post('/:scenarioId/estimate-wacc', projectionsController.estimateWACCWithAI);

// Actualizar parámetros DCF (WACC, tasa de crecimiento terminal, etc.)
router.put('/:scenarioId/dcf-parameters', projectionsController.updateDCFParameters);

// Calcular valoración DCF completa
router.post('/:scenarioId/calculate-dcf', projectionsController.calculateDCFValuation);

// Obtener resultados DCF
router.get('/:scenarioId/dcf-results', projectionsController.getDCFResults);

// ==================== RUTAS GENERALES (deben ir al final) ====================

// Obtener escenario específico con sus proyecciones
router.get('/:scenarioId', projectionsController.getProjectionScenario);

// Eliminar escenario
router.delete('/:scenarioId', projectionsController.deleteProjectionScenario);

export default router;
