const { Router } = require('express');
const usuariosController = require('../controllers/usuarios.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const {
  idParamSchema,
  actualizarPerfilSchema,
  listarUsuariosSchema,
  actualizarUsuarioAdminSchema,
} = require('../validations/usuarios.validation');

const router = Router();

router.get('/me', requireAuth, usuariosController.obtenerPropio);
router.put('/me', requireAuth, validate(actualizarPerfilSchema), usuariosController.actualizarPropio);

router.get('/', requireAuth, requireRole('ADMIN'), validate(listarUsuariosSchema), usuariosController.listar);
router.get('/:id', requireAuth, requireRole('ADMIN'), validate(idParamSchema), usuariosController.obtenerPorId);
router.put(
  '/:id',
  requireAuth,
  requireRole('ADMIN'),
  validate(actualizarUsuarioAdminSchema),
  usuariosController.actualizarPorAdmin
);
router.delete('/:id', requireAuth, requireRole('ADMIN'), validate(idParamSchema), usuariosController.eliminar);

module.exports = router;
