import { Router } from 'express';
import { monthlyReportController } from '../controllers/monthly-report.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireEnabledCompany, companyResolvers } from '../middlewares/company-enabled.middleware';

const router = Router();

router.use(authMiddleware);

// Empresas deshabilitadas por el admin: 403 en cualquier ruta que las toque
router.param('companyId', requireEnabledCompany(companyResolvers.company));
router.param('id', requireEnabledCompany(companyResolvers.monthlyReport));

// async (202), client polls GET /company/:companyId
router.post('/generate/:companyId', monthlyReportController.generate.bind(monthlyReportController));
router.post('/generate-sync/:companyId', monthlyReportController.generateSync.bind(monthlyReportController));
router.get('/company/:companyId', monthlyReportController.getByCompany.bind(monthlyReportController));
router.post('/:id/generate-code', monthlyReportController.generateCode.bind(monthlyReportController));
router.post('/:id/validate-code', monthlyReportController.validateCode.bind(monthlyReportController));
router.get('/:id/download/:variant/:format', monthlyReportController.download.bind(monthlyReportController));
router.get('/:id', monthlyReportController.getById.bind(monthlyReportController));

export default router;
