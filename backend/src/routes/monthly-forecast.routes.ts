import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { monthlyForecastController } from '../controllers/monthly-forecast.controller';
import { requireEnabledCompany, companyResolvers } from '../middlewares/company-enabled.middleware';

const router = Router();

router.use(authMiddleware);

// Empresas deshabilitadas por el admin: 403 en cualquier ruta que las toque
router.param('companyId', requireEnabledCompany(companyResolvers.company));

router.get('/:companyId/:year', monthlyForecastController.get);
router.put('/:companyId/:year', monthlyForecastController.save);
router.get('/:companyId/:year/calculate', monthlyForecastController.calculate);

export default router;
