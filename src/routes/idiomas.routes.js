const { Router } = require('express');
const idiomasController = require('../controllers/idiomas.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { idParamSchema, crearIdiomaSchema, actualizarIdiomaSchema } = require('../validations/idiomas.validation');

const router = Router();

router.get('/', idiomasController.listar);
router.post('/', requireAuth, requireRole('ADMIN'), validate(crearIdiomaSchema), idiomasController.crear);
router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(actualizarIdiomaSchema),
  idiomasController.actualizar
);
router.delete('/:id', requireAuth, requireRole('ADMIN'), validate(idParamSchema), idiomasController.eliminar);

module.exports = router;
