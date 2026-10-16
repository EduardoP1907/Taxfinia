import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireEnabledCompany, companyResolvers } from '../middlewares/company-enabled.middleware';

const router = Router();

router.use(authMiddleware);

// Empresas deshabilitadas por el admin: 403 en cualquier ruta que las toque
router.param('companyId', requireEnabledCompany(companyResolvers.company));

router.post('/:companyId', chatController.chat.bind(chatController));

export default router;
