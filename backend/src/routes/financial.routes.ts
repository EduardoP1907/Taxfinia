import { Router } from 'express';
import multer from 'multer';
import { financialController } from '../controllers/financial.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { companyLockMiddleware } from '../middlewares/company-lock.middleware';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// ============= FISCAL YEARS =============
router.get('/companies/:companyId/fiscal-years', financialController.getFiscalYears);
router.post('/companies/:companyId/fiscal-years', companyLockMiddleware, financialController.createFiscalYear);

// ============= BALANCE SHEET =============
router.get('/fiscal-years/:fiscalYearId/balance-sheet', financialController.getBalanceSheet);
router.post('/fiscal-years/:fiscalYearId/balance-sheet', companyLockMiddleware, financialController.upsertBalanceSheet);

// ============= INCOME STATEMENT =============
router.get('/fiscal-years/:fiscalYearId/income-statement', financialController.getIncomeStatement);
router.post('/fiscal-years/:fiscalYearId/income-statement', companyLockMiddleware, financialController.upsertIncomeStatement);

// ============= CASH FLOW =============
router.get('/fiscal-years/:fiscalYearId/cash-flow', financialController.getCashFlow);
router.post('/fiscal-years/:fiscalYearId/cash-flow', companyLockMiddleware, financialController.upsertCashFlow);

// ============= ADDITIONAL DATA =============
router.get('/fiscal-years/:fiscalYearId/additional-data', financialController.getAdditionalData);
router.post('/fiscal-years/:fiscalYearId/additional-data', companyLockMiddleware, financialController.upsertAdditionalData);

// ============= SUMMARY =============
router.get('/fiscal-years/:fiscalYearId/summary', financialController.getFiscalYearSummary);

// ============= IMPORT / TEMPLATE =============
router.get('/import-template', financialController.downloadTemplate);
router.post('/import/:companyId', companyLockMiddleware, upload.single('file'), financialController.importData);

export default router;
