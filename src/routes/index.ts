import { Router } from "express";
import * as productos from "../controllers/productos.controller";
import * as productoDetalle from "../controllers/productoDetalle.controller";
import * as categorias from "../controllers/categorias.controller";
import * as carrito from "../controllers/carrito.controller";
import * as idioma from "../controllers/idioma.controller";
import * as adminProductos from "../controllers/adminProductos.controller";
import * as adminCatalogo from "../controllers/adminCatalogo.controller";
import * as analisisIA from "../controllers/analisisIA.controller";
import { requireAdmin, requireAuth } from "../middlewares/auth";
import { subirFotosIA, subirImagen } from "../middlewares/subirImagen";
import {
  crearOrdenCarrito,
  crearOrdenPorUnidad,
} from "../controllers/checkout.controller";
import { recibidorDeWebHookMP } from "../controllers/webhooks.controller";
import { obtenerHistorialCompras } from "../controllers/comprasEstados.controller";
import {
  marcarComoLeida,
  obtenerNotificaciones,
} from "../controllers/notificaciones.controller";
import {
  cambiarEstadoVentaAdmin,
  listarVentasAdmin,
  obtenerVentaPorIdAdmin,
} from "../controllers/adminPedidos.controller";

export const apiRouter = Router();

// Catalogo
apiRouter.get("/productos", productos.listarProductos);
apiRouter.get("/productoDetalle/:id", productoDetalle.obtenerProductoPorId);
apiRouter.get("/categorias", categorias.listarCategorias);
apiRouter.get("/marcas", productos.listarMarcas);

// Idioma del usuario (requiere sesion iniciada)
apiRouter.get("/usuario/idioma", requireAuth, idioma.obtenerIdiomaUsuario);
apiRouter.patch("/usuario/idioma", requireAuth, idioma.actualizarIdiomaUsuario);

// Carrito (requiere sesion iniciada)
apiRouter.get("/carrito", requireAuth, carrito.obtenerCarrito);
apiRouter.post("/carrito/items", requireAuth, carrito.agregarItem);
apiRouter.patch(
  "/carrito/items/:idProducto",
  requireAuth,
  carrito.modificarCantidad,
);
apiRouter.delete("/carrito/items/:idProducto", requireAuth, carrito.quitarItem);
apiRouter.delete("/carrito", requireAuth, carrito.vaciarCarrito);

// Fotos desde el celular (QR del formulario de productos). Sin sesion: el token hace de permiso.
apiRouter.get("/captura/:token", analisisIA.infoCaptura);
apiRouter.post(
  "/captura/:token/fotos",
  subirFotosIA,
  analisisIA.subirFotosCaptura,
);

//Compra
//Agregar el auth cuando se termine con las pruebas.
apiRouter.post("/checkout/carrito", requireAuth, crearOrdenCarrito);
apiRouter.post("/checkout/unidad", requireAuth, crearOrdenPorUnidad);
apiRouter.get("/compras/:idUsuario", obtenerHistorialCompras);

apiRouter.post("/webhooks/mercadopago", recibidorDeWebHookMP);

//Notificaciones
apiRouter.patch(
  "/notificaciones/:idNotificacion/leida",
  requireAuth,
  marcarComoLeida,
);
apiRouter.get("/notificaciones/:idUsuario", requireAuth, obtenerNotificaciones);

// Administracion (solo rol ADMIN: sin sesion -> 401, otro rol -> 403)
const adminRouter = Router();
// adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/productos", adminProductos.listarProductosAdmin);
adminRouter.post("/productos", adminProductos.crearProducto);
adminRouter.post(
  "/productos/imagen",
  subirImagen,
  adminProductos.subirImagenProducto,
);
adminRouter.post(
  "/productos/analizar",
  subirFotosIA,
  analisisIA.analizarFotosProducto,
);
adminRouter.get("/productos/:id", adminProductos.obtenerProductoAdmin);
adminRouter.put("/productos/:id", adminProductos.actualizarProducto);
adminRouter.patch("/productos/:id", adminProductos.actualizarProducto);
adminRouter.delete("/productos/:id", adminProductos.eliminarProducto);
adminRouter.patch(
  "/productos/:id/estado",
  adminProductos.cambiarEstadoProducto,
);

//Estado compras
adminRouter.get("/ventas", listarVentasAdmin);
adminRouter.get("/ventas/:id", obtenerVentaPorIdAdmin);
adminRouter.patch("/ventas/:id/estado", cambiarEstadoVentaAdmin);

// Datos para el formulario de productos
adminRouter.get("/marcas", adminCatalogo.listarMarcasAdmin);
adminRouter.post("/marcas", adminCatalogo.crearMarca);
adminRouter.get("/tipos-componente", adminCatalogo.listarTiposComponente);

// Captura de fotos desde el celular (QR) para analizarlas con IA
adminRouter.post("/captura", analisisIA.crearCapturaFotos);
adminRouter.get("/captura/:token", analisisIA.estadoCaptura);
adminRouter.get("/captura/:token/fotos/:indice", analisisIA.fotoCaptura);
adminRouter.delete("/captura/:token", analisisIA.cancelarCaptura);

apiRouter.use("/admin", adminRouter);
