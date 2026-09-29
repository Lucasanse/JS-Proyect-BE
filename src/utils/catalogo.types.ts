

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

// Campos comunes a listado y detalle.
interface ProductoComun {
  id: number;
  nombre: string;
  descripcion: string;
  marca: string;
  precio: number;
  stock: number;
  disponible: boolean;
  categoria: CategoriaResumen;
}

export type ProductoResumen = ProductoComun &
  ({ esComponentePC: true; tipoComponente: string } | { esComponentePC: false; tipoComponente: null });

export interface AtributoSpec {
  nombre: string;
  valor: string;
  unidad: string | null;
}

export interface ComponentePCSpecs {
  tipo: string;
  wattsRequeridos: number;
  atributos: AtributoSpec[];
}

// Union discriminada por "esComponentePC": si es true, TypeScript garantiza que
// componentePC tiene las specs; si es false, es null.
export type ProductoDetalle = ProductoComun &
  ({ esComponentePC: true; componentePC: ComponentePCSpecs } | { esComponentePC: false; componentePC: null });

export interface CategoriaFiltro extends CategoriaResumen {
  cantidadProductos: number;
}

export interface MarcaFiltro {
  nombre: string;
  cantidadProductos: number;
}
