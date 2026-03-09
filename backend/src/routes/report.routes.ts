import { Router } from 'express';
import { reportController } from '../controllers/report.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Generate report (sync - waits for completion)
router.post('/generate-sync/:companyId', reportController.generateSync.bind(reportController));

// Generate report (async - returns immediately)
router.post('/generate/:companyId', reportController.generate.bind(reportController));

// List reports for a company
router.get('/company/:companyId', reportController.getByCompany.bind(reportController));

// Get single report
router.get('/:id', reportController.getById.bind(reportController));

// Download PDF or DOCX
router.get('/:id/download/:format', reportController.download.bind(reportController));

export default router;
