import { Router } from 'express';
import * as productos from '../controllers/productos.controller';
import * as filtros from '../controllers/filtros.controller';

export const apiRouter = Router();

// Catalogo
apiRouter.get('/productos', productos.listarProductos);
apiRouter.get('/productos/:id', productos.obtenerProducto);

// Datos para poblar los filtros del catalogo
apiRouter.get('/categorias', filtros.listarCategorias);
apiRouter.get('/marcas', filtros.listarMarcas);
