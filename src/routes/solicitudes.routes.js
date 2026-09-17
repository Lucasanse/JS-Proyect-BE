const { Router } = require('express');
const solicitudesController = require('../controllers/solicitudes.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const {
  idParamSchema,
  crearSolicitudSchema,
  listarSolicitudesSchema,
  actualizarEstadoSchema,
} = require('../validations/solicitudes.validation');

const router = Router();

router.use(requireAuth);

router.post('/', validate(crearSolicitudSchema), solicitudesController.crear);
router.get('/mias', validate(listarSolicitudesSchema), solicitudesController.listarPropias);
router.get('/', requireRole('ADMIN'), validate(listarSolicitudesSchema), solicitudesController.listar);
router.get('/:id', validate(idParamSchema), solicitudesController.obtenerPorId);
router.put(
  '/:id/estado',
  requireRole('ADMIN'),
  validate(actualizarEstadoSchema),
  solicitudesController.actualizarEstado
);

module.exports = router;
