const { Router } = require('express');
const notificacionesController = require('../controllers/notificaciones.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const { idParamSchema, listarNotificacionesSchema } = require('../validations/notificaciones.validation');

const router = Router();

router.use(requireAuth);

router.get('/', validate(listarNotificacionesSchema), notificacionesController.listarPropias);
router.put('/leidas', notificacionesController.marcarTodasComoLeidas);
router.put('/:id/leida', validate(idParamSchema), notificacionesController.marcarComoLeida);

module.exports = router;
