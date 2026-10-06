

export interface Paginacion {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Paginado<T> {
  data: T[];
  paginacion: Paginacion;
}

export interface CategoriaResumen {
  id: number;
  nombre: string;
}

interface ProductoComun {
  id: number;
  nombre: string;
  descripcion: string;
  marca: string;
  precio: number;
  stock: number;
  imagenUrl: string | null;
  disponible: boolean;
  categoria: CategoriaResumen;
}

export type ProductoResumen = ProductoComun &
  ({ esComponentePC: true; tipoComponente: string } | { esComponentePC: false; tipoComponente: null });

// GET /api/carrito
export interface ItemCarritoDetalle {
  producto: ProductoResumen;
  cantidad: number;
  subtotal: number;
}

export interface CarritoDetalle {
  items: ItemCarritoDetalle[];
  cantidadTotal: number;
  total: number;
}
