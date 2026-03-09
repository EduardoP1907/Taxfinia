import { Router } from 'express';
import { financialController } from '../controllers/financial.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// ============= FISCAL YEARS =============
// GET /api/financial/companies/:companyId/fiscal-years
router.get('/companies/:companyId/fiscal-years', financialController.getFiscalYears);

// POST /api/financial/companies/:companyId/fiscal-years
router.post('/companies/:companyId/fiscal-years', financialController.createFiscalYear);

// ============= BALANCE SHEET =============
// GET /api/financial/fiscal-years/:fiscalYearId/balance-sheet
router.get('/fiscal-years/:fiscalYearId/balance-sheet', financialController.getBalanceSheet);

// POST /api/financial/fiscal-years/:fiscalYearId/balance-sheet
router.post('/fiscal-years/:fiscalYearId/balance-sheet', financialController.upsertBalanceSheet);

// ============= INCOME STATEMENT =============
// GET /api/financial/fiscal-years/:fiscalYearId/income-statement
router.get('/fiscal-years/:fiscalYearId/income-statement', financialController.getIncomeStatement);

// POST /api/financial/fiscal-years/:fiscalYearId/income-statement
router.post('/fiscal-years/:fiscalYearId/income-statement', financialController.upsertIncomeStatement);

// ============= CASH FLOW =============
// GET /api/financial/fiscal-years/:fiscalYearId/cash-flow
router.get('/fiscal-years/:fiscalYearId/cash-flow', financialController.getCashFlow);

// POST /api/financial/fiscal-years/:fiscalYearId/cash-flow
router.post('/fiscal-years/:fiscalYearId/cash-flow', financialController.upsertCashFlow);

// ============= ADDITIONAL DATA =============
// GET /api/financial/fiscal-years/:fiscalYearId/additional-data
router.get('/fiscal-years/:fiscalYearId/additional-data', financialController.getAdditionalData);

// POST /api/financial/fiscal-years/:fiscalYearId/additional-data
router.post('/fiscal-years/:fiscalYearId/additional-data', financialController.upsertAdditionalData);

// ============= SUMMARY =============
// GET /api/financial/fiscal-years/:fiscalYearId/summary
router.get('/fiscal-years/:fiscalYearId/summary', financialController.getFiscalYearSummary);

export default router;
