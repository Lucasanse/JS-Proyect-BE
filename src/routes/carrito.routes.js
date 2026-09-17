const { Router } = require('express');
const carritoController = require('../controllers/carrito.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const { idItemParamSchema, agregarItemSchema, actualizarItemSchema } = require('../validations/carrito.validation');

const router = Router();

router.use(requireAuth);

router.get('/', carritoController.obtener);
router.delete('/', carritoController.vaciar);
router.post('/items', validate(agregarItemSchema), carritoController.agregarItem);
router.put('/items/:idItem', validate(actualizarItemSchema), carritoController.actualizarItem);
router.delete('/items/:idItem', validate(idItemParamSchema), carritoController.eliminarItem);

module.exports = router;
