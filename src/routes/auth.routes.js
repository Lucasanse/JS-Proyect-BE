const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { validate } = require('../middlewares/validate.middleware');
const {
  registroSchema,
  loginSchema,
  olvidePasswordSchema,
  resetearPasswordSchema,
} = require('../validations/auth.validation');

const router = Router();

router.post('/registro', validate(registroSchema), authController.registro);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/olvide-password', validate(olvidePasswordSchema), authController.olvidePassword);
router.post('/resetear-password', validate(resetearPasswordSchema), authController.resetearPassword);

module.exports = router;
