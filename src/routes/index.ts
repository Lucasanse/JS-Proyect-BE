import { Router } from "express";
import * as productos from "../controllers/productos.controller";
import * as productoDetalle from "../controllers/productoDetalle.controller";
import * as categorias from "../controllers/categorias.controller";
import * as carrito from "../controllers/carrito.controller";
import { requireAuth } from "../middlewares/auth";

export const apiRouter = Router();

// Catalogo
apiRouter.get("/productos", productos.listarProductos);
apiRouter.get("/productoDetalle/:id", productoDetalle.obtenerProductoPorId);
apiRouter.get("/categorias", categorias.listarCategorias);
apiRouter.get("/marcas", productos.listarMarcas);

import {
  obtenerIdiomaUsuario,
  actualizarIdiomaUsuario,
} from "../controllers/idioma.controller";

const router = Router();

// Todas las rutas de este router requieren sesión iniciada
router.use(requireAuth);

// GET /api/usuario/idioma
router.get("/idioma", obtenerIdiomaUsuario);

// PATCH /api/usuario/idioma
router.patch("/idioma", actualizarIdiomaUsuario);

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
