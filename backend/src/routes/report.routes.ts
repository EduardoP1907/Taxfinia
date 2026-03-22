import { Router } from 'express';
import { reportController } from '../controllers/report.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// ─── Public (token-based) — NO auth required ─────────────────────────────────
// Must be declared BEFORE authMiddleware so they are accessible without JWT
router.get('/preview/:token', reportController.previewServe.bind(reportController));

// ─── Protected routes ─────────────────────────────────────────────────────────
router.use(authMiddleware);

// Generate report (sync - waits for completion)
router.post('/generate-sync/:companyId', reportController.generateSync.bind(reportController));

// Generate report (async - returns immediately)
router.post('/generate/:companyId', reportController.generate.bind(reportController));

// List reports for a company
router.get('/company/:companyId', reportController.getByCompany.bind(reportController));

// Generate a 15-min preview token for the analysis PDF
router.post('/:id/preview-token', reportController.getPreviewToken.bind(reportController));

// Generate download code + send admin email
router.post('/:id/generate-code', reportController.generateCode.bind(reportController));

// Validate download code (used to unlock chat without downloading)
router.post('/:id/validate-code', reportController.validateCode.bind(reportController));

// Download PDF or DOCX (validates download code if set)
router.get('/:id/download/:format', reportController.download.bind(reportController));

// Get single report
router.get('/:id', reportController.getById.bind(reportController));

export default router;
