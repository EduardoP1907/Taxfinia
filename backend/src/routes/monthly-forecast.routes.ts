import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { monthlyForecastController } from '../controllers/monthly-forecast.controller';

const router = Router();

router.use(authMiddleware);

router.get('/:companyId/:year', monthlyForecastController.get);
router.put('/:companyId/:year', monthlyForecastController.save);
router.get('/:companyId/:year/calculate', monthlyForecastController.calculate);

export default router;
