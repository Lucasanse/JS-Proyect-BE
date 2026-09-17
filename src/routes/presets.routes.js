const { Router } = require('express');
const presetsController = require('../controllers/presets.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const {
  idParamSchema,
  idComponenteParamSchema,
  crearPresetSchema,
  agregarComponenteSchema,
} = require('../validations/presets.validation');

const router = Router();

router.use(requireAuth);

router.post('/', validate(crearPresetSchema), presetsController.crear);
router.get('/mios', presetsController.listarPropios);
router.get('/:id', validate(idParamSchema), presetsController.obtenerPorId);
router.delete('/:id', validate(idParamSchema), presetsController.eliminar);
router.post('/:id/componentes', validate(agregarComponenteSchema), presetsController.agregarComponente);
router.delete(
  '/:id/componentes/:idComponente',
  validate(idComponenteParamSchema),
  presetsController.eliminarComponente
);

module.exports = router;
