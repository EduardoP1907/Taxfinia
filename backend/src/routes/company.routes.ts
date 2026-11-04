import { Router, type RequestHandler } from 'express';
import multer from 'multer';
import { body } from 'express-validator';
import { companyController } from '../controllers/company.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireEnabledCompany, companyResolvers } from '../middlewares/company-enabled.middleware';

// Mismo límite que MAX_DEED_SIZE en frontend/src/components/companies/CompanyFormModal.tsx
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Empresas deshabilitadas por el admin: 403 en cualquier ruta que las toque
router.param('id', requireEnabledCompany(companyResolvers.company));

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
router.get('/admin/all', companyController.getAllCompaniesAdmin.bind(companyController));
router.post('/', createCompanyValidation, companyController.createCompany);
router.get('/', companyController.getCompanies);
router.get('/:id', companyController.getCompanyById);
router.put('/:id', updateCompanyValidation, companyController.updateCompany);
router.delete('/:id', companyController.deleteCompany);
router.get('/:id/summary', companyController.getCompanySummary);
router.post('/:id/unlock', companyController.unlockCompany.bind(companyController));
// Los errores de multer (p. ej. archivo > 50 MB) no llegan al controlador:
// sin este wrapper caían al manejador global, que en producción responde sin
// mensaje y el usuario solo veía "Error al cargar el documento de escritura".
const uploadDeedFile: RequestHandler = (req, res, next) => {
  upload.single('file')(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const tooLarge = err.code === 'LIMIT_FILE_SIZE';
      res.status(tooLarge ? 413 : 400).json({
        success: false,
        message: tooLarge
          ? 'El archivo supera el tamaño máximo de 50 MB'
          : 'No se pudo procesar el archivo enviado',
      });
      return;
    }
    next(err);
  });
};

router.post('/:id/deed-document', uploadDeedFile, companyController.uploadDeedDocument.bind(companyController));
router.delete('/:id/deed-document', companyController.deleteDeedDocument.bind(companyController));

export default router;
