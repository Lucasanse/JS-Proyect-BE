import { Router } from 'express';
import * as productos from '../controllers/productos.controller';

export const apiRouter = Router();

// Catalogo
apiRouter.get('/productos', productos.listarProductos);
