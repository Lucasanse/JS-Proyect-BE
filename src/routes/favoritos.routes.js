const { Router } = require('express');
const favoritosController = require('../controllers/favoritos.controller');
const { validate } = require('../middlewares/validate.middleware');
const { requireAuth } = require('../middlewares/auth.middleware');
const { idProductoParamSchema, agregarFavoritoSchema } = require('../validations/favoritos.validation');

const router = Router();

router.use(requireAuth);

router.get('/', favoritosController.listar);
router.post('/', validate(agregarFavoritoSchema), favoritosController.agregar);
router.delete('/:idProducto', validate(idProductoParamSchema), favoritosController.eliminar);

module.exports = router;
