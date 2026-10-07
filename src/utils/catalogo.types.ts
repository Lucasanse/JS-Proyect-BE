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
  categoria: CategoriaResumen;
}

export interface AtributoComponente {
  nombre: string;
  valor: string;
  unidad: string | null;
}

export type ProductoDetalle = ProductoComun &
  (
    | {
        esComponentePC: true;
        tipoComponente: string;
        wattsRequeridos: number;
        atributos: AtributoComponente[];
      }
    | {
        esComponentePC: false;
        tipoComponente: null;
        wattsRequeridos: null;
        atributos: [];
      }
  );

export type ProductoResumen = ProductoComun &
  (
    | { esComponentePC: true; tipoComponente: string }
    | { esComponentePC: false; tipoComponente: null }
  );

// /api/admin/productos: incluye los inactivos y la traduccion al ingles para editarla
export interface ProductoAdmin {
  id: number;
  nombre: string;
  descripcion: string;
  marca: { id: number; nombre: string };
  precio: number;
  stock: number;
  imagenUrl: string | null;
  activo: boolean;
  categoria: CategoriaResumen;
  traduccionEn: { nombre: string; descripcion: string } | null;
  // null = no es un componente de PC
  componente: {
    idTipoComponente: number;
    tipo: string;
    wattsRequeridos: number;
    atributos: { idAtributo: number; valor: string }[];
  } | null;
}

// GET /api/admin/marcas. categorias = ids de las categorias donde la marca tiene productos
export interface MarcaAdmin {
  id: number;
  nombre: string;
  categorias: number[];
}

// GET /api/admin/tipos-componente
export interface TipoComponenteAdmin {
  id: number;
  nombre: string;
  // Categorias donde ya hay componentes de este tipo (para sugerir el tipo al elegir la categoria)
  categorias: number[];
  atributos: {
    id: number;
    nombre: string;
    unidad: string | null;
    numerico: boolean;
    opciones: string[]; // las del seed + los valores que ya se cargaron
  }[];
}

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
