const { Router } = require('express');
const categoriasController = require('../controllers/categorias.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { idParamSchema, crearCategoriaSchema, actualizarCategoriaSchema } = require('../validations/categorias.validation');

const router = Router();

router.get('/', categoriasController.listar);
router.get('/:id', validate(idParamSchema), categoriasController.obtenerPorId);

router.post('/', requireAuth, requireRole('ADMIN'), validate(crearCategoriaSchema), categoriasController.crear);
router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(actualizarCategoriaSchema),
  categoriasController.actualizar
);
router.delete('/:id', requireAuth, requireRole('ADMIN'), validate(idParamSchema), categoriasController.eliminar);

module.exports = router;
