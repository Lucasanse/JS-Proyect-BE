import { Router } from "express";
import * as productos from "../controllers/productos.controller";
import * as categorias from "../controllers/categorias.controller";
import * as producto from "../controllers/productoDetalle.controller";
export const apiRouter = Router();

// Catalogo
apiRouter.get("/productos", productos.listarProductos);
apiRouter.get("/productoDetalle/:id", producto.obtenerProductoPorId);
apiRouter.get("/categorias", categorias.listarCategorias);
apiRouter.get("/marcas", productos.listarMarcas);
