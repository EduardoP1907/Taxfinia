import { Router } from 'express';
import { RatiosController } from '../controllers/ratios.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const controller = new RatiosController();

// All routes require authentication
router.use(authMiddleware);

// Calculate ratios for a fiscal year
router.post('/calculate/:fiscalYearId', controller.calculateRatios);

// Get calculated ratios for a fiscal year
router.get('/:fiscalYearId', controller.getRatios);

// Calculate ratios for all years of a company
router.post('/calculate-company/:companyId', controller.calculateCompanyRatios);

// Get complete financial analysis for a company
router.get('/company-analysis/:companyId', controller.getCompanyAnalysis);

export default router;
