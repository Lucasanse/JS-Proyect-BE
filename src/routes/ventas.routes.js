const { Router } = require('express');
const ventasController = require('../controllers/ventas.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');
const { idParamSchema, listarVentasSchema, actualizarEstadoSchema } = require('../validations/ventas.validation');

const router = Router();

router.use(requireAuth);

router.post('/', ventasController.crear);
router.get('/mias', validate(listarVentasSchema), ventasController.listarPropias);
router.get('/', requireRole('ADMIN'), validate(listarVentasSchema), ventasController.listar);
router.get('/:id', validate(idParamSchema), ventasController.obtenerPorId);
router.put(
  '/:id/estado',
  requireRole('ADMIN'),
  validate(actualizarEstadoSchema),
  ventasController.actualizarEstado
);

module.exports = router;
