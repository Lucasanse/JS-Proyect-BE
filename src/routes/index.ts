import { Router } from "express";
import * as productos from "../controllers/productos.controller";
import * as productoDetalle from "../controllers/productoDetalle.controller";
import * as categorias from "../controllers/categorias.controller";
import * as carrito from "../controllers/carrito.controller";
import * as idioma from "../controllers/idioma.controller";
import { requireAuth } from "../middlewares/auth";

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
