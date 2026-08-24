import { Router } from 'express';
import { monthlyReportController } from '../controllers/monthly-report.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/generate-sync/:companyId', monthlyReportController.generateSync.bind(monthlyReportController));
router.get('/company/:companyId', monthlyReportController.getByCompany.bind(monthlyReportController));
router.post('/:id/generate-code', monthlyReportController.generateCode.bind(monthlyReportController));
router.post('/:id/validate-code', monthlyReportController.validateCode.bind(monthlyReportController));
router.get('/:id/download/:variant/:format', monthlyReportController.download.bind(monthlyReportController));
router.get('/:id', monthlyReportController.getById.bind(monthlyReportController));

export default router;
