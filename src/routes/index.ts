import { Router } from "express";
import * as productos from "../controllers/productos.controller";
import * as productoDetalle from "../controllers/productoDetalle.controller";
import * as categorias from "../controllers/categorias.controller";
import * as carrito from "../controllers/carrito.controller";
import * as idioma from "../controllers/idioma.controller";
import * as adminProductos from "../controllers/adminProductos.controller";
import * as adminCatalogo from "../controllers/adminCatalogo.controller";
import { requireAdmin, requireAuth } from "../middlewares/auth";
import { subirImagen } from "../middlewares/subirImagen";

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
apiRouter.patch("/carrito/items/:idProducto", requireAuth, carrito.modificarCantidad);
apiRouter.delete("/carrito/items/:idProducto", requireAuth, carrito.quitarItem);
apiRouter.delete("/carrito", requireAuth, carrito.vaciarCarrito);

// Administracion (solo rol ADMIN: sin sesion -> 401, otro rol -> 403)
const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/productos", adminProductos.listarProductosAdmin);
adminRouter.post("/productos", adminProductos.crearProducto);
adminRouter.post("/productos/imagen", subirImagen, adminProductos.subirImagenProducto);
adminRouter.get("/productos/:id", adminProductos.obtenerProductoAdmin);
adminRouter.put("/productos/:id", adminProductos.actualizarProducto);
adminRouter.patch("/productos/:id", adminProductos.actualizarProducto);
adminRouter.delete("/productos/:id", adminProductos.eliminarProducto);
adminRouter.patch("/productos/:id/estado", adminProductos.cambiarEstadoProducto);

// Datos para el formulario de productos
adminRouter.get("/marcas", adminCatalogo.listarMarcasAdmin);
adminRouter.post("/marcas", adminCatalogo.crearMarca);
adminRouter.get("/tipos-componente", adminCatalogo.listarTiposComponente);

apiRouter.use("/admin", adminRouter);
