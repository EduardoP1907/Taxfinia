import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { comparisonReportController } from '../controllers/comparison-report.controller';

const router = Router();

router.use(authMiddleware);

// GET /api/comparison-reports/:companyId/eligibility?type=FORECAST_VS_ANNUAL|FORECAST_BUDGET_VS_ANNUAL
router.get('/:companyId/eligibility', comparisonReportController.eligibility.bind(comparisonReportController));

// POST /api/comparison-reports/generate-sync/:companyId   body: { type }
router.post('/generate-sync/:companyId', comparisonReportController.generateSync.bind(comparisonReportController));

// GET /api/comparison-reports/company/:companyId
router.get('/company/:companyId', comparisonReportController.getByCompany.bind(comparisonReportController));

// POST /api/comparison-reports/:id/generate-code
router.post('/:id/generate-code', comparisonReportController.generateCode.bind(comparisonReportController));

// POST /api/comparison-reports/:id/validate-code
router.post('/:id/validate-code', comparisonReportController.validateCode.bind(comparisonReportController));

// GET /api/comparison-reports/:id/download/:format   format: pdf | docx
router.get('/:id/download/:format', comparisonReportController.download.bind(comparisonReportController));

// GET /api/comparison-reports/:id
router.get('/:id', comparisonReportController.getById.bind(comparisonReportController));

export default router;
