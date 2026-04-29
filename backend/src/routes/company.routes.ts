import { Router } from 'express';
import { body } from 'express-validator';
import { companyController } from '../controllers/company.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Validaciones
const createCompanyValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('El nombre de la empresa es requerido')
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre debe tener entre 2 y 255 caracteres'),
  body('taxId')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El NIF/CIF no puede exceder 50 caracteres'),
  body('industry')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La industria no puede exceder 100 caracteres'),
  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('El código de país debe ser de 2 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La descripción no puede exceder 2000 caracteres'),
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('El sitio web debe ser una URL válida'),
  body('employees')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El número de empleados debe ser un número positivo'),
  body('foundedYear')
    .optional()
    .isInt({ min: 1800, max: new Date().getFullYear() })
    .withMessage('El año de fundación no es válido'),
  body('baseYear')
    .notEmpty()
    .withMessage('El año base es requerido')
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('El año base no es válido'),
  body('currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('La moneda debe ser un código de 3 letras (ej: EUR, USD)'),
];

const updateCompanyValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('El nombre debe tener entre 2 y 255 caracteres'),
  body('taxId')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El NIF/CIF no puede exceder 50 caracteres'),
  body('industry')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La industria no puede exceder 100 caracteres'),
  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('El código de país debe ser de 2 caracteres'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La descripción no puede exceder 2000 caracteres'),
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('El sitio web debe ser una URL válida'),
  body('employees')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El número de empleados debe ser un número positivo'),
  body('foundedYear')
    .optional()
    .isInt({ min: 1800, max: new Date().getFullYear() })
    .withMessage('El año de fundación no es válido'),
  body('baseYear')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('El año base no es válido'),
  body('currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('La moneda debe ser un código de 3 letras (ej: EUR, USD)'),
];

// Rutas
router.get('/stats', companyController.getDashboardStats.bind(companyController));
router.post('/', createCompanyValidation, companyController.createCompany);
router.get('/', companyController.getCompanies);
router.get('/:id', companyController.getCompanyById);
router.put('/:id', updateCompanyValidation, companyController.updateCompany);
router.delete('/:id', companyController.deleteCompany);
router.get('/:id/summary', companyController.getCompanySummary);

export default router;
