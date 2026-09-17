const { Router } = require('express');
const productosController = require('../controllers/productos.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const {
  idParamSchema,
  listarProductosSchema,
  crearProductoSchema,
  actualizarProductoSchema,
  listarComponentesSchema,
  crearComponenteSchema,
  actualizarComponenteSchema,
  crearTraduccionSchema,
  actualizarTraduccionSchema,
  idTraduccionParamSchema,
} = require('../validations/productos.validation');

const router = Router();

// IMPORTANTE: las rutas estaticas ("/componentes", "/traducciones/:idTraduccion") van
// antes que "/:id" para que Express no las interprete como el parametro dinamico.

router.get('/componentes', validate(listarComponentesSchema), productosController.listarComponentes);
router.post(
  '/componentes',
  requireAuth,
  requireRole('ADMIN'),
  validate(crearComponenteSchema),
  productosController.crearComponente
);
router.put(
  '/componentes/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(actualizarComponenteSchema),
  productosController.actualizarComponente
);
router.delete(
  '/componentes/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(idParamSchema),
  productosController.eliminarComponente
);

router.put(
  '/traducciones/:idTraduccion',
  requireAuth,
  requireRole('ADMIN'),
  validate(actualizarTraduccionSchema),
  productosController.actualizarTraduccion
);
router.delete(
  '/traducciones/:idTraduccion',
  requireAuth,
  requireRole('ADMIN'),
  validate(idTraduccionParamSchema),
  productosController.eliminarTraduccion
);

router.get('/', validate(listarProductosSchema), productosController.listar);
router.post('/', requireAuth, requireRole('ADMIN'), validate(crearProductoSchema), productosController.crear);

router.get('/:id', validate(idParamSchema), productosController.obtenerPorId);
router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(actualizarProductoSchema),
  productosController.actualizar
);
router.delete('/:id', requireAuth, requireRole('ADMIN'), validate(idParamSchema), productosController.eliminar);

router.get('/:id/traducciones', validate(idParamSchema), productosController.listarTraducciones);
router.post(
  '/:id/traducciones',
  requireAuth,
  requireRole('ADMIN'),
  validate(crearTraduccionSchema),
  productosController.crearTraduccion
);

module.exports = router;
