const { Router } = require('express');

const authRoutes = require('./auth.routes');
const usuariosRoutes = require('./usuarios.routes');
const categoriasRoutes = require('./categorias.routes');
const productosRoutes = require('./productos.routes');
const idiomasRoutes = require('./idiomas.routes');
const carritoRoutes = require('./carrito.routes');
const ventasRoutes = require('./ventas.routes');
const solicitudesRoutes = require('./solicitudes.routes');
const presetsRoutes = require('./presets.routes');
const favoritosRoutes = require('./favoritos.routes');
const notificacionesRoutes = require('./notificaciones.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/categorias', categoriasRoutes);
router.use('/productos', productosRoutes);
router.use('/idiomas', idiomasRoutes);
router.use('/carrito', carritoRoutes);
router.use('/ventas', ventasRoutes);
router.use('/solicitudes', solicitudesRoutes);
router.use('/presets', presetsRoutes);
router.use('/favoritos', favoritosRoutes);
router.use('/notificaciones', notificacionesRoutes);

module.exports = router;
